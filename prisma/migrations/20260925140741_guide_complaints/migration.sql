-- CreateEnum
CREATE TYPE "ComplaintReason" AS ENUM ('CONDUCT', 'SAFETY', 'MONEY', 'NO_SHOW', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ComplaintOutcome" AS ENUM ('NO_ACTION', 'WARNED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "GuideComplaint" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingId" TEXT,
    "reason" "ComplaintReason" NOT NULL,
    "body" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "outcome" "ComplaintOutcome",
    "resolution" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "GuideComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuideComplaint_status_createdAt_idx" ON "GuideComplaint"("status", "createdAt");

-- CreateIndex
CREATE INDEX "GuideComplaint_guideId_idx" ON "GuideComplaint"("guideId");

-- CreateIndex
CREATE INDEX "GuideComplaint_userId_idx" ON "GuideComplaint"("userId");

-- AddForeignKey
ALTER TABLE "GuideComplaint" ADD CONSTRAINT "GuideComplaint_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "GuideProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideComplaint" ADD CONSTRAINT "GuideComplaint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideComplaint" ADD CONSTRAINT "GuideComplaint_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "GuideBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideComplaint" ADD CONSTRAINT "GuideComplaint_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
