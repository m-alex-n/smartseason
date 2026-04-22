const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 30_000,
    query_timeout: 30_000,
    max: 3,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const adminEmail = "admin@smartseason.local";
  const agentEmail = "agent@smartseason.local";

  const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
  const agentPasswordHash = await bcrypt.hash("Agent123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", passwordHash: adminPasswordHash },
    create: { email: adminEmail, role: "ADMIN", passwordHash: adminPasswordHash },
  });

  const agent = await prisma.user.upsert({
    where: { email: agentEmail },
    update: { role: "AGENT", passwordHash: agentPasswordHash },
    create: { email: agentEmail, role: "AGENT", passwordHash: agentPasswordHash },
  });

  const fieldCount = await prisma.field.count();
  if (fieldCount === 0) {
    const today = new Date();
    const daysAgo = (n) => new Date(today.getTime() - n * 24 * 60 * 60 * 1000);

    const field1 = await prisma.field.create({
      data: {
        name: "North Plot",
        cropType: "Maize",
        plantingDate: daysAgo(10),
        currentStage: "PLANTED",
      },
    });

    const field2 = await prisma.field.create({
      data: {
        name: "River Field",
        cropType: "Beans",
        plantingDate: daysAgo(45),
        currentStage: "GROWING",
      },
    });

    const field3 = await prisma.field.create({
      data: {
        name: "Hill Terrace",
        cropType: "Tomatoes",
        plantingDate: daysAgo(95),
        currentStage: "READY",
      },
    });

    await prisma.fieldAssignment.createMany({
      data: [
        { userId: agent.id, fieldId: field1.id },
        { userId: agent.id, fieldId: field2.id },
      ],
      skipDuplicates: true,
    });

    await prisma.fieldUpdate.createMany({
      data: [
        { fieldId: field1.id, agentId: agent.id, stage: "PLANTED", notes: "Seedlings emerging well." },
        { fieldId: field2.id, agentId: agent.id, stage: "GROWING", notes: "Some minor pest pressure observed." },
        { fieldId: field3.id, agentId: admin.id, stage: "READY", notes: "Ready window approaching; plan harvest." }
      ],
    });
  }

  await prisma.$disconnect();
  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

