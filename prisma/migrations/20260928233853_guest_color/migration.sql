-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "colorId";

-- CreateIndex
CREATE UNIQUE INDEX "Guest_ownerId_colorId_key" ON "Guest"("ownerId", "colorId");
