import { PrismaClient, BillingType, Cadence, ProjectStatus, Role, BonusType, ConversationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function monthStr(d: Date) {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
}

async function main() {
  console.log("Seeding...");

  // Clear (dev)
  await prisma.messageRead.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.employeeGoal.deleteMany();
  await prisma.bonus.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      name: "Bartek Składánek",
      email: "b.skladanek@bskmedia.pl",
      passwordHash: await bcrypt.hash("C3bee3ae!@#$", 10),
      role: Role.ADMIN,
      hourlyRateDefault: 0,
    },
  });

  const emp1 = await prisma.user.create({
    data: {
      name: "Olaf Tomaszek",
      email: "o.tomaszek@bskmedia.pl",
      passwordHash: await bcrypt.hash("Olaf123!", 10),
      role: Role.EMPLOYEE,
      hourlyRateDefault: 65,
    },
  });

  const emp2 = await prisma.user.create({
    data: {
      name: "Ewa Kowalska",
      email: "e.kowalska@bskmedia.pl",
      passwordHash: await bcrypt.hash("Ewa123!!", 10),
      role: Role.EMPLOYEE,
      hourlyRateDefault: 80,
    },
  });

  const clientA = await prisma.client.create({ data: { name: "Klient Alfa Sp. z o.o." } });
  const clientB = await prisma.client.create({ data: { name: "Klient Beta SA" } });

  const now = new Date();
  const baseMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const project1 = await prisma.project.create({
    data: {
      clientId: clientA.id,
      name: "SEO Audyt + wdrożenia",
      billingType: BillingType.HOURLY,
      cadence: Cadence.RECURRING_MONTHLY,
      status: ProjectStatus.ACTIVE,
      hourlyClientRate: 140,
      tags: ["SEO", "Ads"],
    },
  });

  const project2 = await prisma.project.create({
    data: {
      clientId: clientA.id,
      name: "Landing page (One-off)",
      billingType: BillingType.FIXED,
      cadence: Cadence.ONE_OFF,
      status: ProjectStatus.DONE,
      fixedClientPrice: 2500,
      completedAt: new Date(baseMonth.getFullYear(), baseMonth.getMonth(), 6),
      tags: ["Dev", "Design"],
    },
  });

  const project3 = await prisma.project.create({
    data: {
      clientId: clientB.id,
      name: "Obsługa miesięczna (Retainer)",
      billingType: BillingType.MONTHLY_RETAINER,
      cadence: Cadence.RECURRING_MONTHLY,
      status: ProjectStatus.ACTIVE,
      monthlyRetainerAmount: 6000,
      tags: ["Ads", "Dev"],
    },
  });

  const project4 = await prisma.project.create({
    data: {
      clientId: clientB.id,
      name: "Kampania Performance",
      billingType: BillingType.HOURLY,
      cadence: Cadence.ONE_OFF,
      status: ProjectStatus.ACTIVE,
      hourlyClientRate: 180,
      tags: ["Ads"],
    },
  });

  await prisma.assignment.createMany({
    data: [
      { userId: emp1.id, projectId: project1.id, hourlyRateOverride: 70 },
      { userId: emp2.id, projectId: project1.id },
      { userId: emp1.id, projectId: project2.id, fixedPayoutAmount: 300 },
      { userId: emp2.id, projectId: project2.id, fixedPayoutAmount: 500 },
      { userId: emp1.id, projectId: project3.id, hourlyRateOverride: 75 },
      { userId: emp2.id, projectId: project3.id, hourlyRateOverride: 85 },
      { userId: emp1.id, projectId: project4.id, hourlyRateOverride: 80 },
    ],
  });

  const entries: any[] = [];
  for (let i = 1; i <= 12; i++) {
    entries.push({ userId: emp1.id, projectId: project1.id, date: new Date(baseMonth.getFullYear(), baseMonth.getMonth(), i), hours: 2 + (i % 3), note: "Prace SEO", status: i <= 8 ? "APPROVED" : "SUBMITTED" });
  }
  for (let i = 1; i <= 10; i++) {
    entries.push({ userId: emp2.id, projectId: project1.id, date: new Date(baseMonth.getFullYear(), baseMonth.getMonth(), i), hours: 1.5 + (i % 2), note: "Wdrożenia", status: i <= 7 ? "APPROVED" : "SUBMITTED" });
  }
  for (let i = 3; i <= 9; i++) {
    entries.push({ userId: emp1.id, projectId: project3.id, date: new Date(baseMonth.getFullYear(), baseMonth.getMonth(), i), hours: 3, note: "Obsługa retainer", status: "APPROVED" });
  }
  for (let i = 4; i <= 8; i++) {
    entries.push({ userId: emp2.id, projectId: project3.id, date: new Date(baseMonth.getFullYear(), baseMonth.getMonth(), i), hours: 2.5, note: "Dev/Ads", status: "APPROVED" });
  }

  await prisma.timeEntry.createMany({
    data: entries.map((e) => ({
      userId: e.userId,
      projectId: e.projectId,
      date: e.date,
      hours: e.hours,
      note: e.note,
      status: e.status,
      reviewedById: e.status === "APPROVED" ? admin.id : null,
      reviewedAt: e.status === "APPROVED" ? new Date() : null,
    })),
  });

  await prisma.bonus.createMany({
    data: [
      { userId: emp1.id, amount: 400, type: BonusType.ONE_OFF, note: "Premia za sprint" },
      { userId: emp2.id, amount: 300, type: BonusType.ONE_OFF, note: "Dodatkowa optymalizacja" },
      { userId: emp1.id, amount: 250, type: BonusType.MONTHLY, month: monthStr(baseMonth), note: "Premia miesięczna" },
    ],
  });

  await prisma.employeeGoal.createMany({
    data: [
      { userId: emp1.id, month: monthStr(baseMonth), targetHours: 160, bonusAmount: 500 },
      { userId: emp2.id, month: monthStr(baseMonth), targetHours: 150, bonusAmount: 400 },
    ],
  });

  // NotificationType enum in schema.prisma does not include "INFO".
  // Use a generic notification for the welcome message.
  await prisma.notification.create({
    data: { userId: emp1.id, type: "GENERIC", title: "Witaj!", body: "Masz nowe projekty i wpisy czasu do uzupełnienia." },
  });

  const general = await prisma.conversation.create({
    data: {
      type: ConversationType.GROUP,
      name: "Ogólny",
      participants: { createMany: { data: [{ userId: admin.id }, { userId: emp1.id }, { userId: emp2.id }] } },
    },
  });

  const direct1 = await prisma.conversation.create({
    data: {
      type: ConversationType.DIRECT,
      participants: { createMany: { data: [{ userId: admin.id }, { userId: emp1.id }] } },
    },
  });

  const direct2 = await prisma.conversation.create({
    data: {
      type: ConversationType.DIRECT,
      participants: { createMany: { data: [{ userId: emp1.id }, { userId: emp2.id }] } },
    },
  });

  const m1 = await prisma.message.create({
    data: { conversationId: general.id, senderId: admin.id, body: "Cześć wszystkim 👋 Startujemy z nowym intranetem." },
  });
  const m2 = await prisma.message.create({
    data: { conversationId: general.id, senderId: emp1.id, body: "Super! Uzupełnię dzisiaj godziny." },
  });
  const m3 = await prisma.message.create({
    data: { conversationId: direct1.id, senderId: admin.id, body: "Olaf, przypisz proszę priorytet do projektu SEO." },
  });
  const m4 = await prisma.message.create({
    data: { conversationId: direct2.id, senderId: emp2.id, body: "Hej Olaf, możesz zerknąć na brief kampanii?" },
  });

  await prisma.messageRead.createMany({
    data: [
      { messageId: m1.id, userId: admin.id },
      { messageId: m2.id, userId: emp1.id },
      { messageId: m3.id, userId: admin.id },
      { messageId: m4.id, userId: emp2.id },
    ],
  });

  await prisma.auditLog.create({
    // AuditAction enum doesn't include a dedicated SEED value; use OTHER for system seed events.
    data: { actorId: admin.id, action: "OTHER", entity: "SYSTEM", meta: { note: "Initial seed completed" } },
  });

  console.log("Seed done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
