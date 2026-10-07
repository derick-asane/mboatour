-- CreateEnum
CREATE TYPE "PlaceKind" AS ENUM ('SITE', 'HOTEL', 'RESTAURANT', 'TRANSPORT', 'TOUR_OPERATOR', 'SHOP', 'OTHER');

-- AlterTable
ALTER TABLE "TouristicSite" ADD COLUMN     "kind" "PlaceKind" NOT NULL DEFAULT 'SITE',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "whatsapp" TEXT;

-- CreateIndex
CREATE INDEX "TouristicSite_kind_published_verification_idx" ON "TouristicSite"("kind", "published", "verification");
