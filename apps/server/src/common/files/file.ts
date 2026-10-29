import type { FastifyRequest } from "fastify";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { fileTypeStream } from "file-type";
import { Agent, fetch as undiciFetch } from "undici";
import { env } from "../../config/env.ts";
import { mkdir, rm } from "node:fs/promises";

/** Download failure that says whether trying again could help. */
class DownloadError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

function isNetworkError(error: unknown): boolean {
  const e = error as { name?: string; code?: string; cause?: { code?: string } };
  const code = e?.cause?.code ?? e?.code;
  return (
    e?.name === "TimeoutError" ||
    e?.name === "AbortError" ||
    error instanceof TypeError ||
    (typeof code === "string" &&
      /^(UND_ERR|ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|EPIPE)/.test(code))
  );
}

type File = {
  stream: Readable;
  mime: string;
  ext: string;
};
export default class FileManager {
  private readonly types: Record<string, string[]> = {
    image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  } as const;

  /** Hard cap for files downloaded from a remote URL (e.g. AI result images). */
  private readonly maxRemoteFileBytes = 20 * 1024 * 1024;

  /* Remote download timing. Raise these on a slow network. */
  /** Max time for ONE whole download attempt (connect + headers + body). */
  private readonly remoteFetchTimeoutMs = 120_000;
  /** Max time to open the connection (Node's built-in default is only 10 s). */
  private readonly remoteConnectTimeoutMs = 30_000;
  /** Max silence between headers / body chunks before giving up. */
  private readonly remoteIdleTimeoutMs = 60_000;
  /** Attempts per file (timeouts, network errors, 5xx and 429 are retried). */
  private readonly remoteMaxAttempts = 3;

  private readonly remoteAgent = new Agent({
    connect: { timeout: this.remoteConnectTimeoutMs },
    headersTimeout: this.remoteIdleTimeoutMs,
    bodyTimeout: this.remoteIdleTimeoutMs,
  });

  constructor(private filePath: string) {
    this.filePath = filePath;

    Object.keys(this.types).forEach((type) => {
      fs.mkdirSync(path.join(this.filePath, type), { recursive: true });
    });
  }

  private async validateFileType(file: Readable, type: string): Promise<File> {
    const webIn = Readable.toWeb(file) as NodeWebReadableStream<Uint8Array>;
    const webOut = await fileTypeStream(webIn);
    const mime = webOut.fileType?.mime;
    const ext = webOut.fileType?.ext;

    if (!mime || !this.types[type]?.includes(mime)) {
      throw new Error(`Invalid file type for ${type}`);
    }

    return {
      stream: Readable.fromWeb(webOut as NodeWebReadableStream<Uint8Array>),
      mime,
      ext: ext!,
    };
  }

  private safeFilename(ext: string): string {
    return `${crypto.randomUUID()}.${ext}`;
  }

  /**
   * Validates the stream's real type (magic bytes), writes it to
   * `<root>/<type>/<directory>/<uuid>.<ext>` and returns the public-style
   * relative path (`uploads/<type>/<directory>/<uuid>.<ext>`).
   * A partially written file is removed if the write fails.
   */
  private async saveStream(
    source: Readable,
    type: string,
    directory = "",
  ): Promise<string> {
    if (!this.types[type]) {
      throw new Error(`Unknown upload type: ${type}`);
    }
    if (path.isAbsolute(directory) || directory.split(/[\\/]/).includes("..")) {
      throw new Error("Invalid directory");
    }

    const { stream, ext } = await this.validateFileType(source, type);

    const filename = this.safeFilename(ext);
    const folderPath = path.join(this.filePath, type, directory);
    const filePath = path.join(folderPath, filename);

    await mkdir(folderPath, { recursive: true });

    try {
      await pipeline(stream, fs.createWriteStream(filePath));
    } catch (error) {
      await rm(filePath, { force: true }).catch(() => undefined);
      throw error;
    }

    return path.join("uploads", type, directory, filename);
  }

  async uploadFile(
    req: FastifyRequest,
    type: string,
    directory = "",
  ): Promise<string> {
    const data = await req.file();

    if (!data) {
      throw new Error("No file uploaded");
    }

    if (!this.types[type]) {
      throw new Error(`Unknown upload type: ${type}`);
    }

    return this.saveStream(data.file, type, directory);
  }

  /**
   * Downloads a remote file (e.g. a YouCam result URL, which expires after
   * 2 hours) and stores it. Only http(s) URLs are accepted, the content type is
   * verified from the bytes, and the download is capped at 20 MB.
   * Timeouts and transient errors are retried with backoff.
   */
  async saveRemoteFile(
    url: string,
    type: string,
    directory = "",
  ): Promise<string> {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("Only http(s) URLs can be downloaded");
    }

    let lastError: unknown;
    for (let attempt = 1; attempt <= this.remoteMaxAttempts; attempt++) {
      try {
        return await this.downloadOnce(parsed, type, directory);
      } catch (error) {
        lastError = error;
        const retryable =
          error instanceof DownloadError
            ? error.retryable
            : isNetworkError(error);
        if (!retryable || attempt === this.remoteMaxAttempts) break;
        await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
      }
    }

    if (lastError instanceof DownloadError || !isNetworkError(lastError)) {
      throw lastError;
    }
    const code =
      (lastError as { cause?: { code?: string } })?.cause?.code ??
      (lastError as { code?: string })?.code ??
      (lastError as Error)?.name;
    throw new Error(`Download failed after ${this.remoteMaxAttempts} attempts (${code})`);
  }

  private async downloadOnce(
    url: URL,
    type: string,
    directory: string,
  ): Promise<string> {
    const res = await undiciFetch(url, {
      dispatcher: this.remoteAgent,
      signal: AbortSignal.timeout(this.remoteFetchTimeoutMs),
    });

    if (!res.ok || !res.body) {
      await res.body?.cancel().catch(() => undefined);
      // 4xx (e.g. an expired link) will not get better by retrying.
      throw new DownloadError(
        `Failed to download file (${res.status})`,
        res.status >= 500 || res.status === 429,
      );
    }

    const declared = Number(res.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > this.maxRemoteFileBytes) {
      await res.body.cancel().catch(() => undefined);
      throw new DownloadError("Remote file is too large", false);
    }

    const max = this.maxRemoteFileBytes;
    const body = Readable.fromWeb(
      res.body as unknown as NodeWebReadableStream<Uint8Array>,
    );
    async function* limited() {
      let received = 0;
      for await (const chunk of body) {
        received += (chunk as Uint8Array).length;
        if (received > max) throw new DownloadError("Remote file is too large", false);
        yield chunk;
      }
    }

    return this.saveStream(
      Readable.from(limited(), { objectMode: false }),
      type,
      directory,
    );
  }

  /** Stores an in-memory buffer (type is verified from its bytes). */
  async saveBuffer(
    buffer: Buffer,
    type: string,
    directory = "",
  ): Promise<string> {
    return this.saveStream(
      Readable.from(buffer, { objectMode: false }),
      type,
      directory,
    );
  }

  deleteUploadedFile(filePath: string): void {
    filePath = filePath.replace(/^uploads[\\/]/, "");
    fs.unlinkSync(path.join(this.filePath, filePath));
  }

  getUploadedFilePath(filePath: string): string {
    filePath = filePath.replace(/^uploads[\\/]/, "");
    return path.join(this.filePath, filePath);
  }

  async uploadFiles(req: FastifyRequest, type: string): Promise<string[]> {
    if (!this.types[type]) {
      throw new Error(`Unknown upload type: ${type}`);
    }

    const files = req.files();
    const filePaths: string[] = [];

    for await (const data of files) {
      const { stream, ext } = await this.validateFileType(data.file, type);

      const filename = this.safeFilename(ext);
      const filePath = path.join(this.filePath, type, filename);

      await pipeline(stream, fs.createWriteStream(filePath));

      filePaths.push(filePath);
    }

    return filePaths;
  }
}

export const fileManager = new FileManager(env["UPLOAD_DIR"]);