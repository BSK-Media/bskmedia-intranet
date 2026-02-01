-- Add optional contact fields to Client
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "contactName" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
