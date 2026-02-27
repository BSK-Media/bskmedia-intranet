-- Add optional projectId to Bonus so bonuses can be attributed to a specific project.

ALTER TABLE "Bonus" ADD COLUMN IF NOT EXISTS "projectId" TEXT;

-- Keep it nullable for backwards compatibility; on project delete, keep bonus history.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Bonus_projectId_fkey'
  ) THEN
    ALTER TABLE "Bonus"
      ADD CONSTRAINT "Bonus_projectId_fkey"
      FOREIGN KEY ("projectId")
      REFERENCES "Project"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "Bonus_projectId_idx" ON "Bonus"("projectId");
