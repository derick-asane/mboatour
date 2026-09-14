-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "refundRef" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);
