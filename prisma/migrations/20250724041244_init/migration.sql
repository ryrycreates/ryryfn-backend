-- CreateTable
CREATE TABLE "Asset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "credits" JSONB,
    "size" TEXT NOT NULL,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "previewImageUrl" TEXT,
    "downloadUrl" TEXT NOT NULL,
    "hasDownloadUrlOnRyRyFn" BOOLEAN NOT NULL DEFAULT true,
    "hasExternalDownloadUrl" BOOLEAN NOT NULL DEFAULT false,
    "fnSeasonIntroduced" INTEGER,
    "isAnExactCopyFromGameFiles" BOOLEAN NOT NULL DEFAULT true,
    "isRecreated" BOOLEAN NOT NULL DEFAULT false,
    "isRemixed" BOOLEAN NOT NULL DEFAULT false,
    "UEFNValidates" BOOLEAN NOT NULL DEFAULT false,
    "isInCreativeLegacy" BOOLEAN NOT NULL DEFAULT true,
    "childAssets" JSONB,
    "parentAssets" JSONB,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
