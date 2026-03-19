UPDATE "Post"
SET "destination" = 'X'::"PostDestination"
WHERE "destination" = 'SYSTEM'::"PostDestination"
  AND "status" IN ('POSTED', 'FAILED');
