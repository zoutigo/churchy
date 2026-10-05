-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "AuthRateLimitPurpose" AS ENUM ('PASSWORD_LOGIN', 'PHONE_LOGIN', 'ACCOUNT_PROOF');

-- CreateEnum
CREATE TYPE "AuthAuditEvent" AS ENUM ('REGISTER', 'LOGIN_PASSWORD', 'LOGIN_PHONE', 'LOGIN_GOOGLE', 'PIN_SET', 'PIN_CHANGED', 'PIN_RESET_REQUESTED', 'PIN_RESET_ISSUED_BY_ADMIN', 'PIN_RESET_COMPLETED', 'PASSWORD_SET', 'EMAIL_ADDED', 'GOOGLE_LINKED', 'GOOGLE_UNLINKED', 'ACCOUNT_TAKEOVER_CLEARED');

-- CreateEnum
CREATE TYPE "AuthAuditStatus" AS ENUM ('SUCCESS', 'FAILURE', 'BLOCKED');

-- AlterEnum
ALTER TYPE "AuthTokenType" ADD VALUE 'PIN_RESET';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "UserPhoneCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPhoneCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAuthIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthRateLimit" (
    "id" TEXT NOT NULL,
    "purpose" "AuthRateLimitPurpose" NOT NULL,
    "keyHash" TEXT NOT NULL,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "blockedUntil" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "event" "AuthAuditEvent" NOT NULL,
    "status" "AuthAuditStatus" NOT NULL,
    "provider" "AuthProvider",
    "principal" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "reasonCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPhoneCredential_userId_key" ON "UserPhoneCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPhoneCredential_phoneE164_key" ON "UserPhoneCredential"("phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "UserAuthIdentity_provider_providerAccountId_key" ON "UserAuthIdentity"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAuthIdentity_userId_provider_key" ON "UserAuthIdentity"("userId", "provider");

-- CreateIndex
CREATE INDEX "AuthRateLimit_blockedUntil_idx" ON "AuthRateLimit"("blockedUntil");

-- CreateIndex
CREATE UNIQUE INDEX "AuthRateLimit_purpose_keyHash_key" ON "AuthRateLimit"("purpose", "keyHash");

-- CreateIndex
CREATE INDEX "AuthAuditLog_userId_idx" ON "AuthAuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuthAuditLog_event_status_createdAt_idx" ON "AuthAuditLog"("event", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "UserPhoneCredential" ADD CONSTRAINT "UserPhoneCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAuthIdentity" ADD CONSTRAINT "UserAuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAuditLog" ADD CONSTRAINT "AuthAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
