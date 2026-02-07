-- Add contract window and deadline fields to Project
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "contractStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "contractEnd" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "deadlineAt" TIMESTAMP(3);

-- Optional indexes for filtering
CREATE INDEX IF NOT EXISTS "Project_contractStart_idx" ON "Project"("contractStart");
CREATE INDEX IF NOT EXISTS "Project_contractEnd_idx" ON "Project"("contractEnd");
CREATE INDEX IF NOT EXISTS "Project_deadlineAt_idx" ON "Project"("deadlineAt");
