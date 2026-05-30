-- CreateEnum
CREATE TYPE "AuditGroup" AS ENUM ('ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "ObservationStatus" AS ENUM ('ACTIVE', 'REVIEWED');

-- CreateTable
CREATE TABLE "AuditLogs" (
    "LogID" TEXT NOT NULL,
    "UserID" TEXT NOT NULL,
    "GroupID" "AuditGroup" NOT NULL,
    "ActionInformation" JSONB NOT NULL,
    "Timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogs_pkey" PRIMARY KEY ("LogID")
);

-- CreateTable
CREATE TABLE "ObservationList" (
    "FlagID" TEXT NOT NULL,
    "UserID" TEXT NOT NULL,
    "Reason" TEXT NOT NULL,
    "SeverityLevel" INTEGER NOT NULL DEFAULT 1,
    "Status" "ObservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "FlaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ObservationList_pkey" PRIMARY KEY ("FlagID")
);

-- CreateIndex
CREATE INDEX "AuditLogs_UserID_idx" ON "AuditLogs"("UserID");

-- CreateIndex
CREATE INDEX "AuditLogs_GroupID_idx" ON "AuditLogs"("GroupID");

-- CreateIndex
CREATE INDEX "AuditLogs_Timestamp_idx" ON "AuditLogs"("Timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ObservationList_UserID_key" ON "ObservationList"("UserID");

-- CreateIndex
CREATE INDEX "ObservationList_Status_idx" ON "ObservationList"("Status");

-- CreateIndex
CREATE INDEX "ObservationList_SeverityLevel_idx" ON "ObservationList"("SeverityLevel");

-- CreateIndex
CREATE INDEX "ObservationList_FlaggedAt_idx" ON "ObservationList"("FlaggedAt");

-- AddForeignKey
ALTER TABLE "AuditLogs" ADD CONSTRAINT "AuditLogs_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObservationList" ADD CONSTRAINT "ObservationList_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

