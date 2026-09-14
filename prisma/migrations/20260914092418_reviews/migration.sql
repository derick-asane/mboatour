-- AlterTable
ALTER TABLE "TouristicSite" ADD COLUMN     "ratingAverage" DOUBLE PRECISION,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedById" TEXT,
    "hiddenAt" TIMESTAMP(3),
    "hiddenById" TEXT,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_siteId_createdAt_idx" ON "Review"("siteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_siteId_userId_key" ON "Review"("siteId", "userId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TouristicSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_hiddenById_fkey" FOREIGN KEY ("hiddenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_repliedById_fkey" FOREIGN KEY ("repliedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
