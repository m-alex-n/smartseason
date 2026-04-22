-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'AGENT');

-- CreateEnum
CREATE TYPE "FieldStage" AS ENUM ('PLANTED', 'GROWING', 'READY', 'HARVESTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Field" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cropType" TEXT NOT NULL,
    "plantingDate" TIMESTAMP(3) NOT NULL,
    "currentStage" "FieldStage" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldAssignment" (
    "userId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldAssignment_pkey" PRIMARY KEY ("userId","fieldId")
);

-- CreateTable
CREATE TABLE "FieldUpdate" (
    "id" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "stage" "FieldStage" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FieldUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Field_currentStage_idx" ON "Field"("currentStage");

-- CreateIndex
CREATE INDEX "Field_plantingDate_idx" ON "Field"("plantingDate");

-- CreateIndex
CREATE INDEX "FieldAssignment_fieldId_idx" ON "FieldAssignment"("fieldId");

-- CreateIndex
CREATE INDEX "FieldUpdate_fieldId_createdAt_idx" ON "FieldUpdate"("fieldId", "createdAt");

-- CreateIndex
CREATE INDEX "FieldUpdate_agentId_createdAt_idx" ON "FieldUpdate"("agentId", "createdAt");

-- AddForeignKey
ALTER TABLE "FieldAssignment" ADD CONSTRAINT "FieldAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldAssignment" ADD CONSTRAINT "FieldAssignment_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldUpdate" ADD CONSTRAINT "FieldUpdate_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldUpdate" ADD CONSTRAINT "FieldUpdate_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
