"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserByClerkId } from "@/lib/auth";
import { stakeLock, stakeReturn, getBalance } from "@/lib/ledger";
import { z } from "zod";
import { startOfDay, endOfDay, addDays, isBefore, startOfWeek, endOfWeek, addWeeks } from "date-fns";

const createTaskSchema = z.object({
  spaceId: z.string().uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  recurrenceType: z.enum(["DAILY", "WEEKLY"]),
  weekday: z.number().int().min(0).max(6).optional(),
  stake: z.number().int().min(1),
});

export type CreateTaskResult =
  | { ok: true; templateId: string }
  | { ok: false; error: string };

export async function createTaskTemplate(formData: FormData): Promise<CreateTaskResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const user = await getUserByClerkId(userId);
  if (!user) return { ok: false, error: "User not found" };

  const parsed = createTaskSchema.safeParse({
    spaceId: formData.get("spaceId"),
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    recurrenceType: formData.get("recurrenceType") ?? "DAILY",
    weekday: formData.get("weekday") !== null ? Number(formData.get("weekday")) : undefined,
    stake: Number(formData.get("stake")) || 1,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.message };

  const { spaceId, title, description, recurrenceType, weekday, stake } = parsed.data;

  const member = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId: user.id } },
  });
  if (!member) return { ok: false, error: "Not a member of this space" };

  const balance = await getBalance(user.id);
  if (balance < stake) return { ok: false, error: "Insufficient balance" };

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    include: { rules: true },
  });
  if (!space?.rules) return { ok: false, error: "Space not found" };
  if (stake < space.rules.minStake) return { ok: false, error: `Minimum stake is ${space.rules.minStake}` };

  const now = new Date();
  const template = await prisma.taskTemplate.create({
    data: {
      spaceId,
      createdById: user.id,
      title,
      description: description ?? null,
      recurrenceType,
      weekday: recurrenceType === "WEEKLY" ? weekday : null,
      defaultStake: stake,
    },
  });

  const instancesToCreate: { dueAt: Date; userId: string }[] = [];
  if (recurrenceType === "DAILY") {
    instancesToCreate.push({ dueAt: startOfDay(now), userId: user.id });
  } else {
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const targetWeekday = weekday ?? 0;
    let d = addDays(weekStart, targetWeekday);
    if (isBefore(d, now)) d = addWeeks(d, 1);
    instancesToCreate.push({ dueAt: d, userId: user.id });
  }

  for (const { dueAt, userId } of instancesToCreate) {
    const instance = await prisma.taskInstance.create({
      data: {
        taskTemplateId: template.id,
        spaceId,
        userId,
        title,
        description: description ?? null,
        dueAt,
        stakeAmount: stake,
      },
    });
    const lockResult = await stakeLock({
      userId,
      amount: stake,
      spaceId,
      taskInstanceId: instance.id,
    });
    if (!lockResult.ok) {
      await prisma.taskInstance.delete({ where: { id: instance.id } });
      await prisma.taskTemplate.update({
        where: { id: template.id },
        data: { active: false },
      });
      return { ok: false, error: lockResult.error };
    }
  }

  revalidatePath(`/dashboard/spaces/${spaceId}`);
  return { ok: true, templateId: template.id };
}

export async function completeTaskAction(taskInstanceId: string): Promise<void> {
  await completeTask(taskInstanceId);
}

export async function completeTask(taskInstanceId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };

  const user = await getUserByClerkId(userId);
  if (!user) return { ok: false, error: "User not found" };

  const instance = await prisma.taskInstance.findUnique({
    where: { id: taskInstanceId },
  });
  if (!instance) return { ok: false, error: "Task not found" };
  if (instance.userId !== user.id) return { ok: false, error: "Not your task" };
  if (instance.status !== "PENDING") return { ok: false, error: "Task already completed or missed" };

  const now = new Date();
  const rules = await prisma.spaceRules.findUnique({
    where: { spaceId: instance.spaceId },
  });
  const graceMs = (rules?.graceMinutes ?? 0) * 60 * 1000;
  if (new Date(instance.dueAt).getTime() + graceMs < now.getTime()) {
    return { ok: false, error: "Deadline passed" };
  }

  await prisma.taskInstance.update({
    where: { id: taskInstanceId },
    data: { status: "COMPLETED", completedAt: now },
  });
  await stakeReturn({
    userId: user.id,
    amount: instance.stakeAmount,
    spaceId: instance.spaceId,
    taskInstanceId,
  });

  revalidatePath(`/dashboard/spaces/${instance.spaceId}`);
  return { ok: true };
}

const todayTaskRowSchema = z.object({ title: z.string().min(1).max(500), stake: z.number().int().min(1) });
const weekTaskRowSchema = z.object({
  title: z.string().min(1).max(500),
  stake: z.number().int().min(1),
  day: z.number().int().min(0).max(6).optional(),
});

export type CreateTodayBatchResult = { ok: true } | { ok: false; error: string };
export type CreateWeekBatchResult = { ok: true } | { ok: false; error: string };

export async function createTodayTasksBatch(
  spaceId: string,
  rows: { title: string; stake: number }[]
): Promise<CreateTodayBatchResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };
  const user = await getUserByClerkId(userId);
  if (!user) return { ok: false, error: "User not found" };

  const member = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId: user.id } },
  });
  if (!member) return { ok: false, error: "Not a member of this space" };

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    include: { rules: true },
  });
  if (!space?.rules) return { ok: false, error: "Space not found" };

  const minStake = space.rules.minStake;
  const parsed = z.array(todayTaskRowSchema).safeParse(rows);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const valid = parsed.data.filter((r) => r.title.trim().length > 0);
  if (valid.length === 0) return { ok: false, error: "Add at least one task with a title" };

  for (const r of valid) {
    if (r.stake < minStake) return { ok: false, error: `Minimum stake is ${minStake} coins` };
  }

  const totalStake = valid.reduce((s, r) => s + r.stake, 0);
  const balance = await getBalance(user.id);
  if (balance < totalStake) return { ok: false, error: "Insufficient balance" };

  const now = new Date();
  const dueAt = endOfDay(now);

  for (const r of valid) {
    const instance = await prisma.taskInstance.create({
      data: {
        spaceId,
        userId: user.id,
        title: r.title.trim(),
        dueAt,
        stakeAmount: r.stake,
      },
    });
    const lockResult = await stakeLock({
      userId: user.id,
      amount: r.stake,
      spaceId,
      taskInstanceId: instance.id,
    });
    if (!lockResult.ok) {
      await prisma.taskInstance.delete({ where: { id: instance.id } });
      return { ok: false, error: lockResult.error };
    }
  }

  revalidatePath(`/dashboard/spaces/${spaceId}`);
  return { ok: true };
}

export async function createWeekTasksBatch(
  spaceId: string,
  rows: { title: string; stake: number; day?: number }[]
): Promise<CreateWeekBatchResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Not authenticated" };
  const user = await getUserByClerkId(userId);
  if (!user) return { ok: false, error: "User not found" };

  const member = await prisma.spaceMember.findUnique({
    where: { spaceId_userId: { spaceId, userId: user.id } },
  });
  if (!member) return { ok: false, error: "Not a member of this space" };

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    include: { rules: true },
  });
  if (!space?.rules) return { ok: false, error: "Space not found" };

  const minStake = space.rules.minStake;
  const parsed = z.array(weekTaskRowSchema).safeParse(rows);
  if (!parsed.success) return { ok: false, error: parsed.error.message };
  const valid = parsed.data.filter((r) => r.title.trim().length > 0);
  if (valid.length === 0) return { ok: false, error: "Add at least one task with a title" };

  for (const r of valid) {
    if (r.stake < minStake) return { ok: false, error: `Minimum stake is ${minStake} coins` };
  }

  const totalStake = valid.reduce((s, r) => s + r.stake, 0);
  const balance = await getBalance(user.id);
  if (balance < totalStake) return { ok: false, error: "Insufficient balance" };

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  for (const r of valid) {
    const dueAt =
      r.day !== undefined
        ? endOfDay(addDays(weekStart, r.day))
        : weekEnd;
    const instance = await prisma.taskInstance.create({
      data: {
        spaceId,
        userId: user.id,
        title: r.title.trim(),
        dueAt,
        stakeAmount: r.stake,
      },
    });
    const lockResult = await stakeLock({
      userId: user.id,
      amount: r.stake,
      spaceId,
      taskInstanceId: instance.id,
    });
    if (!lockResult.ok) {
      await prisma.taskInstance.delete({ where: { id: instance.id } });
      return { ok: false, error: lockResult.error };
    }
  }

  revalidatePath(`/dashboard/spaces/${spaceId}`);
  return { ok: true };
}
