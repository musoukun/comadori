-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "busyImportedAt" TIMESTAMP(3),
ADD COLUMN     "busyImportedUntil" TIMESTAMP(3),
ADD COLUMN     "feedToken" TEXT;

-- CreateTable
CREATE TABLE "ImportedBusy" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportedBusy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportedBusy_ownerId_startAt_idx" ON "ImportedBusy"("ownerId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_feedToken_key" ON "Owner"("feedToken");

-- AddForeignKey
ALTER TABLE "ImportedBusy" ADD CONSTRAINT "ImportedBusy_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
