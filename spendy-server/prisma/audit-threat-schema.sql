-- PostgreSQL schema for the audit logging + active threat detection subsystem.
-- Tables are quoted to preserve the requested names.

CREATE TYPE "AuditGroup" AS ENUM ('ADMIN', 'USER');
CREATE TYPE "ObservationStatus" AS ENUM ('ACTIVE', 'REVIEWED');

CREATE TABLE IF NOT EXISTS "AuditLogs" (
  "LogID" TEXT PRIMARY KEY,
  "UserID" TEXT NOT NULL,
  "GroupID" "AuditGroup" NOT NULL,
  "ActionInformation" JSONB NOT NULL,
  "Timestamp" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "AuditLogs_UserID_fkey"
    FOREIGN KEY ("UserID") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AuditLogs_UserID_idx" ON "AuditLogs" ("UserID");
CREATE INDEX IF NOT EXISTS "AuditLogs_GroupID_idx" ON "AuditLogs" ("GroupID");
CREATE INDEX IF NOT EXISTS "AuditLogs_Timestamp_idx" ON "AuditLogs" ("Timestamp");

CREATE TABLE IF NOT EXISTS "ObservationList" (
  "FlagID" TEXT PRIMARY KEY,
  "UserID" TEXT NOT NULL UNIQUE,
  "Reason" TEXT NOT NULL,
  "SeverityLevel" INTEGER NOT NULL DEFAULT 1,
  "Status" "ObservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "FlaggedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ObservationList_UserID_fkey"
    FOREIGN KEY ("UserID") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ObservationList_Status_idx" ON "ObservationList" ("Status");
CREATE INDEX IF NOT EXISTS "ObservationList_SeverityLevel_idx" ON "ObservationList" ("SeverityLevel");
CREATE INDEX IF NOT EXISTS "ObservationList_FlaggedAt_idx" ON "ObservationList" ("FlaggedAt");

