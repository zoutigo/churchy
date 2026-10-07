/*
  Les anciens rôles sont convertis, rien n'est perdu :
  PARISH_ADMIN -> administrateur ; PREPARER -> paroissien + Préparateur + Rédacteur d'annonces
  (il écrivait aussi les annonces) ; READER -> paroissien + Lecteur ; VIEWER -> paroissien.
*/
-- CreateEnum
CREATE TYPE "ParishStatus" AS ENUM ('FAITHFUL', 'PARISHIONER', 'PARISH_ADMIN');

-- CreateEnum
CREATE TYPE "ParishDuty" AS ENUM ('PREPARER', 'READER', 'ANNOUNCER');

-- CreateEnum
CREATE TYPE "ContentVisibility" AS ENUM ('PUBLIC', 'MEMBERS');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC';

-- AlterTable
ALTER TABLE "ParishMember" ADD COLUMN     "duties" "ParishDuty"[],
ADD COLUMN     "status" "ParishStatus" NOT NULL DEFAULT 'FAITHFUL';

UPDATE "ParishMember" SET "duties" = ARRAY[]::"ParishDuty"[];
UPDATE "ParishMember" SET "status" = 'PARISH_ADMIN' WHERE "role" = 'PARISH_ADMIN';
UPDATE "ParishMember" SET "status" = 'PARISHIONER' WHERE "role" <> 'PARISH_ADMIN';
UPDATE "ParishMember" SET "duties" = ARRAY['PREPARER','ANNOUNCER']::"ParishDuty"[] WHERE "role" = 'PREPARER';
UPDATE "ParishMember" SET "duties" = ARRAY['READER']::"ParishDuty"[] WHERE "role" = 'READER';

ALTER TABLE "ParishMember" DROP COLUMN "role";

-- DropEnum
DROP TYPE "ParishRole";
