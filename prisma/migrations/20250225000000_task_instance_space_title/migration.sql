-- AlterTable task_instances: add spaceId, title, description; make taskTemplateId optional
ALTER TABLE "task_instances" ADD COLUMN "space_id" TEXT;
ALTER TABLE "task_instances" ADD COLUMN "title" TEXT;
ALTER TABLE "task_instances" ADD COLUMN "description" TEXT;

-- Backfill from task_templates
UPDATE "task_instances" ti
SET "space_id" = tt."space_id", "title" = tt."title", "description" = tt."description"
FROM "task_templates" tt
WHERE ti."task_template_id" = tt."id";

-- Ensure no nulls (fallback for any orphan rows)
UPDATE "task_instances" SET "space_id" = (SELECT "space_id" FROM "task_templates" WHERE "task_templates"."id" = "task_instances"."task_template_id" LIMIT 1) WHERE "space_id" IS NULL;
UPDATE "task_instances" SET "title" = (SELECT "title" FROM "task_templates" WHERE "task_templates"."id" = "task_instances"."task_template_id" LIMIT 1) WHERE "title" IS NULL;
UPDATE "task_instances" SET "title" = 'Task' WHERE "title" IS NULL;

-- Make columns non-nullable
ALTER TABLE "task_instances" ALTER COLUMN "space_id" SET NOT NULL;
ALTER TABLE "task_instances" ALTER COLUMN "title" SET NOT NULL;

-- Make task_template_id nullable
ALTER TABLE "task_instances" ALTER COLUMN "task_template_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "task_instances" ADD CONSTRAINT "task_instances_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "task_instances_space_id_idx" ON "task_instances"("space_id");
CREATE INDEX "task_instances_space_id_user_id_idx" ON "task_instances"("space_id", "user_id");
