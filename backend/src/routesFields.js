const express = require("express");
const { z } = require("zod");
const { getPrisma } = require("./db");
const { requireAuth } = require("./auth");
const { computeFieldStatus } = require("./status");

const router = express.Router();

function isStage(v) {
  return v === "PLANTED" || v === "GROWING" || v === "READY" || v === "HARVESTED";
}

async function canAccessField(prisma, auth, fieldId) {
  if (auth.role === "ADMIN") return true;
  const assignment = await prisma.fieldAssignment.findUnique({
    where: { userId_fieldId: { userId: auth.userId, fieldId } },
  });
  return Boolean(assignment);
}

router.use(requireAuth);

router.get("/", async (req, res) => {
  const prisma = getPrisma();

  const fields =
    req.auth.role === "ADMIN"
      ? await prisma.field.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            assignments: { include: { user: { select: { id: true, email: true, role: true } } } },
          },
        })
      : await prisma.field.findMany({
          orderBy: { createdAt: "desc" },
          where: { assignments: { some: { userId: req.auth.userId } } },
          include: {
            assignments: { include: { user: { select: { id: true, email: true, role: true } } } },
          },
        });

  const withStatus = fields.map((f) => ({
    ...f,
    status: computeFieldStatus(f),
  }));

  return res.json({ fields: withStatus });
});

router.post("/", async (req, res) => {
  if (req.auth.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

  const parsed = z
    .object({
      name: z.string().min(1),
      cropType: z.string().min(1),
      plantingDate: z.string().min(1),
      currentStage: z.string().refine(isStage),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const prisma = getPrisma();
  const field = await prisma.field.create({
    data: {
      name: parsed.data.name,
      cropType: parsed.data.cropType,
      plantingDate: new Date(parsed.data.plantingDate),
      currentStage: parsed.data.currentStage,
    },
  });

  return res.status(201).json({ field: { ...field, status: computeFieldStatus(field) } });
});

router.get("/:fieldId", async (req, res) => {
  const prisma = getPrisma();
  const fieldId = req.params.fieldId;
  const allowed = await canAccessField(prisma, req.auth, fieldId);
  if (!allowed) return res.status(404).json({ error: "Not found" });

  const field = await prisma.field.findUnique({
    where: { id: fieldId },
    include: {
      assignments: { include: { user: { select: { id: true, email: true, role: true } } } },
      updates: {
        orderBy: { createdAt: "desc" },
        include: { agent: { select: { id: true, email: true, role: true } } },
      },
    },
  });
  if (!field) return res.status(404).json({ error: "Not found" });

  return res.json({ field: { ...field, status: computeFieldStatus(field) } });
});

router.post("/:fieldId/updates", async (req, res) => {
  const parsed = z
    .object({
      stage: z.string().refine(isStage),
      notes: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const prisma = getPrisma();
  const fieldId = req.params.fieldId;
  const allowed = await canAccessField(prisma, req.auth, fieldId);
  if (!allowed) return res.status(404).json({ error: "Not found" });

  if (req.auth.role !== "ADMIN") {
    // Agents must be assigned to post updates (already enforced by canAccessField).
    // Keep it explicit for readability.
  }

  const update = await prisma.$transaction(async (tx) => {
    const created = await tx.fieldUpdate.create({
      data: {
        fieldId,
        agentId: req.auth.userId,
        stage: parsed.data.stage,
        notes: parsed.data.notes || null,
      },
    });
    await tx.field.update({ where: { id: fieldId }, data: { currentStage: parsed.data.stage } });
    return created;
  });

  return res.status(201).json({ update });
});

module.exports = { fieldsRouter: router };

