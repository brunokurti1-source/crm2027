-- AlterTable
ALTER TABLE "Client" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "TextDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'COMMENT',
    "body" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TextDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TextDraft_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TextDraft_userId_clientId_idx" ON "TextDraft"("userId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "TextDraft_userId_clientId_kind_key" ON "TextDraft"("userId", "clientId", "kind");
