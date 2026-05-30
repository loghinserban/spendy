import { Request, Response, Router } from "express";
import { getPrismaClient } from "../utils/prismaClient";
import bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import crypto from "crypto";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { sendPasswordResetEmail } from "../services/emailService";
import { getAuthCookieOptions } from "../config/security";
import {
  ValidationError,
  validate2FAVerifyPayload,
  validateForgotPasswordPayload,
  validateLoginPayload,
  validateRegisterPayload,
  validateResetPasswordPayload,
} from "../utils/validation";

const authRouter = Router();

authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    // OWASP ZAP: strict DTO validation blocks fuzzed/malformed auth fields before business logic.
    const { username, password, totp } = validateLoginPayload(req.body);

    const prisma = getPrismaClient();
    const user = await prisma.user.findFirst({ where: { username } });

    if (!user) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    // If user has 2FA enabled, return a short-lived Pre-Auth token
    // The client must exchange this (with the TOTP code) at /verify-2fa to receive the final JWT
    if (user.twoFactorEnabled) {
      const preAuthToken = (jwt.sign as any)(
        {
          sub: user.id,
          preAuth: true,
        },
        process.env.JWT_SECRET || "dev-secret",
        { expiresIn: process.env.PRE_AUTH_EXPIRES_IN || "5m" }
      );

      return res.status(200).json({ preAuthToken, message: "2FA required" });
    }

    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        roleId: user.roleId,
      },
      include: {
        permission: true,
      },
    });

    const role = await prisma.role.findUnique({
      where: {
        id: user.roleId,
      },
    });

    if (!role) {
      return res.status(500).json({ message: "Role not found for authenticated user." });
    }

    // Map permissions to a simple key-value object
    const permissionsObject: Record<string, boolean> = {};
    rolePermissions.forEach((rp: any) => {
      permissionsObject[rp.permission.name] = true;
    });

    // Sign JWT
    const token = (jwt.sign as any)(
      {
        sub: user.id,
        username: user.username,
        role: role.name,
        roleId: user.roleId,
        groupId: role.name.trim().toUpperCase() === "ADMIN" ? "ADMIN" : "USER",
      },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    // Wireshark: deliver auth token in hardened cookie attributes.
    res.cookie("auth_token", token, getAuthCookieOptions());

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: role.name,
        permissions: permissionsObject,
      },
      token,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message, errors: error.details });
    }

    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    // OWASP ZAP: reject unexpected fields to prevent mass assignment in registration.
    const { username, email, password } = validateRegisterPayload(req.body);

    const prisma = getPrismaClient();

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username or email already exists." });
    }

    // Get the default "user" role
    let userRole = await prisma.role.findFirst({
      where: {
        name: "user",
      },
    });

    // If user role doesn't exist, create it
    if (!userRole) {
      userRole = await prisma.role.create({
        data: {
          name: "user",
          description: "Default user role",
        },
      });
    }

    // Hash password and create the new user
    const hashed = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashed,
        roleId: userRole.id,
      },
    });

    // Get role permissions
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        roleId: userRole.id,
      },
      include: {
        permission: true,
      },
    });

    // Map permissions to a simple key-value object
    const permissionsObject: Record<string, boolean> = {};
    rolePermissions.forEach((rp: any) => {
      permissionsObject[rp.permission.name] = true;
    });

    const token = (jwt.sign as any)(
      {
        sub: newUser.id,
        username: newUser.username,
        role: userRole.name,
        roleId: userRole.id,
        groupId: userRole.name.trim().toUpperCase() === "ADMIN" ? "ADMIN" : "USER",
      },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    // Wireshark: harden authentication cookie transport and JavaScript access.
    res.cookie("auth_token", token, getAuthCookieOptions());

    return res.status(201).json({
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: userRole.name,
        permissions: permissionsObject,
      },
      token,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message, errors: error.details });
    }

    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

// Password reset request - generates a reset token (would normally email it)
authRouter.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    // OWASP ZAP: strict validation rejects fuzzed email payloads and unknown keys.
    const { email } = validateForgotPasswordPayload(req.body);

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(200).json({ message: "If that email exists, a reset token was sent." });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await prisma.user.update({ where: { id: user.id }, data: { passwordResetToken: token, passwordResetExpires: expires } });

    const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const resetLink = `${appBaseUrl}/reset-password?token=${token}`;
    const mailResult = await sendPasswordResetEmail({ to: email, resetLink });

    const response: {
      message: string;
      previewUrl?: string;
      messageId?: string;
      devResetToken?: string;
    } = {
      message: "If that email exists, a reset link has been sent.",
      messageId: mailResult.messageId,
    };

    if (mailResult.previewUrl) {
      response.previewUrl = mailResult.previewUrl;
    }

    // Keep local development convenient while avoiding token disclosure in production.
    if (process.env.NODE_ENV !== "production") {
      response.devResetToken = token;
    }

    return res.status(200).json(response);
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ message: err.message, errors: err.details });
    }

    console.error("forgot-password error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

// Reset password using token
authRouter.post("/reset-password", async (req: Request, res: Response) => {
  try {
    // OWASP ZAP: strict validation blocks tampered reset bodies and oversized fields.
    const { token, newPassword } = validateResetPasswordPayload(req.body);

    const prisma = getPrismaClient();
    const user = await prisma.user.findFirst({ where: { passwordResetToken: token } });
    if (!user || !user.passwordResetExpires || user.passwordResetExpires.getTime() < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired token." });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed, passwordResetToken: null, passwordResetExpires: null } });

    return res.status(200).json({ message: "Password has been reset." });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ message: err.message, errors: err.details });
    }

    console.error("reset-password error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

// 2FA setup (requires auth) - returns a temporary secret for the user to configure their authenticator
authRouter.post("/2fa/setup", async (req: Request, res: Response) => {
  try {
    // user must be authenticated
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required." });

    const secret = speakeasy.generateSecret({ length: 20, name: `spendy:${userId}` });

    // Generate QR code data URL from the otpauth URL so frontend can display it directly.
    let qrDataUrl: string | null = null;
    try {
      qrDataUrl = await QRCode.toDataURL(secret.otpauth_url || "");
    } catch (qrErr) {
      // If QR generation fails, fall back to returning the otpauth URL for client-side QR generation.
      console.error("QR generation failed:", qrErr);
    }

    // Return secret to client to display QR / code. Client should call /2fa/verify to confirm and enable.
    return res.status(200).json({ ascii: secret.ascii, hex: secret.hex, base32: secret.base32, otpauth_url: secret.otpauth_url, qrDataUrl });
  } catch (err) {
    console.error("2fa/setup error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

// Verify the Pre-Auth token + TOTP code during login to issue the final JWT
authRouter.post("/verify-2fa", async (req: Request, res: Response) => {
  try {
    // Accept the pre-auth token either in the Authorization header or in the body
    const authHeader = (req.headers.authorization as string) || "";
    const preAuthTokenFromHeader = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const { preAuthToken, totp } = req.body as { preAuthToken?: string; totp?: string };
    const tokenToVerify = preAuthToken || preAuthTokenFromHeader;

    if (!tokenToVerify) return res.status(401).json({ message: "Pre-Auth token required." });
    if (!totp) return res.status(400).json({ message: "TOTP code required." });

    let decoded: any = null;
    try {
      decoded = jwt.verify(tokenToVerify, process.env.JWT_SECRET || "dev-secret") as any;
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired Pre-Auth token." });
    }

    if (!decoded || !decoded.sub || !decoded.preAuth) {
      return res.status(401).json({ message: "Invalid Pre-Auth token." });
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || !user.totpSecret) return res.status(401).json({ message: "User not found or 2FA not configured." });

    const verified = speakeasy.totp.verify({ secret: user.totpSecret || "", encoding: "base32", token: totp, window: 1 });
    if (!verified) return res.status(401).json({ message: "Invalid TOTP code." });

    // Build final JWT (same claims as /login)
    const rolePermissions = await prisma.rolePermission.findMany({
      where: {
        roleId: user.roleId,
      },
      include: {
        permission: true,
      },
    });

    const role = await prisma.role.findUnique({ where: { id: user.roleId } });
    if (!role) {
      return res.status(500).json({ message: "Role not found for authenticated user." });
    }

    const permissionsObject: Record<string, boolean> = {};
    rolePermissions.forEach((rp: any) => {
      permissionsObject[rp.permission.name] = true;
    });

    const finalToken = (jwt.sign as any)(
      {
        sub: user.id,
        username: user.username,
        role: role.name,
        roleId: user.roleId,
        groupId: role.name.trim().toUpperCase() === "ADMIN" ? "ADMIN" : "USER",
      },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    // Set hardened cookie and return final token
    res.cookie("auth_token", finalToken, getAuthCookieOptions());

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: role.name,
        permissions: permissionsObject,
      },
      token: finalToken,
    });
  } catch (err) {
    console.error("verify-2fa error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

// 2FA verify - confirm a code and enable 2FA for the authenticated user
authRouter.post("/2fa/verify", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Authentication required." });

    // OWASP ZAP: strict 2FA DTO validation prevents token/secret tampering.
    const { secret, token } = validate2FAVerifyPayload(req.body);

    const verified = speakeasy.totp.verify({ secret, encoding: "base32", token, window: 1 });
    if (!verified) return res.status(400).json({ message: "Invalid token." });

    const prisma = getPrismaClient();
    await prisma.user.update({ where: { id: userId }, data: { totpSecret: secret, twoFactorEnabled: true } });

    return res.status(200).json({ message: "2FA enabled." });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ message: err.message, errors: err.details });
    }

    console.error("2fa/verify error:", err);
    return res.status(500).json({ message: "Internal server error." });
  }
});

export default authRouter;




