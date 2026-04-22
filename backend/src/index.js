const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");
const { authRouter } = require("./routesAuth");
const { fieldsRouter } = require("./routesFields");
const { adminRouter } = require("./routesAdmin");
const { getPrisma } = require("./db");
const { testConnection } = require("./db-utils");

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const raw = process.env.CLIENT_ORIGIN || "";
      const allowed = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (allowed.includes(origin)) return cb(null, true);
      if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
      if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: false,
  })
);
app.use(express.json({ limit: "1mb" }));

// Test database connection on startup
const prisma = getPrisma();
testConnection(prisma).then((connected) => {
  if (!connected) {
    console.error('❌ Could not connect to database after retries');
    process.exit(1);
  }
});

app.get("/health", async (req, res) => {
  try {
    // Test database health too
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, database: "connected" });
  } catch (error) {
    res.status(500).json({ ok: false, database: "disconnected", error: error.message });
  }
});

app.use("/auth", authRouter);
app.use("/fields", fieldsRouter);
app.use("/admin", adminRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});