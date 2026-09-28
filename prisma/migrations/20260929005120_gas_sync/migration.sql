-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "gasSyncedAt" TIMESTAMP(3),
ADD COLUMN     "gasToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Owner_gasToken_key" ON "Owner"("gasToken");
