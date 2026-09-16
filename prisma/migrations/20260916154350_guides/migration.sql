-- CreateEnum
CREATE TYPE "GuideStatus" AS ENUM ('DRAFT', 'PENDING', 'VERIFIED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EndorsementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "SitePermission" ADD VALUE 'MANAGE_GUIDES';

-- CreateTable
CREATE TABLE "GuideProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "languages" TEXT[],
    "city" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "photoUrl" TEXT,
    "hourlyRateCents" INTEGER,
    "dailyRateCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "yearsExperience" INTEGER,
    "status" "GuideStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewNote" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideEndorsement" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "status" "EndorsementStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuideEndorsement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuideProfile_userId_key" ON "GuideProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GuideProfile_slug_key" ON "GuideProfile"("slug");

-- CreateIndex
CREATE INDEX "GuideProfile_status_idx" ON "GuideProfile"("status");

-- CreateIndex
CREATE INDEX "GuideProfile_city_idx" ON "GuideProfile"("city");

-- CreateIndex
CREATE INDEX "GuideEndorsement_siteId_status_idx" ON "GuideEndorsement"("siteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GuideEndorsement_guideId_siteId_key" ON "GuideEndorsement"("guideId", "siteId");

-- AddForeignKey
ALTER TABLE "GuideProfile" ADD CONSTRAINT "GuideProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideProfile" ADD CONSTRAINT "GuideProfile_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideEndorsement" ADD CONSTRAINT "GuideEndorsement_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "GuideProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideEndorsement" ADD CONSTRAINT "GuideEndorsement_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "TouristicSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideEndorsement" ADD CONSTRAINT "GuideEndorsement_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
