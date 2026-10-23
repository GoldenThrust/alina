import { z } from "zod";

/**
 * --------------------------------------------------------------------------
 * Reusable Field Schemas
 * --------------------------------------------------------------------------
 */

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name is required")
  .max(50, "Name too long")
  .regex(/^[A-Za-z'-]+(\s+[A-Za-z'-]+)+$/, {
    message: "Name must contain at least two words",
  });

export const emailSchema = z
  .email("Invalid email address")
  .toLowerCase()
  .max(100, "Email too long");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(64, "Password too long")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Must contain at least one special character");

export const tokenSchema = z.uuid("Invalid token");

export const imageSchema = z
  .file()
  .max(5 * 1024 * 1024, "Image must not exceed 5MB")
  .mime([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ], "Only JPEG, PNG, WEBP and GIF images are allowed");

export const dateOfBirthSchema = z.coerce.date();

export const phoneNumberSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number");

/**
 * --------------------------------------------------------------------------
 * Request Bodies
 * --------------------------------------------------------------------------
 */

export const PasswordBody = z.object({
  password: passwordSchema,
});

export const EmailBody = z.object({
  email: emailSchema,
});

export const RegisterBody = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const LoginBody = z.object({
  email: emailSchema,
  password: z
  .string(),
});

export const UpdateBody = z.object({
  fullName: nameSchema.optional(),
  phoneNumber: phoneNumberSchema.optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  dateOfBirth: dateOfBirthSchema.optional(),
});

export const RequestResetPasswordBody = z.object({
  email: emailSchema.optional(),
});

/**
 * --------------------------------------------------------------------------
 * Route Params
 * --------------------------------------------------------------------------
 */

export const TokenParam = z.object({
  token: tokenSchema,
});

/**
 * --------------------------------------------------------------------------
 * Fastify Schemas
 * --------------------------------------------------------------------------
 */

export const registerSchema = {
  body: RegisterBody,
};

export const loginSchema = {
  body: LoginBody,
};

export const tokenParamSchema = {
  params: TokenParam,
};

export const resetPasswordSchema = {
  params: TokenParam,
};

export const revertResetEmailSchema = {
  body: PasswordBody,
  params: TokenParam,
};

export const updateSchema = {
  body: UpdateBody,
};

export const requestResetPasswordSchema = {
  body: EmailBody,
};