import type z from "zod";
import { EmailBody, LoginBody, PasswordBody, RegisterBody, RequestResetPasswordBody, TokenParam, UpdateBody } from "./auth.schema.ts";

type RegisterBody = z.infer<typeof RegisterBody>
type LoginBody = z.infer<typeof LoginBody>
type TokenParam = z.infer<typeof TokenParam>
type PasswordBody = z.infer<typeof PasswordBody>
type EmailBody = z.infer<typeof EmailBody>
type UpdateBody = z.infer<typeof UpdateBody>
type RequestResetPasswordBody = z.infer<typeof RequestResetPasswordBody>

type ProfileUpdate = UpdateBody & {
  image?: string | undefined;
}