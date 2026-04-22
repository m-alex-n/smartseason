const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { getPrisma } = require("./db");
const { signToken, requireAuth } = require("./auth");

const router = express.Router();

router.post("/login", async (req, res) => {
  const parsed = z
    .object({
      email: z.string().email(),
      password: z.string().min(1),
    })
    .safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken(user);
  return res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  return res.json({ id: user.id, email: user.email, role: user.role });
});

module.exports = { authRouter: router };

