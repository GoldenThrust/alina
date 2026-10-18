import { type FastifyReply, type FastifyRequest } from "fastify";

import type {
  LoginBody,
  PasswordBody,
  ProfileUpdate,
  RegisterBody,
  RequestResetPasswordBody,
  TokenParam,
  UpdateBody,
} from "./auth.js";
import register, {
  handleOAuthLogin,
  verifyAccountToken,
  login,
  resetPassword,
  getNewToken,
  revokeSession,
  updateProfile,
  requestResetPassword,
  requestResetEmail,
  resetEmail,
  revertResetEmail,
  getUser,
} from "./auth.service.ts";
import APIError from "../../errors/APIError.ts";
import { fileManager } from "../../common/files/file.ts";
import { logger } from "../../config/logger.ts";

/**
 * OAuth2 callback handler for Google sign-in
 * @param req - Fastify request with OAuth token
 * @param res - Fastify response
 * @returns User data with authentication tokens
 */
export async function GoogleCallbackHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  const { token } =
    await req.server.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);

  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    },
  );

  const data: any = await response.json();

  const result = await handleOAuthLogin(req, res, {
    email: data.email,
    name: data.name,
    providerId: data.id,
    provider: "google",
  });

  return res.send(result);
}

/**
 * OAuth2 callback handler for X (Twitter) sign-in
 * @param req - Fastify request with OAuth token
 * @param res - Fastify response
 * @returns User data with authentication tokens
 */
export async function XCallbackHandler(req: FastifyRequest, res: FastifyReply) {
  const { token } =
    await req.server.XOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);

  const response = await fetch("https://api.X.com/2/users/me", {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
  });

  const data: any = await response.json();

  const result = await handleOAuthLogin(req, res, {
    email: `${data.data.id}@twitter.placeholder`,
    name: data.data.name,
    providerId: data.data.id,
    provider: "X",
  });

  return res.send(result);
}

/**
 * OAuth2 callback handler for Facebook sign-in
 * @param req - Fastify request with OAuth token
 * @param res - Fastify response
 * @returns User data with authentication tokens
 */
export async function FacebookCallbackHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  const { token } =
    await req.server.facebookOAuth2.getAccessTokenFromAuthorizationCodeFlow(
      req,
    );

  const response = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email&access_token=${token.access_token}`,
  );

  const data: any = await response.json();

  const result = await handleOAuthLogin(req, res, {
    email: data.email,
    name: data.name,
    providerId: data.id,
    provider: "facebook",
  });

  return res.send(result);
}

/**
 * User registration handler
 * @param req - Fastify request with { name, email, password }
 * @param res - Fastify response
 * @returns Created user with access token
 */
export async function registerHandler(
  req: FastifyRequest<{
    Body: RegisterBody;
  }>,
  res: FastifyReply,
) {
  try {
    const { name, email, password } = req.body;

    const response = await register({
      name,
      email,
      password,
    });

    res.status(201).send(response);
  } catch (error: any) {
    if (error instanceof APIError) {
      return res.status(error.statusCode).send({
        message: error.message,
      });
    }

    console.error("User registration failed", error);

    res.status(500).send({ message: "User registration failed" });
  }
}

/**
 * User login handler
 * @param req - Fastify request with { email, password }
 * @param res - Fastify response
 * @returns User data with access and refresh tokens
 */
export async function loginHandler(
  req: FastifyRequest<{ Body: LoginBody }>,
  res: FastifyReply,
) {
  try {
    const { email, password } = req.body;

    const response = await login(req, res, {
      email,
      password,
    });

    res.status(200).send(response);
  } catch (error: any) {
    if (error instanceof APIError) {
      return res.status(error.statusCode).send({
        message: error.message,
      });
    }

    console.error("Login failed", error);
    logger.error("User login failed", error);


    res.status(500).send({ message: "User Login failed" });
  }
}

/**
 * Account email verification handler
 * @param req - Fastify request with verification token in params
 * @param res - Fastify response
 * @returns Success message with verified user data
 */
export async function verifyAccountHandler(
  req: FastifyRequest<{
    Params: TokenParam;
  }>,
  res: FastifyReply,
) {
  try {
    const { token } = req.params;

    const response = await verifyAccountToken(req, res, token);

    return res.status(200).send(response);
  } catch (error: any) {
    if (error instanceof APIError) {
      return res.status(error.statusCode).send({
        message: error.message,
      });
    }

    console.error("Account verification failed", error);

    res.status(500).send({ message: "Account verification failed" });
  }
}

/**
 * Request password reset email
 * @param req - Fastify request with { email } or uses authenticated user's email
 * @param res - Fastify response
 * @returns Confirmation message
 */
export async function requestResetPasswordHandler(
  req: FastifyRequest<{
    Body: RequestResetPasswordBody;
  }>,
  res: FastifyReply,
) {
  try {
    let email = req.body?.email;

    if (!email) {
      const user = req.user as JwtPayload | null;
      if (!user) {
        throw new APIError("Email is required", 400);
      }
      email = user.email;
    }

    const response = await requestResetPassword(email);

    return res.status(200).send(response);
  } catch (error: any) {
    if (error instanceof APIError) {
      return res.status(error.statusCode).send({
        message: error.message,
      });
    }

    res.status(500).send({ message: "Failed to send request" });
  }
}

/**
 * Reset password using token from email
 * @param req - Fastify request with reset token and new password
 * @param res - Fastify response
 * @returns Success message
 */
export async function resetPasswordHandler(
  req: FastifyRequest<{
    Params: TokenParam;
    Body: PasswordBody;
  }>,
  res: FastifyReply,
) {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const response = await resetPassword(token, password);

    return res.status(200).send(response);
  } catch (error: any) {
        if (error instanceof APIError) {
      return res.status(error.statusCode).send({
        message: error.message,
      });
    }

    res.status(500).send({ message: "Failed to reset password" });
  }
}

/**
 * Refresh JWT access token using refresh token
 * @param req - Fastify request with Bearer refresh token
 * @param res - Fastify response
 * @returns New access token
 */
export async function refreshTokenHandler(
  req: FastifyRequest,
  res: FastifyReply,
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new APIError("Refresh token missing", 401);
    }

    const response = await getNewToken(req, res, authHeader!.split(" ")[1]!);

    return res.send(response);
  } catch (error: any) {
        if (error instanceof APIError) {
      return res.status(error.statusCode).send({
        message: error.message,
      });
    }

    res.status(500).send({ message: "Token refresh failed" });
  }
}

/**
 * Logout and revoke user session
 * @param req - Fastify request with Bearer token
 * @param res - Fastify response
 * @returns Success message
 */
export async function logoutHandler(req: FastifyRequest, res: FastifyReply) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new APIError("Refresh token missing", 401);
    }

    const response = await revokeSession(req, res, authHeader!.split(" ")[1]!);

    return res.send(response);
  } catch (error: any) {
        if (error instanceof APIError) {
      return res.status(error.statusCode).send({
        message: error.message,
      });
    }

    res.status(500).send({ message: "Logout failed" });
  }
}

/**
 * Retrieve current authenticated user profile
 * @param req - Fastify request with authenticated user context
 * @param res - Fastify response
 * @returns User profile (name, email, phoneNumber, image, role)
 */
export async function getUserHandler(req: FastifyRequest, res: FastifyReply) {
  try {
    const payload = req.user as JwtPayload;

    if (!payload) {
      throw new APIError("User not found", 404);
    }

    const response = await getUser(payload.sub);
    return res.send(response);
  } catch (error: any) {
        if (error instanceof APIError) {
      return res.status(error.statusCode).send({
        message: error.message,
      });
    }

    res.status(500).send({ message: "Failed to fetch user" });
  }
}

/**
 * Update user profile with optional image upload
 * @param req - Fastify request with profile update data and optional image file
 * @param res - Fastify response
 * @returns Updated user profile
 */
export async function updateProfileHandler(
  req: FastifyRequest<{ Body: UpdateBody }>,
  res: FastifyReply,
) {
  try {
    const user = req.user as JwtPayload;
    if (!user) {
      throw new APIError("User not found", 404);
    }

    let imagePath;

    try {
      imagePath = await fileManager.uploadFile(req, "image");
    } catch (error) {}

    const payload = {
      ...req.body,
      image: imagePath,
    };

    const response = await updateProfile(user, payload);

    return res.send(response);
  } catch (error: any) {
        if (error instanceof APIError) {
      return res.status(error.statusCode).send({
        message: error.message,
      });
    }

    res.status(500).send({ message: "Failed to update profile" });
  }
}

/**
 * Initiate email change request - requires current password verification
 * @param req - Fastify request with { email, password }
 * @param res - Fastify response
 * @returns Confirmation email sent to new address
 */
export async function requestResetEmailHandler(
  req: FastifyRequest<{ Body: LoginBody }>,
  res: FastifyReply,
) {
  try {
    const user = req.user as JwtPayload;
    const { email, password } = req.body;

    const response = await requestResetEmail(user, email, password);

    return res.send(response);
  } catch (error: any) {
        if (error instanceof APIError) {
      return res.status(error.statusCode).send({
        message: error.message,
      });
    }

    res.status(500).send({ message: "Failed to request email reset" });
  }
}

/**
 * Confirm and finalize email change using token from verification email
 * @param req - Fastify request with email reset token in params
 * @param res - Fastify response
 * @returns Success message with updated user email
 */
export async function resetEmailHandler(
  req: FastifyRequest<{
    Params: TokenParam;
  }>,
  res: FastifyReply,
) {
  try {
    const { token } = req.params;
    const response = await resetEmail(token);

    return res.send(response);
  } catch (error: any) {
        if (error instanceof APIError) {
      return res.status(error.statusCode).send({
        message: error.message,
      });
    }

    res.status(500).send({ message: "Failed to reset email" });
  }
}

/**
 * Revert/cancel pending email change request
 * @param req - Fastify request with revert token in params and new password in body
 * @param res - Fastify response
 * @returns Success message
 */
export async function revertResetEmailHandler(
  req: FastifyRequest<{
    Params: TokenParam;
    Body: PasswordBody;
  }>,
  res: FastifyReply,
) {
  try {
    const { token } = req.params;
    const { password } = req.body;
    const response = await revertResetEmail(token, password);

    return res.send(response);
  } catch (error: any) {
        if (error instanceof APIError) {
      return res.status(error.statusCode).send({
        message: error.message,
      });
    }

    res.status(500).send({ message: "Failed to revert email reset" });
  }
}
