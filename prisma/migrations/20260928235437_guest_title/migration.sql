-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "titleFromGuest" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "useGuestTitle" BOOLEAN NOT NULL DEFAULT false;
