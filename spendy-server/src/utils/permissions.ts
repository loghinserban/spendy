import { Request, Response, NextFunction } from "express";
import { getPrismaClient } from "./prismaClient";
import * as jwt from "jsonwebtoken";

type AuditGroup = "ADMIN" | "USER";

// Do not construct PrismaClient during tests to avoid constructor validation issues.
const prisma = process.env.NODE_ENV === "test" ? (null as any) : getPrismaClient();

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        roleId: string;
        role?: string;
        groupId?: AuditGroup;
      };
      userPermissions?: string[];
    }
  }
}

const normalizeGroupId = (value: unknown): AuditGroup => {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "ADMIN" ? "ADMIN" : "USER";
};

const extractCookieToken = (cookieHeader: string | undefined): string | undefined => {
  if (!cookieHeader) {
    return undefined;
  }

  const authTokenPair = cookieHeader
    .split(";")
    .map((pair) => pair.trim())
    .find((pair) => pair.startsWith("auth_token="));

  if (!authTokenPair) {
    return undefined;
  }

  return decodeURIComponent(authTokenPair.slice("auth_token=".length).trim());
};

/**
 * Middleware to extract user information from request
 * Expects a Bearer JWT and ignores spoofable identity fields in body/query headers.
 */
export const extractUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First: if Authorization header or secure auth cookie is present, validate JWT and attach user.
    const authHeader = (req.headers["authorization"] || req.headers["Authorization"]) as
      | string
      | undefined;
    const cookieToken = extractCookieToken(req.headers.cookie);
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : cookieToken;

    if (token) {
      try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          console.warn("JWT_SECRET is not set; skipping token verification");
        } else {
          const payload = jwt.verify(token, secret) as any;

          if (payload && payload.sub) {
            const fallbackGroupId = normalizeGroupId(payload.groupId ?? payload.role ?? payload.roleId);
            req.user = {
              id: String(payload.sub),
              username: String(payload.username ?? ""),
              roleId: String(payload.roleId ?? payload.role ?? ""),
              role: typeof payload.role === "string" ? payload.role : undefined,
              groupId: fallbackGroupId,
            };

            // If prisma available, load permissions for this user role
            if (prisma) {
              const user = await prisma.user.findUnique({
                where: { id: String(payload.sub) },
                include: { role: true },
              });

              if (user) {
                req.user.roleId = user.roleId;
                req.user.role = user.role?.name ?? req.user.role;
                req.user.groupId = normalizeGroupId(user.role?.name ?? req.user.groupId);

                // Load role permissions via rolePermission join table
                const rolePermissions = await prisma.rolePermission.findMany({
                  where: { roleId: user.roleId },
                  include: { permission: true },
                });

                req.userPermissions = rolePermissions.map((rp: any) => rp.permission.name);
              }
            }
          }
        }
      } catch (err) {
        // Token invalid or expired - continue without attaching user (other middleware can reject)
        const msg = (err as any)?.message ?? err;
        if (!process.env.JEST_WORKER_ID) {
          console.warn("Invalid JWT token provided:", msg);
        }
      }
    }


    next();
  } catch (error) {
    console.error("Error extracting user:", error);
    next();
  }
};

/**
 * Middleware factory to check if user has required permission
 * @param requiredPermission - The permission name to check (e.g., 'read:expenses', 'create:expenses')
 * @returns Middleware function
 */
export const checkPermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is available
    if (!req.user) {
      return res.status(401).json({
        error: "User not authenticated. Please provide a valid Bearer token.",
      });
    }

    // Check if user has required permission
    if (!req.userPermissions || !req.userPermissions.includes(requiredPermission)) {
      return res.status(403).json({
        error: `Permission denied. Required permission: ${requiredPermission}`,
      });
    }

    next();
  };
};

/**
 * Middleware factory to require a specific role name (e.g., 'admin')
 */
export const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated." });
    }

    const normalizedRequiredRole = requiredRole.trim().toLowerCase();

    // Check role name if available on req.user, otherwise deny
    if (!req.user.role && req.user.roleId !== requiredRole && req.user.roleId !== normalizedRequiredRole) {
      return res.status(403).json({ error: `Requires role: ${requiredRole}` });
    }

    // If role name matches or roleId equals requiredRole, allow
    if (req.user.role === requiredRole || req.user.roleId === requiredRole || req.user.roleId === normalizedRequiredRole) {
      return next();
    }

    return res.status(403).json({ error: `Requires role: ${requiredRole}` });
  };
};

export const requireGroup = (requiredGroup: AuditGroup) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated." });
    }

    if (req.user.groupId !== requiredGroup) {
      return res.status(403).json({ error: `Requires group: ${requiredGroup}` });
    }

    next();
  };
};

export default {
  extractUser,
  checkPermission,
  requireGroup,
};




