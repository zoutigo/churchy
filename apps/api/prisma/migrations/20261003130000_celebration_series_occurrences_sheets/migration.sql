-- Séries de célébrations, dates (occurrences) et feuilles de préparation par date.
-- Les célébrations existantes deviennent chacune une série avec une date et une feuille ; l'identifiant
-- de la célébration est conservé pour la date et la feuille (les liens publics existants restent valables).

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('SCHEDULED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "Celebration" DROP CONSTRAINT "Celebration_templateId_fkey";

-- DropForeignKey
ALTER TABLE "CelebrationStep" DROP CONSTRAINT "CelebrationStep_celebrationId_fkey";

-- DropForeignKey
ALTER TABLE "CelebrationStep" DROP CONSTRAINT "CelebrationStep_templateStepId_fkey";

-- DropIndex
DROP INDEX "Celebration_parishId_date_idx";

-- AlterTable : colonnes ajoutées d'abord facultatives, remplies puis durcies
ALTER TABLE "Celebration"
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "defaultTemplateId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "internalNote" TEXT,
ADD COLUMN     "type" "CelebrationType";

ALTER TABLE "CelebrationStep"
ADD COLUMN     "key" TEXT,
ADD COLUMN     "sheetId" TEXT,
ALTER COLUMN "templateStepId" DROP NOT NULL;

ALTER TABLE "Parish" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris';

-- CreateTable
CREATE TABLE "CelebrationOccurrence" (
    "id" TEXT NOT NULL,
    "celebrationId" TEXT NOT NULL,
    "parishId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "internalNote" TEXT,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CelebrationOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreparationSheet" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "templateId" TEXT,
    "status" "CelebrationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreparationSheet_pkey" PRIMARY KEY ("id")
);

-- Données : fuseau de chaque paroisse selon son pays (Europe/Paris par défaut)
UPDATE "Parish" p SET "timezone" = tz.zone
FROM (VALUES
    ('Cameroun', 'Africa/Douala'),
    ('Afrique du Sud', 'Africa/Johannesburg'),
    ('Algérie', 'Africa/Algiers'),
    ('Allemagne', 'Europe/Berlin'),
    ('Angola', 'Africa/Luanda'),
    ('Belgique', 'Europe/Brussels'),
    ('Bénin', 'Africa/Porto-Novo'),
    ('Brésil', 'America/Sao_Paulo'),
    ('Burkina Faso', 'Africa/Ouagadougou'),
    ('Burundi', 'Africa/Bujumbura'),
    ('Canada', 'America/Toronto'),
    ('Centrafrique', 'Africa/Bangui'),
    ('Congo', 'Africa/Brazzaville'),
    ('Côte d''Ivoire', 'Africa/Abidjan'),
    ('Espagne', 'Europe/Madrid'),
    ('États-Unis', 'America/New_York'),
    ('France', 'Europe/Paris'),
    ('Gabon', 'Africa/Libreville'),
    ('Ghana', 'Africa/Accra'),
    ('Guinée', 'Africa/Conakry'),
    ('Guinée équatoriale', 'Africa/Malabo'),
    ('Italie', 'Europe/Rome'),
    ('Luxembourg', 'Europe/Luxembourg'),
    ('Mali', 'Africa/Bamako'),
    ('Maroc', 'Africa/Casablanca'),
    ('Niger', 'Africa/Niamey'),
    ('Nigeria', 'Africa/Lagos'),
    ('Pays-Bas', 'Europe/Amsterdam'),
    ('Portugal', 'Europe/Lisbon'),
    ('République démocratique du Congo', 'Africa/Kinshasa'),
    ('Royaume-Uni', 'Europe/London'),
    ('Rwanda', 'Africa/Kigali'),
    ('Sénégal', 'Africa/Dakar'),
    ('Suisse', 'Europe/Zurich'),
    ('Tchad', 'Africa/Ndjamena'),
    ('Togo', 'Africa/Lome'),
    ('Tunisie', 'Africa/Tunis')
) AS tz(country, zone)
WHERE p."country" = tz.country;

-- Données : chaque célébration devient une série…
UPDATE "Celebration" c SET
    "type" = t."type",
    "defaultTemplateId" = c."templateId",
    "announced" = c."announced" OR c."status" = 'PUBLISHED',
    "archivedAt" = CASE WHEN c."status" = 'ARCHIVED' THEN c."updatedAt" END
FROM "CelebrationTemplate" t
WHERE t."id" = c."templateId";

-- … avec une date (même identifiant) …
INSERT INTO "CelebrationOccurrence" ("id", "celebrationId", "parishId", "startsAt", "updatedAt")
SELECT "id", "id", "parishId", "date", CURRENT_TIMESTAMP FROM "Celebration";

-- … et une feuille (même identifiant) qui reprend le statut de publication.
INSERT INTO "PreparationSheet" ("id", "occurrenceId", "templateId", "status", "publishedAt", "updatedAt")
SELECT "id", "id", "templateId",
    CASE WHEN "publishedAt" IS NOT NULL THEN 'PUBLISHED'::"CelebrationStatus" ELSE 'DRAFT'::"CelebrationStatus" END,
    "publishedAt", CURRENT_TIMESTAMP
FROM "Celebration";

UPDATE "CelebrationStep" s SET "sheetId" = s."celebrationId", "key" = ts."key"
FROM "CelebrationTemplateStep" ts
WHERE ts."id" = s."templateStepId";

-- Durcissement
ALTER TABLE "Celebration" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "CelebrationStep" ALTER COLUMN "key" SET NOT NULL, ALTER COLUMN "sheetId" SET NOT NULL;

ALTER TABLE "Celebration" DROP COLUMN "date", DROP COLUMN "publishedAt", DROP COLUMN "status", DROP COLUMN "templateId";
ALTER TABLE "CelebrationStep" DROP COLUMN "celebrationId";

-- CreateIndex
CREATE INDEX "CelebrationOccurrence_parishId_startsAt_idx" ON "CelebrationOccurrence"("parishId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "CelebrationOccurrence_celebrationId_startsAt_key" ON "CelebrationOccurrence"("celebrationId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "PreparationSheet_occurrenceId_key" ON "PreparationSheet"("occurrenceId");

-- CreateIndex
CREATE INDEX "Celebration_parishId_announced_idx" ON "Celebration"("parishId", "announced");

-- CreateIndex
CREATE UNIQUE INDEX "CelebrationStep_sheetId_key_key" ON "CelebrationStep"("sheetId", "key");

-- AddForeignKey
ALTER TABLE "Celebration" ADD CONSTRAINT "Celebration_defaultTemplateId_fkey" FOREIGN KEY ("defaultTemplateId") REFERENCES "CelebrationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationOccurrence" ADD CONSTRAINT "CelebrationOccurrence_celebrationId_fkey" FOREIGN KEY ("celebrationId") REFERENCES "Celebration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationOccurrence" ADD CONSTRAINT "CelebrationOccurrence_parishId_fkey" FOREIGN KEY ("parishId") REFERENCES "Parish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparationSheet" ADD CONSTRAINT "PreparationSheet_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "CelebrationOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparationSheet" ADD CONSTRAINT "PreparationSheet_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CelebrationTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationStep" ADD CONSTRAINT "CelebrationStep_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "PreparationSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CelebrationStep" ADD CONSTRAINT "CelebrationStep_templateStepId_fkey" FOREIGN KEY ("templateStepId") REFERENCES "CelebrationTemplateStep"("id") ON DELETE SET NULL ON UPDATE CASCADE;

