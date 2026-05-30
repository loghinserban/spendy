import { Application, CookieOptions, NextFunction, Request, Response } from "express";
import cors, { CorsOptions } from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const AUTH_RATE_LIMIT_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/2fa/verify",
];

export const createAuthRateLimiter = (overrides?: { windowMs?: number; max?: number }) =>
  rateLimit({
    windowMs: overrides?.windowMs ?? parsePositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: overrides?.max ?? parsePositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 20),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: "Too many authentication requests. Please try again later.",
    },
  });

const parseNonNegativeInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const resolveClientIp = (req: Request): string => {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0]!.trim();
  }

  return req.ip || req.socket.remoteAddress || "unknown";
};

export const createSlidingWindowRateLimiter = (overrides?: {
  windowMs?: number;
  max?: number;
}) => {
  const windowMs = overrides?.windowMs ?? parsePositiveInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS, 60_000);
  const max = overrides?.max ?? parsePositiveInt(process.env.GLOBAL_RATE_LIMIT_MAX, 120);
  const queueLimit = parseNonNegativeInt(process.env.GLOBAL_RATE_LIMIT_QUEUE, 0);
  const requestsByIp = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const ip = resolveClientIp(req);
    const windowStart = now - windowMs;
    const requestTimes = requestsByIp.get(ip) ?? [];
    const currentWindowTimes = requestTimes.filter((timestamp) => timestamp > windowStart);

    // Apache JMeter: sliding-window counting of requests per source IP.
    if (currentWindowTimes.length >= max) {
      // Apache JMeter: queue limit is intentionally zero, so over-limit traffic is dropped immediately.
      if (queueLimit !== 0) {
        console.warn("GLOBAL_RATE_LIMIT_QUEUE is non-zero; secure default is 0 for immediate drops.");
      }

      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    currentWindowTimes.push(now);
    requestsByIp.set(ip, currentWindowTimes);
    next();
  };
};

// Keep a conservative local dev-only default. Production/public deployments
// must set `CORS_ORIGINS` or `FRONTEND_ORIGIN` in the environment to a
// comma-separated list of allowed origins (e.g. your Vercel URL). The
// previous repository default contained a hardcoded LAN IP — remove that to
// avoid accidental exposure.
const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:5173", "https://localhost:5173"];

const normalizeOrigin = (value: string): string => value.replace(/\/$/, "").trim();

export const getAllowedOrigins = (): string[] => {
  const configuredOrigins = process.env.CORS_ORIGINS ?? process.env.FRONTEND_ORIGIN ?? "";
  const parsedOrigins = configuredOrigins
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

  return parsedOrigins.length > 0 ? parsedOrigins : DEFAULT_ALLOWED_ORIGINS.map(normalizeOrigin);
};

export const createCorsOptions = (): CorsOptions => {
  const allowedOrigins = getAllowedOrigins();

  return {
    origin: (origin, callback) => {
      // Allow non-browser clients (no Origin header)
      if (!origin) {
        callback(null, true);
        return;
      }

      const incoming = normalizeOrigin(String(origin));
      if (allowedOrigins.includes(incoming)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    // Restrict to the required methods
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    // Allow common and app-specific headers
    allowedHeaders: ["Content-Type", "Authorization", "X-User-ID", "X-Requested-With"],
    optionsSuccessStatus: 204,
    preflightContinue: false,
  };
};

export const applySecurityMiddleware = (app: Application): void => {
  const oneYearInSeconds = 60 * 60 * 24 * 365;

  app.use(
    helmet({
      // Wireshark: HSTS tells compliant browsers to use HTTPS only after first secure response.
      hsts: {
        maxAge: oneYearInSeconds,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    const isTestRuntime = Boolean(process.env.JEST_WORKER_ID);
    const forwardedProto = String(req.headers["x-forwarded-proto"] ?? "").toLowerCase();
    const isHttps = req.secure || forwardedProto === "https";

    // Wireshark: force transport upgrade to HTTPS to prevent credentials over plaintext HTTP.
    if (!isTestRuntime && !isHttps) {
      const host = req.headers.host;

      if (host) {
        res.redirect(301, `https://${host}${req.originalUrl}`);
        return;
      }
    }

    next();
  });

  app.use(createSlidingWindowRateLimiter());

  const corsOptions = createCorsOptions();
  app.use(cors(corsOptions));
  // Ensure preflight OPTIONS requests succeed for all routes by running the CORS
  // middleware early for OPTIONS requests. This avoids using `app.options()` which
  // may interact with path-to-regexp in this environment.
  app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
      return cors(corsOptions)(req, res, next as any)
    }

    next()
  })
  app.use(AUTH_RATE_LIMIT_PATHS, createAuthRateLimiter());
};

export const getAuthCookieOptions = (): CookieOptions => ({
  // Wireshark: prevent token access from JavaScript during XSS attempts.
  httpOnly: true,
  // Wireshark: only send the cookie over TLS.
  secure: true,
  // Allow operator to control SameSite behavior via AUTH_COOKIE_SAMESITE.
  // For single-origin deployments (frontend and backend same origin) the
  // secure default is "strict". For cross-origin deployments (Vercel
  // frontend + Render backend) set AUTH_COOKIE_SAMESITE="none" so browsers
  // will send cookies with cross-site requests (requires Secure=true).
  sameSite: (process.env.AUTH_COOKIE_SAMESITE as any) ?? "strict",
  path: "/",
  maxAge: parsePositiveInt(process.env.AUTH_COOKIE_MAX_AGE_MS, 60 * 60 * 1000),
});

