-- CreateTable
CREATE TABLE "FavoriteParish" (
    "userId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteParish_pkey" PRIMARY KEY ("userId","parishId")
);

-- CreateIndex
CREATE INDEX "FavoriteParish_userId_createdAt_idx" ON "FavoriteParish"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "FavoriteParish" ADD CONSTRAINT "FavoriteParish_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteParish" ADD CONSTRAINT "FavoriteParish_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
