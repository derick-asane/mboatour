-- CreateTable
CREATE TABLE "GuideMessage" (
    "id" TEXT NOT NULL,
    "guideBookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "deletedById" TEXT,

    CONSTRAINT "GuideMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuideMessage_guideBookingId_createdAt_idx" ON "GuideMessage"("guideBookingId", "createdAt");

-- AddForeignKey
ALTER TABLE "GuideMessage" ADD CONSTRAINT "GuideMessage_guideBookingId_fkey" FOREIGN KEY ("guideBookingId") REFERENCES "GuideBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideMessage" ADD CONSTRAINT "GuideMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideMessage" ADD CONSTRAINT "GuideMessage_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
