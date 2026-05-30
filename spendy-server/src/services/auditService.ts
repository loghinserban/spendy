import { getPrismaClient } from "../utils/prismaClient";
import { Request } from "express";

type AuditGroup = "ADMIN" | "USER";
type ObservationStatus = "ACTIVE" | "REVIEWED";

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export interface AuditActionInformation {
  method: string;
  endpoint: string;
  route?: string;
  statusCode: number;
  summary: string;
  durationMs: number;
  userAgent?: string | undefined;
  sourceIp?: string | undefined;
  query?: unknown;
  payloadSnippet?: unknown;
  responseCategory?: "success" | "client_error" | "server_error";
  validationFailure?: boolean;
}

export interface AuditLogRecord {
  userId: string;
  groupId: AuditGroup;
  actionInformation: AuditActionInformation;
  timestamp: Date;
}

export interface ObservationListItem {
  flagId: string;
  userId: string;
  reason: string;
  severityLevel: number;
  status: ObservationStatus;
  flaggedAt: Date;
}

export interface ObservationListResponseItem extends ObservationListItem {
  user: {
    id: string;
    username: string;
    email: string;
    roleId: string;
  };
  recentActionHistory: AuditActionInformation[];
}

export interface ObservationListPage<TItem = ObservationListResponseItem> {
  data: TItem[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ObservationListQuery {
  page?: number;
  limit?: number;
  status?: ObservationStatus | "ALL";
  minSeverity?: number;
  maxSeverity?: number;
  historyLimit?: number;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "newPassword",
  "token",
  "auth_token",
  "secret",
  "totp",
  "totpSecret",
  "refreshToken",
  "accessToken",
  "authorization",
]);

const MAX_STRING_LENGTH = 180;
const MAX_DEPTH = 2;
const MAX_ARRAY_ITEMS = 6;
const AUDIT_FLUSH_DELAY_MS = parsePositiveInt(process.env.AUDIT_FLUSH_DELAY_MS, 250);
const AUDIT_DETECTION_INTERVAL_MS = parsePositiveInt(process.env.AUDIT_DETECTION_INTERVAL_MS, 5000);
const DETECTION_WINDOW_LIMIT = parsePositiveInt(process.env.AUDIT_DETECTION_WINDOW_LIMIT, 500);
const VELOCITY_THRESHOLD = parsePositiveInt(process.env.AUDIT_VELOCITY_THRESHOLD, 50);
const PRIVILEGE_THRESHOLD = parsePositiveInt(process.env.AUDIT_PRIVILEGE_THRESHOLD, 3);
const FUZZING_THRESHOLD = parsePositiveInt(process.env.AUDIT_FUZZING_THRESHOLD, 3);

const normalizeGroupId = (value: unknown): AuditGroup => {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized === "ADMIN" ? "ADMIN" : "USER";
};

const truncateString = (value: string): string =>
  value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;

const sanitizeValue = (value: unknown, depth = 0): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return truncateString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) {
      return `[${value.length} items]`;
    }

    return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    if (depth >= MAX_DEPTH) {
      return "[truncated]";
    }

    const source = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(source)) {
      if (SENSITIVE_KEYS.has(key)) {
        sanitized[key] = "[REDACTED]";
        continue;
      }

      sanitized[key] = sanitizeValue(entry, depth + 1);
    }

    return sanitized;
  }

  return truncateString(String(value));
};

const categorizeStatusCode = (statusCode: number): "success" | "client_error" | "server_error" => {
  if (statusCode >= 500) {
    return "server_error";
  }

  if (statusCode >= 400) {
    return "client_error";
  }

  return "success";
};

const endpointMatchesAdminOnlyRoute = (endpoint: string): boolean =>
  endpoint === "/api/admin" || endpoint.startsWith("/api/admin/");

const getObservationListStatusFilter = (status: ObservationStatus | "ALL" | undefined): ObservationStatus[] | undefined => {
  if (!status || status === "ALL") {
    return undefined;
  }

  return [status];
};

class AuditThreatPipeline {
  private readonly prisma = getPrismaClient();
  private pendingWrites: AuditLogRecord[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private sweepTimer: NodeJS.Timeout | null = null;
  private started = false;
  private schemaReady = false;
  private schemaCheckTimer: NodeJS.Timeout | null = null;

  public start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    // Perform an immediate schema readiness check and continue to re-check periodically.
    void this.checkSchemaReady();

    this.schemaCheckTimer = setInterval(() => {
      void this.checkSchemaReady();
    }, Math.max(5_000, AUDIT_DETECTION_INTERVAL_MS));
    this.schemaCheckTimer.unref?.();

    // The periodic sweep will be started by checkSchemaReady() when the table exists.
  }

  private async checkSchemaReady(): Promise<void> {
    try {
      const prisma = this.prisma as any;
      // Check for exact table name presence using Postgres to_regclass
      const result = await prisma.$queryRawUnsafe(`SELECT to_regclass('public."AuditLogs"')::text as t`);
      const exists = Array.isArray(result) && result[0] && (result[0] as any).t !== null;
      if (exists && !this.schemaReady) {
        this.schemaReady = true;
        // start sweep timer now that schema exists
        if (!this.sweepTimer) {
          this.sweepTimer = setInterval(() => {
            void this.sweepRecentAuditLogs();
          }, AUDIT_DETECTION_INTERVAL_MS);
          this.sweepTimer.unref?.();
        }
        // attempt to flush pending writes now that schema is ready
        if (this.pendingWrites.length > 0) {
          void this.flushPendingWrites();
        }
      } else if (!exists) {
        this.schemaReady = false;
      }
    } catch (error) {
      // Keep schemaReady false on error; warn once but avoid spamming
      this.schemaReady = false;
      console.warn('Audit schema readiness check failed:', error instanceof Error ? error.message : String(error));
    }
  }

  public middleware = (req: Request, res: any, next: () => void): void => {
    if (process.env.JEST_WORKER_ID) {
      next();
      return;
    }

    const startedAt = process.hrtime.bigint();

    res.on("finish", () => {
      const user = req.user;
      if (!user?.id) {
        return;
      }

      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const endpoint = req.originalUrl.split("?")[0] || req.baseUrl || req.url || "/";
      const groupId = normalizeGroupId(user.groupId ?? user.role ?? user.roleId);
      const actionInformation: AuditActionInformation = {
        method: req.method,
        endpoint,
        route: req.route?.path ? `${req.baseUrl}${req.route.path}` : endpoint,
        statusCode: res.statusCode,
        summary: `${req.method} ${endpoint} -> ${res.statusCode}`,
        durationMs: Number.isFinite(durationMs) ? Math.max(0, Number(durationMs.toFixed(3))) : 0,
        userAgent: typeof req.headers["user-agent"] === "string" ? truncateString(req.headers["user-agent"]) : undefined,
        sourceIp: req.ip || req.socket.remoteAddress || undefined,
        query: sanitizeValue(req.query),
        payloadSnippet: sanitizeValue(req.body),
        responseCategory: categorizeStatusCode(res.statusCode),
        validationFailure: res.statusCode === 400,
      };

      // If schema isn't ready, skip persisting audit logs for now.
      if (!this.schemaReady) {
        return;
      }

      this.enqueue({
        userId: user.id,
        groupId,
        actionInformation,
        timestamp: new Date(),
      });
    });

    next();
  };

  public async getObservationList(
    query: ObservationListQuery = {},
  ): Promise<ObservationListPage> {
    try {
      const prisma = this.prisma as any;
      const page = Math.max(1, Number(query.page ?? 1));
      const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20)));
      const historyLimit = Math.min(25, Math.max(1, Number(query.historyLimit ?? 10)));
      const statusFilter = getObservationListStatusFilter(query.status);

      const where: Record<string, unknown> = {};

      if (statusFilter) {
        where.status = { in: statusFilter };
      }

      if (Number.isFinite(query.minSeverity)) {
        where.severityLevel = {
          ...(where.severityLevel as Record<string, unknown> | undefined),
          gte: query.minSeverity,
        };
      }

      if (Number.isFinite(query.maxSeverity)) {
        where.severityLevel = {
          ...(where.severityLevel as Record<string, unknown> | undefined),
          lte: query.maxSeverity,
        };
      }

      const totalItems = await prisma.observationList.count({ where });
      const observations = await prisma.observationList.findMany({
        where,
        orderBy: [{ severityLevel: "desc" }, { flaggedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              roleId: true,
            },
          },
        },
      });

      const data = await Promise.all(
        observations.map(async (observation: any) => ({
          flagId: observation.flagId,
          userId: observation.userId,
          reason: observation.reason,
          severityLevel: observation.severityLevel,
          status: observation.status,
          flaggedAt: observation.flaggedAt,
          user: observation.user,
          recentActionHistory: await this.getRecentActionHistory(observation.userId, historyLimit),
        })),
      );

      return {
        data,
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      };
    } catch (error) {
      console.warn("Observation list unavailable:", error instanceof Error ? error.message : String(error));
      return { data: [], page: 1, limit: 20, totalItems: 0, totalPages: 1 };
    }
  }

  public async reviewObservation(flagId: string): Promise<ObservationListResponseItem | null> {
    try {
      const prisma = this.prisma as any;
      const observation = await prisma.observationList.update({
        where: { flagId },
        data: {
          status: "REVIEWED",
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              roleId: true,
            },
          },
        },
      });

      return {
        flagId: observation.flagId,
        userId: observation.userId,
        reason: observation.reason,
        severityLevel: observation.severityLevel,
        status: observation.status,
        flaggedAt: observation.flaggedAt,
        user: observation.user,
        recentActionHistory: await this.getRecentActionHistory(observation.userId, 10),
      };
    } catch (error) {
      console.warn(
        `Failed to review observation ${flagId}:`,
        error instanceof Error ? error.message : String(error),
      );
      return null;
    }
  }

  private enqueue(record: AuditLogRecord): void {
    this.pendingWrites.push(record);

    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      void this.flushPendingWrites();
    }, AUDIT_FLUSH_DELAY_MS);

    this.flushTimer.unref?.();
  }

  private async flushPendingWrites(): Promise<void> {
    const batch = this.pendingWrites.splice(0, this.pendingWrites.length);
    this.flushTimer = null;
    const prisma = this.prisma as any;

    if (batch.length === 0) {
      return;
    }

    // If schema isn't ready yet, requeue the batch and schedule another attempt.
    if (!this.schemaReady) {
      // Put the batch back at the head of the pendingWrites queue
      this.pendingWrites.unshift(...batch);
      // Schedule a retry later
      if (!this.flushTimer) {
        this.flushTimer = setTimeout(() => {
          void this.flushPendingWrites();
        }, AUDIT_FLUSH_DELAY_MS);
        this.flushTimer.unref?.();
      }
      return;
    }

    try {
      await prisma.auditLog.createMany({
        data: batch.map((entry) => ({
          userId: entry.userId,
          groupId: entry.groupId,
          actionInformation: entry.actionInformation as any,
          timestamp: entry.timestamp,
        })),
      });
    } catch (error) {
      // Fail open: audit logging must never break the primary request path.
      console.warn("Audit log write failed:", error instanceof Error ? error.message : String(error));
      // Requeue batch for a later retry attempt
      this.pendingWrites.unshift(...batch);
      return;
    }

    const affectedUserIds = [...new Set(batch.map((entry) => entry.userId))];
    await Promise.allSettled(affectedUserIds.map((userId) => this.evaluateUserThreats(userId)));
  }

  private async sweepRecentAuditLogs(): Promise<void> {
    try {
      if (!this.schemaReady) {
        return;
      }
      const prisma = this.prisma as any;
      const recentLogs: Array<{ userId: string }> = await prisma.auditLog.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 10 * 60_000),
          },
        },
        orderBy: { timestamp: "desc" },
        take: DETECTION_WINDOW_LIMIT,
        select: { userId: true },
      });

      const affectedUserIds = [...new Set(recentLogs.map((log: { userId: string }) => log.userId))];
      await Promise.allSettled(affectedUserIds.map((userId) => this.evaluateUserThreats(userId)));
    } catch (error) {
      console.warn("Audit sweep failed:", error instanceof Error ? error.message : String(error));
    }
  }

  private async evaluateUserThreats(userId: string): Promise<void> {
    try {
      const prisma = this.prisma as any;
      const recentLogs: Array<{ timestamp: Date; groupId: AuditGroup; actionInformation: unknown }> = await prisma.auditLog.findMany({
        where: {
          userId,
          timestamp: {
            gte: new Date(Date.now() - 10 * 60_000),
          },
        },
        orderBy: { timestamp: "desc" },
        take: DETECTION_WINDOW_LIMIT,
      });

      if (recentLogs.length === 0) {
        return;
      }

    const last10Seconds = Date.now() - 10_000;
    const last5Minutes = Date.now() - 5 * 60_000;
    const velocityLogs = recentLogs.filter((log: { timestamp: Date }) => log.timestamp.getTime() >= last10Seconds);
    const admin403Logs = recentLogs.filter((log: { groupId: AuditGroup; actionInformation: unknown }) => {
      const info = log.actionInformation as Record<string, unknown>;
      return (
        log.groupId === "USER" &&
        Number(info.statusCode) === 403 &&
        typeof info.endpoint === "string" &&
        endpointMatchesAdminOnlyRoute(info.endpoint)
      );
    });
    const validation400Logs = recentLogs.filter((log: { timestamp: Date; actionInformation: unknown }) => {
      const info = log.actionInformation as Record<string, unknown>;
      return (
        Number(info.statusCode) === 400 &&
        log.timestamp.getTime() >= last5Minutes &&
        (info.validationFailure === true || info.responseCategory === "client_error")
      );
    });

      const threats: Array<{ reason: string; severityLevel: number }> = [];

    if (velocityLogs.length > VELOCITY_THRESHOLD) {
      threats.push({
        reason: `Velocity/brute-force activity detected: ${velocityLogs.length} actions in the last 10 seconds.`,
        severityLevel: 9,
      });
    }

    if (admin403Logs.length >= PRIVILEGE_THRESHOLD) {
      threats.push({
        reason: `Privilege escalation attempts detected: ${admin403Logs.length} forbidden requests to admin-only endpoints.`,
        severityLevel: 8,
      });
    }

    if (validation400Logs.length >= FUZZING_THRESHOLD) {
      threats.push({
        reason: `Fuzzing/tampering detected: ${validation400Logs.length} validation failures returned HTTP 400.`,
        severityLevel: 7,
      });
    }

      if (threats.length === 0) {
        return;
      }

      const reason = threats
        .map((threat) => threat.reason)
        .filter((entry, index, array) => array.indexOf(entry) === index)
        .join(" | ");
      const severityLevel = Math.max(...threats.map((threat) => threat.severityLevel));

      await this.flagUser(userId, reason, severityLevel);
    } catch (error) {
      console.warn(
        `Threat evaluation failed for user ${userId}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async flagUser(userId: string, reason: string, severityLevel: number): Promise<void> {
    try {
      const prisma = this.prisma as any;
      const existing = await prisma.observationList.findUnique({
        where: { userId },
      });

      if (existing && existing.status === "ACTIVE" && existing.reason === reason && existing.severityLevel >= severityLevel) {
        return;
      }

      await prisma.observationList.upsert({
        where: { userId },
        create: {
          userId,
          reason,
          severityLevel,
          status: "ACTIVE",
          flaggedAt: new Date(),
        },
        update: {
          reason,
          severityLevel,
          status: "ACTIVE",
          flaggedAt: new Date(),
        },
      });
    } catch (error) {
      console.warn(
        `Failed to flag suspicious user ${userId}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async getRecentActionHistory(userId: string, limit: number): Promise<AuditActionInformation[]> {
    try {
      const prisma = this.prisma as any;
      const logs: Array<{ actionInformation: AuditActionInformation }> = await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { timestamp: "desc" },
        take: limit,
      });

      return logs.map((log: { actionInformation: AuditActionInformation }) => log.actionInformation as unknown as AuditActionInformation);
    } catch (error) {
      console.warn(
        `Failed to load audit history for user ${userId}:`,
        error instanceof Error ? error.message : String(error),
      );
      return [];
    }
  }
}

export const auditThreatPipeline = new AuditThreatPipeline();

export const auditLoggingMiddleware = auditThreatPipeline.middleware;

export const startAuditThreatDetection = (): void => {
  auditThreatPipeline.start();
};

export const getAuditObservationList = async (
  query: ObservationListQuery = {},
): Promise<ObservationListPage> => auditThreatPipeline.getObservationList(query);

export const reviewAuditObservation = async (flagId: string): Promise<ObservationListResponseItem | null> =>
  auditThreatPipeline.reviewObservation(flagId);

export const createAuditActionInformation = (request: Request, responseStatusCode: number, durationMs: number): AuditActionInformation => ({
  method: request.method,
  endpoint: request.originalUrl.split("?")[0] || request.baseUrl || request.url || "/",
  route: request.route?.path ? `${request.baseUrl}${request.route.path}` : request.originalUrl.split("?")[0] || request.url || "/",
  statusCode: responseStatusCode,
  summary: `${request.method} ${request.originalUrl.split("?")[0] || request.url || "/"} -> ${responseStatusCode}`,
  durationMs: Math.max(0, Number(durationMs.toFixed(3))),
  userAgent: typeof request.headers["user-agent"] === "string" ? truncateString(request.headers["user-agent"]) : undefined,
  sourceIp: request.ip || request.socket.remoteAddress || undefined,
  query: sanitizeValue(request.query),
  payloadSnippet: sanitizeValue(request.body),
  responseCategory: categorizeStatusCode(responseStatusCode),
  validationFailure: responseStatusCode === 400,
});

/**
 * Return paginated audit logs for admin UI.
 */
export const getAuditLogs = async (query: { page?: number; limit?: number } = {}) => {
  try {
    const prisma = getPrismaClient();
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(200, Math.max(1, Number(query.limit ?? 20)));

    const totalItems = await prisma.auditLog.count();
    const logs = await prisma.auditLog.findMany({
      orderBy: { timestamp: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: logs,
      page,
      limit,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / limit)),
    };
  } catch (error) {
    console.warn("Failed to load audit logs:", error instanceof Error ? error.message : String(error));
    return { data: [], page: 1, limit: 20, totalItems: 0, totalPages: 1 };
  }
};


