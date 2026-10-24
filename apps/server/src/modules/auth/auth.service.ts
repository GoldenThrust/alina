import { db } from "../../prisma/db.ts";
import { hash, verify } from "argon2";
import APIError from "../../errors/APIError.ts";
import { sendEmailJob } from "../../queues/email/email.producer.ts";
import { redisService } from "../../services/redis.service.ts";
import crypto, { sign } from "crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../../config/index.ts";
import path from "path";
import { generateTokens, verifyRefreshToken } from "./auth.token.ts";
import { Temporal } from "@js-temporal/polyfill";
import { encodeToken } from "../../common/utils/crypto.ts";
import type { Models } from "../../prisma/contract";

// Templates live next to this file. (Use __dirname instead if the project is CommonJS.)
const EMAIL_TEMPLATE_PATH = path.join(import.meta.dirname, "emails");
const EMAIL_RESET_SEPARATOR = "|";

// Verification + password reset tokens. Keep the TTL and the text shown in emails in sync.
const TOKEN_TTL_SECONDS = 60 * 30;
const TOKEN_TTL_MINUTES = TOKEN_TTL_SECONDS / 60;

// Email change flow.
const EMAIL_RESET_TTL_SECONDS = 60 * 15;
const EMAIL_RESET_TTL_MINUTES = EMAIL_RESET_TTL_SECONDS / 60;
const EMAIL_REVERT_TTL_SECONDS = 60 * 60 * 24 * 7;
const EMAIL_REVERT_TTL_DAYS = EMAIL_REVERT_TTL_SECONDS / (60 * 60 * 24);

// Only these fields can be changed through updateProfile.
const UPDATABLE_PROFILE_FIELDS = [
  "fullName",
  "phoneNumber",
  "avatar",
  "gender",
  "dateOfBirth",
] as const;

/** Never send the password hash to the client. */
function toPublicUser<T extends { password?: string | null }>(user: T) {
  const { password: _password, ...rest } = user;
  return rest;
}

async function sendPasswordResetEmail(user: {
  id: string;
  email: string;
  name?: string | null;
}) {
  const token = crypto.randomUUID();

  await redisService.setAccountPasswordResetToken(
    encodeToken(token),
    user.id,
    TOKEN_TTL_SECONDS,
  );

  await sendEmailJob({
    to: user.email,
    subject: "Alina Account Password Reset",
    template: path.join(EMAIL_TEMPLATE_PATH, "account-password-reset.mjml"),
    payload: {
      name: user.name,
      reset_link: `${config.env.CLIENT_URL}/password-reset/${token}`,
      expiry_minutes: TOKEN_TTL_MINUTES,
    },
  });
}

export async function handleOAuthLogin(
  req: FastifyRequest,
  res: FastifyReply,
  profile: OAuthProfile,
) {
  if (!profile.email) {
    throw new APIError("OAuth provider did not return an email address", 400);
  }

  let user = await db.orm.public.User.where({ email: profile.email }).first();

  if (!user) {
    user = await db.orm.public.User.create({
      email: profile.email,
      fullName: profile.name,
      // The provider has already verified this email; without this, login() rejects OAuth users.
      emailVerifiedAt: Temporal.Now.instant(),
    });
  }

  // Link (or re-link) the provider account to this user.
  const account = await db.orm.public.OAuthAccount.where({
    provider: profile.provider,
    providerId: profile.providerId,
  }).first();

  if (!account) {
    await db.orm.public.OAuthAccount.create({
      userId: user.id,
      provider: profile.provider,
      providerId: profile.providerId,
    });
  } else if (account.userId !== user.id) {
    await db.orm.public.OAuthAccount.where({ id: account.id }).update({
      userId: user.id,
    });
  }

  const tokens = await generateTokens(req, res, user);

  return { message: "Login successfully", ...tokens };
}

export default async function register(payload: {
  name: string;
  email: string;
  password: string;
}) {
  const existingUser = await db.orm.public.User.where({
    email: payload.email,
  }).first();

  // TODO: set token in cookie header

  if (existingUser?.emailVerifiedAt) {
    throw new APIError("User already exists. Please login.", 401);
  }

  const token = crypto.randomUUID();
  const tokenHash = encodeToken(token);

  const hashPassword = await hash(payload.password);

  // Creates the user, or overwrites name/password on an unverified signup.
  const user = await db.orm.public.User.upsert({
    create: {
      fullName: payload.name,
      email: payload.email,
      password: hashPassword,
    },
    update: {
      fullName: payload.name,
      password: hashPassword,
    },
    conflictOn: { email: payload.email },
  });

  await db.orm.public.Preference.create({
    userId: user.id,
    avoidedIngredients: [],
    favoriteBrands: [],
    favoriteIngredients: [],
  });

  await redisService.setAccountVerificationToken(
    tokenHash,
    user.id,
    TOKEN_TTL_SECONDS,
  );

  await sendEmailJob({
    to: payload.email,
    subject: "Alina Account Verification",
    template: path.join(EMAIL_TEMPLATE_PATH, "account-verification.mjml"),
    payload: {
      name: payload.name,
      firstName:
        payload.name?.split(" ")[0] ??
        payload.email.split("@")[0] ??
        "Alina member",
      verifyIllustrationUrl: `${config.env.CLIENT_URL}/images/verify-illustration.png`,
      verifyUrl: `${config.env.CLIENT_URL}/account-verification/${token}`,
      expiryMinutes: TOKEN_TTL_MINUTES,
      bulbIconUrl: `${config.env.CLIENT_URL}/images/bulb-icon.png`,
      checkIconUrl: `${config.env.CLIENT_URL}/images/check-icon.png`,
      signatureUrl: `${config.env.CLIENT_URL}/images/signature.png`,
    },
  });

  return { message: "User created. Verification email sent" };
}

export async function login(
  req: FastifyRequest,
  res: FastifyReply,
  payload: { email: string; password: string },
) {
  const user = await db.orm.public.User.where({
    email: payload.email,
  }).first();

  if (!user || !user.emailVerifiedAt) {
    throw new APIError("Invalid email or password", 401);
  }

  // Account created through OAuth: no password yet, so send a reset link to set one.
  if (!user.password) {
    await sendPasswordResetEmail(user);

    return {
      message:
        "Verification email re-sent. Please check your inbox to verify account and reset password",
    };
  }

  const isMatch = await verify(user.password, payload.password);

  if (!isMatch) {
    throw new APIError("Invalid email or password", 401);
  }

  const tokens = await generateTokens(req, res, user);

  return { message: "Login successful", user: toPublicUser(user), ...tokens };
}

export async function verifyAccountToken(
  req: FastifyRequest,
  res: FastifyReply,
  token: string,
) {
  const tokenHash = encodeToken(token);

  const userId = await redisService.getAccountVerificationToken(tokenHash);

  if (!userId) {
    throw new APIError("Invalid or expired verification link", 401);
  }

  const user = await db.orm.public.User.where({ id: userId }).update({
    emailVerifiedAt: Temporal.Now.instant(),
  });

  if (!user) {
    throw new APIError("User not found", 404);
  }

  const tokens = await generateTokens(req, res, user);

  // Send Welcome Email
  await sendEmailJob({
    to: user.email,
    subject: "Welcome to Alina",
    template: path.join(EMAIL_TEMPLATE_PATH, "welcome.mjml"),
    payload: {
      firstName:
        user.fullName?.split(" ")[0] ??
        user.email.split("@")[0] ??
        "Alina member",
      heroImageUrl: `${config.env.CLIENT_URL}/images/main.png`,
      scanIconUrl: `${config.env.CLIENT_URL}/images/camera-icon.png`,
      trackIconUrl: `${config.env.CLIENT_URL}/images/chart-icon.png`,
      adviceIconUrl: `${config.env.CLIENT_URL}/images/messages-icon.png`,
      productsIconUrl: `${config.env.CLIENT_URL}/images/products-icon.png`,
      shieldIconUrl: `${config.env.CLIENT_URL}/images/shield-icon.png`,
    },
  });

  return {
    message: "Account verified successfully",
    user: {
      name: user.fullName ?? user.email.split("@")[0] ?? "Alina member",
      email: user.email,
    },
    ...tokens,
  };
}

export async function requestResetPassword(email: string) {
  const user = await db.orm.public.User.where({ email }).first();

  if (!user || !user.emailVerifiedAt) {
    throw new APIError("User does not exist. Please register", 401);
  }

  await sendPasswordResetEmail(user);

  return {
    message: "Password reset email sent. Please check your inbox.",
  };
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = encodeToken(token);

  const userId = await redisService.getAccountPasswordResetToken(tokenHash);

  if (!userId) {
    throw new APIError("Invalid or expired verification link", 401);
  }

  const hashPassword = await hash(password);

  const user = await db.orm.public.User.where({ id: userId }).update({
    password: hashPassword,
  });

  if (!user) {
    throw new APIError("User not found", 404);
  }

  await sendEmailJob({
    to: user.email,
    subject: "Password Reset Successfully",
    template: path.join(
      EMAIL_TEMPLATE_PATH,
      "successfully-reset-password.mjml",
    ),
    payload: {
      name: user.fullName,
    },
  });

  return {
    message: "Password reset successfully",
  };
}

export async function getNewToken(
  req: FastifyRequest,
  res: FastifyReply,
  token: string,
) {
  const { payload, session } = await verifyRefreshToken(req, token);

  const user = await db.orm.public.User.where({ id: payload.sub }).first();

  if (!user) {
    throw new APIError("User not found", 404);
  }

  const tokens = await generateTokens(req, res, user, session.id);

  return {
    message: "New access token generated successfully",
    ...tokens,
    payload,
    session,
  };
}

export async function revokeSession(
  req: FastifyRequest,
  res: FastifyReply,
  token: string,
) {
  const { session } = await verifyRefreshToken(req, token);

  await db.orm.public.Session.where({ id: session.id }).update({
    revokedAt: Temporal.Now.instant(),
  });

  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/auth/refresh",
  });

  return {
    message: "Logged out successfully",
  };
}

export async function updateProfile(jwt: JwtPayload, payload: any) {
  // Whitelist fields so a client can't set password, email or emailVerifiedAt here.
  const data = Object.fromEntries(
    UPDATABLE_PROFILE_FIELDS.filter((key) => payload[key] !== undefined).map(
      (key) => {
        if (key === "dateOfBirth") {
          return [
            key,
            Temporal.Instant.from(new Date(payload[key]).toISOString()),
          ];
        }
        return [key, payload[key]];
      },
    ),
  );

  console.log("updateProfile data", data, payload);

  const user = await db.orm.public.User.where({ id: jwt.sub }).update(data);

  if (!user) {
    throw new APIError("Profile update failed", 404);
  }

  return { message: "Profile updated successfully", user: toPublicUser(user) };
}

export async function requestResetEmail(
  jwt: JwtPayload,
  email: string,
  password: string,
) {
  const user = await db.orm.public.User.where({ id: jwt.sub }).first();

  if (!user) {
    throw new APIError("User not found", 404);
  }

  // OAuth-only accounts have no password to confirm with.
  if (!user.password) {
    throw new APIError("Set a password before changing your email", 400);
  }

  const isMatch = await verify(user.password, password);

  if (!isMatch) {
    throw new APIError("Invalid password", 401);
  }

  const existingUser = await db.orm.public.User.where({ email }).first();

  if (existingUser && existingUser.emailVerifiedAt) {
    throw new APIError("Email already in use", 400);
  }
  sendEmailJob;
  const token = crypto.randomUUID();
  const revertToken = crypto.randomUUID();

  // Confirm token -> change to the NEW email.
  await redisService.setAccountEmail(
    encodeToken(token),
    `${user.id}${EMAIL_RESET_SEPARATOR}${email}`,
    EMAIL_RESET_TTL_SECONDS,
  );

  // Revert token -> restore the OLD email.
  await redisService.setAccountEmail(
    encodeToken(revertToken),
    `${user.id}${EMAIL_RESET_SEPARATOR}${user.email}`,
    EMAIL_REVERT_TTL_SECONDS,
  );

  await sendEmailJob({
    to: email,
    subject: "Alina Account Email Reset",
    template: path.join(EMAIL_TEMPLATE_PATH, "email-reset-request.mjml"),
    payload: {
      name: user.fullName,
      reset_link: `${config.env.CLIENT_URL}/email-reset/${token}`,
      expiry_minutes: EMAIL_RESET_TTL_MINUTES,
    },
  });

  await sendEmailJob({
    to: user.email,
    subject: "Alina Account Email Reset Warning",
    template: path.join(EMAIL_TEMPLATE_PATH, "email-reset-warning.mjml"),
    payload: {
      name: user.fullName,
      revert_link: `${config.env.CLIENT_URL}/email-reset/${revertToken}/revert`,
      expiry_days: EMAIL_REVERT_TTL_DAYS,
    },
  });

  return {
    message: "Email reset email sent. Please check your inbox.",
  };
}

export async function resetEmail(token: string) {
  const tokenHash = encodeToken(token);

  const idEmail = await redisService.getAccountEmail(tokenHash);

  const [id, email] = idEmail?.split(EMAIL_RESET_SEPARATOR) ?? [];

  if (!id || !email) {
    throw new APIError("Invalid or expired email reset link", 401);
  }

  const user = await db.orm.public.User.where({ id }).first();

  if (!user) {
    throw new APIError("User not found", 404);
  }

  const existingUser = await db.orm.public.User.where({ email }).first();

  if (existingUser) {
    if (existingUser.emailVerifiedAt) {
      throw new APIError("Email already in use", 400);
    } else {
      // Free the email held by an unverified signup.
      await db.orm.public.User.where({ id: existingUser.id }).delete();
    }
  }

  await db.orm.public.User.where({ id }).update({ email });

  await sendEmailJob({
    to: email,
    subject: "Alina Account Email Reset Successfully",
    template: path.join(EMAIL_TEMPLATE_PATH, "email-reset.mjml"),
    payload: {
      name: user.fullName,
    },
  });

  // `user.email` still holds the previous address here.
  await sendEmailJob({
    to: user.email,
    subject: "Alina Account Email Reset Successfully",
    template: path.join(EMAIL_TEMPLATE_PATH, "email-reset.mjml"),
    payload: {
      name: user.fullName,
    },
  });

  return {
    message: "Email reset successfully",
  };
}

export async function revertResetEmail(token: string, password: string) {
  const tokenHash = encodeToken(token);

  const idEmail = await redisService.getAccountEmail(tokenHash);

  const [id, email] = idEmail?.split(EMAIL_RESET_SEPARATOR) ?? [];

  if (!id || !email) {
    throw new APIError("Invalid or expired email reset link", 401);
  }

  const user = await db.orm.public.User.where({ id }).first();

  if (!user) {
    throw new APIError("User not found", 404);
  }

  const existingUser = await db.orm.public.User.where({ email }).first();

  if (existingUser && existingUser.id !== id) {
    if (existingUser.emailVerifiedAt) {
      throw new APIError("Email already in use", 400);
    } else {
      await db.orm.public.User.where({ id: existingUser.id }).delete();
    }
  }

  const hashPassword = await hash(password);

  await db.orm.public.User.where({ id }).update({
    email,
    password: hashPassword,
  });

  await sendEmailJob({
    to: email,
    subject: "Alina Account Email Reset Reverted",
    template: path.join(EMAIL_TEMPLATE_PATH, "email-revert.html"),
    payload: {
      name: user.fullName,
    },
  });

  return {
    message: "Email reverted successfully",
  };
}

export async function getUser(id: string) {
  const user = await db.orm.public.User.include("preferences")
    .where({ id })
    .first();

  if (!user) {
    throw new APIError("User not found", 404);
  }

  return {
    message: "User retrieved successfully",
    user: toPublicUser(user),
  };
}

export async function deleteAvatar(id: string) {
  await db.orm.public.User.where({ id }).update({
    avatar: null,
  });
}
