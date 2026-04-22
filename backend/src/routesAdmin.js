const express = require("express");
const { z } = require("zod");
const { getPrisma } = require("./db");
const { requireAuth, requireRole } = require("./auth");

const router = express.Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get("/users", async (req, res) => {
  const prisma = getPrisma();
  const role = req.query.role;
  const where = role ? { role } : {};
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, role: true, createdAt: true },
  });
  return res.json({ users });
});

router.post("/fields/:fieldId/assign", async (req, res) => {
  const parsed = z
    .object({
      agentId: z.string().min(1),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const prisma = getPrisma();
  const fieldId = req.params.fieldId;

  const agent = await prisma.user.findUnique({ where: { id: parsed.data.agentId } });
  if (!agent || agent.role !== "AGENT") return res.status(400).json({ error: "Invalid agentId" });

  await prisma.fieldAssignment.upsert({
    where: { userId_fieldId: { userId: parsed.data.agentId, fieldId } },
    update: {},
    create: { userId: parsed.data.agentId, fieldId },
  });

  return res.json({ ok: true });
});

router.delete("/fields/:fieldId/assign/:agentId", async (req, res) => {
  const prisma = getPrisma();
  await prisma.fieldAssignment.delete({
    where: { userId_fieldId: { userId: req.params.agentId, fieldId: req.params.fieldId } },
  });
  return res.json({ ok: true });
});

module.exports = { adminRouter: router };

