import { z } from "zod";
import { BaseTool } from "../base.tool";
import type { ToolContext } from "../tool";
import {
  FACE_ATTR_FEATURES,
  FACE_RESHAPE_FEATURE_RANGES,
  HD_SKIN_ACTIONS,
  SKIN_SIMULATION_CONCERNS,
  YouCamService,
} from "../../../yomCam.service";
import { ORM } from "../../../../prisma/db";
import Websocket from "../../../websocket.service";

/* -------------------------------------------------------------------------- */
/*  Image resolution                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Image used when the model passes no `imagePath`: the user's most recent scan
 * photo, as an uploads-relative path (what `fileManager.getUploadedFilePath`
 * expects) or a Buffer. Throw an Error with a readable message if there is none.
 */
export type ResolveLatestScanImage = (
  userId: string,
) => Promise<string | Buffer>;

/**
 * Optional ownership check for a model-supplied `imagePath`. Return true only if
 * the path belongs to this user (one of their scans, uploads or generated
 * results).
 */
export type CanAccessImage = (
  userId: string,
  imagePath: string,
) => Promise<boolean>;

export type YouCamToolDeps = {
  resolveLatestImage: ResolveLatestScanImage;
  canAccessImage?: CanAccessImage;
};

const IMAGE_PATH_PREFIX = "uploads/image/";

/** Only saved images under uploads/image/ are allowed, with no traversal. */
function normalizeImagePath(raw: string): string {
  const p = raw.trim().replace(/\\/g, "/").replace(/^\.\//, "");
  const segments = p.split("/");
  if (
    !p.startsWith(IMAGE_PATH_PREFIX) ||
    segments.some((s) => s === "" || s === "." || s === "..")
  ) {
    throw new Error(
      `Invalid imagePath "${raw}". Use an image path from get_scan_history or the one given with the user's message (uploads/image/...).`,
    );
  }
  return p;
}

abstract class YouCamTool<TInput, TResult = unknown> extends BaseTool<
  TInput,
  TResult
> {
  constructor() {
    super();
  }

  /** The given imagePath, or the user's latest scan image when omitted. */
  protected async image(userId: string, imagePath?: string): Promise<string> {
    if (!imagePath) {
      const scan = await ORM.Scan()
        .where({ userId })
        .orderBy((s: any) => s.createdAt.desc())
        .select("image")
        .first();

      if (!scan?.image) {
        throw new Error(
          "No scan image found for this user. Provide an imagePath from get_scan_history or upload a new scan.",
        );
      }
      return scan?.image;
    }

    const normalized = normalizeImagePath(imagePath);
    const scan = await ORM.Scan().where({ image: normalized }).first();
    if (scan && scan?.userId !== userId) {
      throw new Error(
        `Image "${imagePath}" was not found for this user. Use a path from get_scan_history or omit imagePath to use the latest scan.`,
      );
    }

    return normalized;
  }
}

const imagePath = z.string().min(1).optional();

/** Temporary YouCam URLs expire in 2 hours, so the model only sees saved paths. */
const withoutUrl = <T extends { url?: string }>({ url: _url, ...rest }: T) =>
  rest;
const saveImagePath = async (
  userId: string,
  sessionId: string,
  paths: string[],
) => {
  const message = await ORM.Message()
    .where({
      userId,
      sessionId,
      sender: "ALINA",
    })
    .first();

  if (message) {
    await ORM.Message()
      .where({ id: message.id })
      .update({
        images: [...(message.images ?? []), ...paths],
      });
  } else {
    await ORM.Message().create({
      userId,
      sessionId,
      sender: "ALINA",
      content: "Image Attachments",
      images: paths ?? [],
    });
  }

  Websocket.streamImages(userId, sessionId, paths);
};

/* ============================ ANALYSIS ============================ */

const analyzeSkinSchema = z.object({
  imagePath,
  concerns: z.array(z.enum(HD_SKIN_ACTIONS)).min(1).optional(),
});

export class YouCamAnalyzeSkinTool extends YouCamTool<
  z.infer<typeof analyzeSkinSchema>
> {
  readonly name = "youcam_analyze_skin";
  readonly description =
    "Run a skin analysis on a photo. Costs credits, so prefer get_scan_history for existing results. Only call when the user wants a new analysis or when an image is provided.";
  readonly schema = analyzeSkinSchema;

  protected async executeInternal(
    input: z.infer<typeof analyzeSkinSchema>,
    { userId }: ToolContext,
  ) {
    const fileId = await YouCamService.uploadImage(
      await this.image(userId, input.imagePath),
    );
    const { overallScore, skinAge, concerns } = await YouCamService.analyzeSkin(
      fileId,
      { dstActions: input.concerns },
    );
    // `output` (masks, overlays) is dropped: too large and not useful to the model.
    return { overallScore, skinAge, concerns };
  }
}

const analyzeSkinToneSchema = z.object({
  imagePath,
});

export class YouCamAnalyzeSkinToneTool extends YouCamTool<
  z.infer<typeof analyzeSkinToneSchema>
> {
  readonly name = "youcam_analyze_skin_tone";
  readonly description =
    "Detect skin, eye, lip, eyebrow and hair colors from a photo.";
  readonly schema = analyzeSkinToneSchema;

  protected async executeInternal(
    input: z.infer<typeof analyzeSkinToneSchema>,
    { userId }: ToolContext,
  ) {
    const fileId = await YouCamService.uploadImage(
      await this.image(userId, input.imagePath),
    );

    return await YouCamService.analyzeSkinTone(fileId);
  }
}

const analyzeFitzpatrickSchema = z.object({ imagePath });

export class YouCamAnalyzeFitzpatrickTool extends YouCamTool<
  z.infer<typeof analyzeFitzpatrickSchema>
> {
  readonly name = "youcam_analyze_fitzpatrick";
  readonly description =
    "Classify the user's Fitzpatrick skin type (I-VI) and sun reaction.";
  readonly schema = analyzeFitzpatrickSchema;

  protected async executeInternal(
    input: z.infer<typeof analyzeFitzpatrickSchema>,
    { userId }: ToolContext,
  ) {
    // uploadImage accepts PNG; Fitzpatrick does not, so a PNG fails with a
    // YouCamError from the API.
    const fileId = await YouCamService.uploadImage(
      await this.image(userId, input.imagePath),
    );
    return await YouCamService.analyzeFitzpatrick(fileId);
  }
}

const analyzeFaceSchema = z.object({
  imagePath,
  features: z.array(z.enum(FACE_ATTR_FEATURES)).min(1).max(28).optional(),
});

export class YouCamAnalyzeFaceTool extends YouCamTool<
  z.infer<typeof analyzeFaceSchema>
> {
  readonly name = "youcam_analyze_face";
  readonly description =
    "Analyse face attributes and ratios (face shape, eyes, brows, lips, nose, cheekbones, proportions). Cost depends on feature count.";
  readonly schema = analyzeFaceSchema;

  protected async executeInternal(
    input: z.infer<typeof analyzeFaceSchema>,
    { userId }: ToolContext,
  ) {
    const fileId = await YouCamService.uploadImage(
      await this.image(userId, input.imagePath),
    );
    const { raw: _raw, ...result } = await YouCamService.analyzeFace(fileId, {
      features: input.features,
    });
    return result;
  }
}

/* ============================ SIMULATIONS ============================ */

const simulateAgingSchema = z.object({
  imagePath,
});

export class YouCamSimulateAgingTool extends YouCamTool<
  z.infer<typeof simulateAgingSchema>
> {
  readonly name = "youcam_simulate_aging";
  readonly description =
    "Generate photos of the user from youth to old age from one selfie. Costs 2 units. JPEG only.";
  readonly schema = simulateAgingSchema;

  protected async executeInternal(
    input: z.infer<typeof simulateAgingSchema>,
    { userId, sessionId }: ToolContext,
  ) {
    const { fileId: _fileId, ...result } =
      await YouCamService.simulateAgingImage(
        await this.image(userId, input.imagePath),
      );

    const images = result.images.map(withoutUrl);
    const paths = images.map((i) => i.path).filter((p): p is string => !!p);

    saveImagePath(userId, sessionId, paths);

    return { ...result, images };
  }
}

const intensityShape = Object.fromEntries(
  SKIN_SIMULATION_CONCERNS.map((c) => [c, z.number().min(0).max(1).optional()]),
) as Record<
  (typeof SKIN_SIMULATION_CONCERNS)[number],
  z.ZodOptional<z.ZodNumber>
>;

const simulateSkinSchema = z.object({
  imagePath,
  intensities: z
    .object(intensityShape)
    .refine((v) => Object.values(v).some((n) => (n ?? 0) > 0), {
      message: "At least one intensity must be greater than 0.",
    }),
});

export class YouCamSimulateSkinTool extends YouCamTool<
  z.infer<typeof simulateSkinSchema>
> {
  readonly name = "youcam_simulate_skin";
  readonly description =
    "Show how the user's skin could look after improving specific concerns (0.0-1.0 intensity each). Costs 4-6 units.";
  readonly schema = simulateSkinSchema;

  protected async executeInternal(
    input: z.infer<typeof simulateSkinSchema>,
    { userId, sessionId }: ToolContext,
  ) {
    const { fileId: _fileId, ...result } =
      await YouCamService.simulateSkinImage(
        await this.image(userId, input.imagePath),
        { intensities: input.intensities },
      );

    saveImagePath(userId, sessionId, result?.path ? [result.path] : []);

    return withoutUrl(result);
  }
}

const detectFacesSchema = z.object({ imagePath });

const reshapeShape = Object.fromEntries(
  Object.entries(FACE_RESHAPE_FEATURE_RANGES).map(([key, [min, max]]) => [
    key,
    z.number().int().min(min).max(max).optional(),
  ]),
) as Record<string, z.ZodOptional<z.ZodNumber>>;

const reshapeFaceSchema = z.object({
  imagePath,
  features: z
    .object(reshapeShape)
    .refine((v) => Object.values(v).some((n) => n !== undefined && n !== 0), {
      message: "At least one feature must be non-zero.",
    }),
  skinSmoothStrength: z.number().int().min(0).max(100).optional(),
  skinSmoothColorIntensity: z.number().int().min(0).max(100).optional(),
});

export class YouCamReshapeFaceTool extends YouCamTool<
  z.infer<typeof reshapeFaceSchema>
> {
  readonly name = "youcam_reshape_face";
  readonly description =
    "Preview a cosmetic face reshape (face, eyes, nose, lips). Costs 1 unit. Integer values; 0 leaves a feature unchanged.";
  readonly schema = reshapeFaceSchema;

  protected async executeInternal(
    input: z.infer<typeof reshapeFaceSchema>,
    { userId, sessionId }: ToolContext,
  ) {
    const { fileId: _fileId, ...result } = await YouCamService.reshapeFaceImage(
      await this.image(userId, input.imagePath),
      {
        features: input.features,
        skinSmoothStrength: input.skinSmoothStrength,
        skinSmoothColorIntensity: input.skinSmoothColorIntensity,
      },
    );

    saveImagePath(userId, sessionId, result?.path ? [result.path] : []);

    return withoutUrl(result);
  }
}
