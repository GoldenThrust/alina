import type { FastifyRequest } from "fastify";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import { fileTypeStream } from "file-type";
import { env } from "../../config/env.ts";

type File = {
  stream: Readable;
  mime: string;
  ext: string;
};
export default class FileManager {
  private readonly types: Record<string, string[]> = {
    image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  } as const;

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
    return `${crypto.randomUUID()}${ext}`;
  }

  async uploadFile(req: FastifyRequest, type: string): Promise<string> {
    const data = await req.file();

    if (!data) {
      throw new Error("No file uploaded");
    }

    if (!this.types[type]) {
      throw new Error(`Unknown upload type: ${type}`);
    }

    const { stream, ext } = await this.validateFileType(data.file, type);

    const filename = this.safeFilename(ext);
    const filePath = path.join(this.filePath, type, filename);

    await pipeline(stream, fs.createWriteStream(filePath));

    return filePath;
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
