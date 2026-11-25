-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN "managerId" TEXT;

-- CreateIndex
CREATE INDEX "ApiKey_managerId_idx" ON "ApiKey"("managerId");

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "managerId" TEXT,
    "defaultAgentId" TEXT,
    "allowedAgentIds" TEXT NOT NULL DEFAULT '[]',
    "connectionType" TEXT NOT NULL DEFAULT 'BOTH',
    "direction" TEXT NOT NULL DEFAULT 'BIDIRECTIONAL',
    "baseUrl" TEXT,
    "authType" TEXT NOT NULL DEFAULT 'API_KEY',
    "credentialsEnc" TEXT,
    "fieldMappings" TEXT NOT NULL DEFAULT '[]',
    "conflictPolicy" TEXT NOT NULL DEFAULT 'NEWEST_WINS',
    "syncIntervalMinutes" INTEGER,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" DATETIME,
    "lastSyncStatus" TEXT,
    "lastError" TEXT,
    "inboundKeyHash" TEXT,
    "inboundKeyPrefix" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IntegrationPendingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "integrationId" TEXT,
    "payload" TEXT NOT NULL,
    "externalId" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedClientId" TEXT,
    "assignedById" TEXT,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntegrationPendingItem_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntegrationSyncRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "integrationId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    CONSTRAINT "IntegrationSyncRun_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntegrationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "integrationId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "action" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "meta" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IntegrationLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IntegrationExternalId" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "integrationId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "lastRemoteAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IntegrationExternalId_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Integration_active_syncEnabled_idx" ON "Integration"("active", "syncEnabled");

-- CreateIndex
CREATE INDEX "Integration_managerId_idx" ON "Integration"("managerId");

-- CreateIndex
CREATE INDEX "IntegrationPendingItem_status_createdAt_idx" ON "IntegrationPendingItem"("status", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrationPendingItem_integrationId_idx" ON "IntegrationPendingItem"("integrationId");

-- CreateIndex
CREATE INDEX "IntegrationSyncRun_integrationId_startedAt_idx" ON "IntegrationSyncRun"("integrationId", "startedAt");

-- CreateIndex
CREATE INDEX "IntegrationLog_integrationId_createdAt_idx" ON "IntegrationLog"("integrationId", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrationExternalId_clientId_idx" ON "IntegrationExternalId"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationExternalId_integrationId_externalId_key" ON "IntegrationExternalId"("integrationId", "externalId");
