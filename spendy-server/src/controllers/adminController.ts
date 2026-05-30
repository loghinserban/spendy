import { Request, Response } from "express";
import { getAuditObservationList, reviewAuditObservation, getAuditLogs as serviceGetAuditLogs } from "../services/auditService";

export const getObservationList = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = {
      page: parsePositiveInt(req.query.page, 1, 1_000_000),
      limit: parsePositiveInt(req.query.limit, 20, 100),
      historyLimit: parsePositiveInt(req.query.historyLimit, 10, 25),
      ...(parseObservationStatus(req.query.status) ? { status: parseObservationStatus(req.query.status)! } : {}),
      ...(parseOptionalInteger(req.query.minSeverity) !== undefined
        ? { minSeverity: parseOptionalInteger(req.query.minSeverity)! }
        : {}),
      ...(parseOptionalInteger(req.query.maxSeverity) !== undefined
        ? { maxSeverity: parseOptionalInteger(req.query.maxSeverity)! }
        : {}),
    };

    const observationList = await getAuditObservationList(query);

    res.status(200).json({
      ...observationList,
    });
  } catch (error) {
    console.error("getObservationList error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const reviewObservation = async (req: Request, res: Response): Promise<void> => {
  try {
    const flagId = parseIdentifier(req.params.flagId);
    if (!flagId) {
      res.status(400).json({ message: "Invalid flag id." });
      return;
    }

    const reviewed = await reviewAuditObservation(flagId);
    if (!reviewed) {
      res.status(404).json({ message: "Observation flag not found." });
      return;
    }

    res.status(200).json({ data: reviewed });
  } catch (error) {
    console.error("reviewObservation error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = typeof req.query.page === "string" ? Number(req.query.page) : parseInt(String(req.query.page ?? "1"), 10);
    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : parseInt(String(req.query.limit ?? "20"), 10);

    const result = await serviceGetAuditLogs({ page: Number.isFinite(page) && page > 0 ? page : 1, limit: Number.isFinite(limit) && limit > 0 ? limit : 20 });

    res.status(200).json(result);
  } catch (error) {
    console.error("getAuditLogs error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const parsePositiveInt = (value: unknown, fallback: number, max: number): number => {
  if (value === undefined) {
    return fallback;
  }

  const parsed = typeof value === "string" ? Number(value) : Array.isArray(value) ? Number(value[0]) : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
};

const parseOptionalInteger = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = typeof value === "string" ? Number(value) : Array.isArray(value) ? Number(value[0]) : Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
};

const parseObservationStatus = (value: unknown): "ACTIVE" | "REVIEWED" | "ALL" | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized === "ACTIVE" || normalized === "REVIEWED" || normalized === "ALL") {
    return normalized;
  }

  return undefined;
};

const parseIdentifier = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};



