-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('MEMBER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "SiteVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "TouristicSite" ADD COLUMN     "verification" "SiteVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "verificationNote" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "platformRole" "PlatformRole" NOT NULL DEFAULT 'MEMBER';

-- CreateIndex
CREATE INDEX "TouristicSite_verification_idx" ON "TouristicSite"("verification");

-- AddForeignKey
ALTER TABLE "TouristicSite" ADD CONSTRAINT "TouristicSite_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
