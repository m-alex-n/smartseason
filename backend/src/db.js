const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

let prisma;
function getPrisma() {
  if (!prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");

    // Parse the connection string to check if it's Neon
    const isNeon = connectionString.includes('neon.tech');
    
    const pool = new Pool({
      connectionString,
      ssl: isNeon ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000, // Reduce from 30s to 10s
      idleTimeoutMillis: 30000,
      max: 5,
    });
    
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ 
      adapter,
      log: ['error', 'warn'],
    });
  }
  return prisma;
}

module.exports = { getPrisma };