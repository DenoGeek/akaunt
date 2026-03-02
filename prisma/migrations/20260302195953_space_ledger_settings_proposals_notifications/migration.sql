-- CreateEnum
CREATE TYPE "SpaceSettingsProposalStatus" AS ENUM ('PENDING', 'APPLIED', 'CANCELLED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "LedgerSettlementProposalStatus" AS ENUM ('PENDING', 'APPLIED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('FORGIVENESS_VOTE_NEEDED', 'SETTLEMENT_CONFIRM_NEEDED', 'SETTINGS_VOTE_NEEDED', 'TASK_COMPLETED_BY_MEMBER', 'TASK_FINED_OR_POINTS_LOST');

-- CreateEnum
CREATE TYPE "LedgerMode" AS ENUM ('STAKE', 'LEDGER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LedgerEntryType" ADD VALUE 'FINE';
ALTER TYPE "LedgerEntryType" ADD VALUE 'FINE_SETTLEMENT';

-- AlterTable
ALTER TABLE "space_rules" ADD COLUMN     "currency_symbol" TEXT NOT NULL DEFAULT '$',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Africa/Nairobi',
ADD COLUMN     "use_ledger_for_fines" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "task_templates" ADD COLUMN     "ledger_mode_override" "LedgerMode";

-- CreateTable
CREATE TABLE "space_settings_proposals" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "status" "SpaceSettingsProposalStatus" NOT NULL DEFAULT 'PENDING',
    "settings_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "space_settings_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_settings_votes" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vote" "ForgivenessVoteValue" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_settings_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_settlement_proposals" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "target_user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT,
    "status" "LedgerSettlementProposalStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "applied_at" TIMESTAMP(3),

    CONSTRAINT "ledger_settlement_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_settlement_confirmations" (
    "id" TEXT NOT NULL,
    "proposal_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_settlement_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "space_id" TEXT,
    "related_id" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "space_settings_votes_proposal_id_user_id_key" ON "space_settings_votes"("proposal_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_settlement_confirmations_proposal_id_user_id_key" ON "ledger_settlement_confirmations"("proposal_id", "user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- AddForeignKey
ALTER TABLE "space_settings_proposals" ADD CONSTRAINT "space_settings_proposals_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_settings_proposals" ADD CONSTRAINT "space_settings_proposals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_settings_votes" ADD CONSTRAINT "space_settings_votes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "space_settings_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_settings_votes" ADD CONSTRAINT "space_settings_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_settlement_proposals" ADD CONSTRAINT "ledger_settlement_proposals_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_settlement_proposals" ADD CONSTRAINT "ledger_settlement_proposals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_settlement_proposals" ADD CONSTRAINT "ledger_settlement_proposals_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_settlement_confirmations" ADD CONSTRAINT "ledger_settlement_confirmations_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "ledger_settlement_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_settlement_confirmations" ADD CONSTRAINT "ledger_settlement_confirmations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
