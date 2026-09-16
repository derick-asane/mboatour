-- CreateEnum
CREATE TYPE "PaymentPayee" AS ENUM ('SITE', 'GUIDE');

-- CreateEnum
CREATE TYPE "GuideBookingStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "guideBookingId" TEXT,
ADD COLUMN     "payee" "PaymentPayee" NOT NULL DEFAULT 'SITE',
ADD COLUMN     "payeeRef" TEXT,
ALTER COLUMN "bookingId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "GuideBooking" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "partySize" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "status" "GuideBookingStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "responseNote" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideBookingSite" (
    "id" TEXT NOT NULL,
    "guideBookingId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,

    CONSTRAINT "GuideBookingSite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuideBooking_guideId_status_idx" ON "GuideBooking"("guideId", "status");

-- CreateIndex
CREATE INDEX "GuideBooking_userId_idx" ON "GuideBooking"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GuideBookingSite_guideBookingId_siteId_key" ON "GuideBookingSite"("guideBookingId", "siteId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_guideBookingId_key" ON "Payment"("guideBookingId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_guideBookingId_fkey" FOREIGN KEY ("guideBookingId") REFERENCES "GuideBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideBooking" ADD CONSTRAINT "GuideBooking_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "GuideProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideBooking" ADD CONSTRAINT "GuideBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideBookingSite" ADD CONSTRAINT "GuideBookingSite_guideBookingId_fkey" FOREIGN KEY ("guideBookingId") REFERENCES "GuideBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideBookingSite" ADD CONSTRAINT "GuideBookingSite_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TouristicSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

