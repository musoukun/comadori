-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_linkId_fkey";

-- DropForeignKey
ALTER TABLE "ShareLink" DROP CONSTRAINT "ShareLink_ownerId_fkey";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "guestEmail",
DROP COLUMN "holdTokenHash",
DROP COLUMN "linkId",
ADD COLUMN     "guestId" TEXT,
ALTER COLUMN "guestName" SET NOT NULL;

-- AlterTable
ALTER TABLE "Owner" ADD COLUMN     "slug" TEXT NOT NULL;

-- DropTable
DROP TABLE "ShareLink";

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "maskTitle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Guest_ownerId_email_key" ON "Guest"("ownerId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Owner_slug_key" ON "Owner"("slug");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
