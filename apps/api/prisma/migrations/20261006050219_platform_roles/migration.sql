-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuthAuditEvent" ADD VALUE 'PLATFORM_ROLE_CHANGED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'ACCOUNT_SUSPENDED';
ALTER TYPE "AuthAuditEvent" ADD VALUE 'ACCOUNT_REINSTATED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'ADMIN';
ALTER TYPE "UserRole" ADD VALUE 'MODERATOR';

-- AlterTable
ALTER TABLE "AuthAuditLog" ADD COLUMN     "actorId" TEXT,
ADD COLUMN     "detail" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "suspendedAt" TIMESTAMP(3);
