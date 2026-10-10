import { prisma } from "../../../config/prisma.ts";
import { hash, verify } from "argon2";
import APIError from "../../errors/APIError.ts";
import { sendEmailJob } from "../../../queues/email/email.producer.ts";
import { redisService } from "../../../services/redis.service.ts";
import crypto from "crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "../../../config/index.ts";
import path from "path";
import { generateTokens, verifyRefreshToken } from "./auth.token.ts";
import type { UserUpdateInput } from "../../generated/prisma/models.ts";
import { encodeToken } from "../../common/utils/crypto.ts";

const EMAILTEMPLATEPATH = path.join(__dirname, "./modules/auth/emails");
const EMAIL_RESET_SEPARATOR = "|";

export async function handleOAuthLogin(
  req: FastifyRequest,
  res: FastifyReply,
  profile: OAuthProfile,
) {
  let user = null;

  if (profile.email) {
    user = await prisma.user.findUnique({
      where: {
        email: profile.email,
      },
    });
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
      },
    });
  }

  await prisma.oAuthAccount.upsert({
    where: {
      provider_providerId: {
        provider: profile.provider,
        providerId: profile.providerId,
      },
    },
    update: {
      userId: user.id,
    },
    create: {
      userId: user.id,
      provider: profile.provider,
      providerId: profile.providerId,
    },
  });

  const tokens = await generateTokens(req, res, user);

  return { message: "Login successfully", ...tokens };
}

export default async function register(payload: {
  name: string;
  email: string;
  password: string;
}) {
  const existingUser = await prisma.user.findFirst({
    where: {
      email: payload.email,
    },
  });

  // TODO: set token in cookie header

  if (existingUser && existingUser.emailVerifiedAt) {
    throw new APIError("User already exists. Please login.", 401);
  }

  const token = crypto.randomUUID();

  const tokenHash = encodeToken(token);

  if (existingUser && existingUser.emailVerifiedAt) {
    redisService.setAccountPasswordResetToken(
      tokenHash,
      existingUser.id.toString(),
      60 * 30,
    );

    // Send reset password email.
    await sendEmailJob({
      to: payload.email,
      subject: "YummyHouse Account Password Reset",
      template: path.join(EMAILTEMPLATEPATH, "account-password-reset.mjml"),
      payload: {
        name: payload.name,
        reset_link: `${config.env.CLIENT_URL}/password-reset/${token}`,
        expiry_minutes: 15,
      },
    });

    return {
      message:
        "Verification email re-sent. Please check your inbox to verify account and reset password",
    };
  }

  const hashPassword = await hash(payload.password);

  const user = await prisma.user.upsert({
    where: {
      email: payload.email,
    },
    update: {
      name: payload.name,
      password: hashPassword,
    },
    create: {
      name: payload.name,
      email: payload.email,
      password: hashPassword,
    },
  });

  await redisService.setAccountVerificationToken(
    tokenHash,
    user.id.toString(),
    60 * 30,
  );

  await sendEmailJob({
    to: payload.email,
    subject: "YummyHouse Acoount Verification",
    template: path.join(EMAILTEMPLATEPATH, "account-verification.mjml"),
    payload: {
      name: payload.name,
      verification_link: `${config.env.CLIENT_URL}/account-verification/${token}`,
      expiry_minutes: 15,
    },
  });

  return { message: "User created. Verification email sent" };
}

export async function login(
  req: FastifyRequest,
  res: FastifyReply,
  payload: { email: string; password: string },
) {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (!user || !user.emailVerifiedAt) {
    throw new APIError("Invalid email or password", 401);
  }

  if (!user.password) {
    const token = crypto.randomUUID();

    const tokenHash = encodeToken(token);
    redisService.setAccountPasswordResetToken(
      tokenHash,
      user.id.toString(),
      60 * 30,
    );

    // Send reset password email.
    await sendEmailJob({
      to: payload.email,
      subject: "YummyHouse Account Password Reset",
      template: path.join(EMAILTEMPLATEPATH, "account-password-reset.mjml"),
      payload: {
        name: user.name,
        reset_link: `${config.env.CLIENT_URL}/password-reset/${token}`,
        expiry_minutes: 15,
      },
    });

    return {
      message:
        "Verification email re-sent. Please check your inbox to verify account and reset password",
    };
  }

  const isMatch = await verify(user.password!, payload.password);

  if (!isMatch) {
    throw new APIError("Invalid email or password", 401);
  }

  const tokens = await generateTokens(req, res, user);

  return { message: "Login successful", user, ...tokens };
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

  const user = await prisma.user.update({
    where: {
      id: userId,
    },

    data: {
      emailVerifiedAt: new Date(),
    },
  });

  const tokens = await generateTokens(req, res, user);

  // Send Welcome Email
  await sendEmailJob({
    to: user.email,
    subject: "Welcome to YummyHouse. A Home for all thing yummy.",
    template: path.join(EMAILTEMPLATEPATH, "welcome.mjml"),
    payload: {
      name: user.name,
    },
  });

  return {
    message: "Account verified successfully",
    ...tokens,
  };
}

export async function requestResetPassword(email: string) {
  const user = await prisma.user.findFirst({
    where: {
      email: email,
    },
  });

  const token = crypto.randomUUID();

  const tokenHash = encodeToken(token);

  if (user && user.emailVerifiedAt) {
    redisService.setAccountPasswordResetToken(
      tokenHash,
      user.id.toString(),
      60 * 30,
    );

    // Send reset password email.
    await sendEmailJob({
      to: user.email,
      subject: "YummyHouse Account Password Reset",
      template: path.join(EMAILTEMPLATEPATH, "account-password-reset.mjml"),
      payload: {
        name: user.name,
        reset_link: `${config.env.CLIENT_URL}/password-reset/${token}`,
        expiry_minutes: 15,
      },
    });

    return {
      message: "Password reset email sent. Please check your inbox.",
    };
  } else {
    throw new APIError("User does not exist. Please register", 401);
  }
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = encodeToken(token);

  const userId = await redisService.getAccountPasswordResetToken(tokenHash);

  if (!userId) {
    throw new APIError("Invalid or expired verification link", 401);
  }

  const hashPassword = await hash(password);

  const user = await prisma.user.update({
    where: {
      id: userId,
    },

    data: {
      password: hashPassword,
    },
  });

  // Send Welcome Email
  await sendEmailJob({
    to: user.email,
    subject: "Password Reset Successfully",
    template: path.join(EMAILTEMPLATEPATH, "successfully-reset-password.mjml"),
    payload: {
      name: user.name,
    },
  });

  return {
    message: "Account verified successfully",
  };
}

export async function getNewToken(
  req: FastifyRequest,
  res: FastifyReply,
  token: string,
) {
  const { payload, session } = await verifyRefreshToken(req, token);

  const user = await prisma.user.findUnique({
    where: {
      id: payload.sub,
    },
  });

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

  await prisma.session.update({
    where: {
      id: session.id,
    },

    data: {
      revokedAt: new Date(),
    },
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

export async function updateProfile(jwt: JwtPayload, payload: UserUpdateInput) {
  await prisma.user.update({
    where: {
      id: jwt.sub,
    },
    data: payload,
  });

  return { message: "Profile updated successfully" };
}

export async function requestResetEmail(
  jwt: JwtPayload,
  email: string,
  password: string,
) {
  const user = await prisma.user.findUnique({
    where: {
      id: jwt.sub,
    },
  });

  if (!user) {
    throw new APIError("User not found", 404);
  }

  const isMatch = await verify(user.password!, password);

  if (!isMatch) {
    throw new APIError("Invalid password", 401);
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (existingUser && existingUser.emailVerifiedAt) {
    throw new APIError("Email already in use", 400);
  }

  const token = crypto.randomUUID();
  const revertToken = crypto.randomUUID();

  const tokenHash = encodeToken(token);
  const revertTokenHash = crypto
    .createHash("sha256")
    .update(revertToken)
    .digest("hex");

  redisService.setAccountEmail(
    tokenHash,
    `${user.id.toString()}${EMAIL_RESET_SEPARATOR}${email}`,
    60 * 15,
  );

  redisService.setAccountEmail(
    revertTokenHash,
    `${user.id.toString()}${EMAIL_RESET_SEPARATOR}${email}`,
    60 * 60 * 24 * 7,
  );

  await sendEmailJob({
    to: email,
    subject: "YummyHouse Account Email Reset",
    template: path.join(EMAILTEMPLATEPATH, "email-reset-request.mjml"),
    payload: {
      name: user.name,
      reset_link: `${config.env.CLIENT_URL}/email-reset/${token}`,
      expiry_minutes: 15,
    },
  });

  await sendEmailJob({
    to: user.email,
    subject: "YummyHouse Account Email Reset Warning",
    template: path.join(EMAILTEMPLATEPATH, "email-reset-warning.mjml"),
    payload: {
      name: user.name,
      revert_link: `${config.env.CLIENT_URL}/email-reset/${revertToken}/revert`,
      expiry_days: 7,
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

  const user = await prisma.user.findUnique({
    where: {
      id: id,
    },
  });

  if (!user) {
    throw new APIError("User not found", 404);
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (existingUser) {
    if (existingUser.emailVerifiedAt) {
      throw new APIError("Email already in use", 400);
    } else {
      await prisma.user.delete({
        where: {
          id: existingUser.id,
        },
      });
    }
  }

  await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      email: email,
    },
  });

  await sendEmailJob({
    to: email,
    subject: "YummyHouse Account Email Reset Successfully",
    template: path.join(EMAILTEMPLATEPATH, "email-reset.mjml"),
    payload: {
      name: user.name,
    },
  });

  await sendEmailJob({
    to: user.email,
    subject: "YummyHouse Account Email Reset Successfully",
    template: path.join(EMAILTEMPLATEPATH, "email-reset.mjml"),
    payload: {
      name: user.name,
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

  const user = await prisma.user.findUnique({
    where: {
      id: id,
    },
  });

  if (!user) {
    throw new APIError("User not found", 404);
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (existingUser) {
    if (existingUser.emailVerifiedAt) {
      throw new APIError("Email already in use", 400);
    } else {
      await prisma.user.delete({
        where: {
          id: existingUser.id,
        },
      });
    }
  }

  const hashPassword = await hash(password);

  await prisma.user.update({
    where: {
      id: id,
    },
    data: {
      email: email,
      password: hashPassword,
    },
  });

  await sendEmailJob({
    to: email,
    subject: "YummyHouse Account Email Reset Reverted",
    template: path.join(EMAILTEMPLATEPATH, "email-revert.html"),
    payload: {
      name: user.name,
    },
  });

  return {
    message: "Email reverted successfully",
  };
}

export async function getUser(id: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: id,
    },
  });

  if (!user) {
    throw new APIError("User not found", 404);
  }

  return {
      message: "User retrieved successfully",
      user,
    }
}
