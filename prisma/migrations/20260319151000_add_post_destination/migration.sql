CREATE TYPE "PostDestination" AS ENUM ('SYSTEM', 'X', 'BLUESKY');

ALTER TABLE "Post"
ADD COLUMN "destination" "PostDestination" NOT NULL DEFAULT 'SYSTEM';
