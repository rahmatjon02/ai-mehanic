CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "Diagnosis" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "fileType" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "rawResult" TEXT NOT NULL,
  "problem" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "totalMin" DOUBLE PRECISION NOT NULL,
  "totalMax" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Diagnosis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Quote" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "diagnosisId" TEXT NOT NULL,
  "filePath" TEXT,
  "mechanicTotal" DOUBLE PRECISION NOT NULL,
  "verdict" TEXT NOT NULL,
  "overchargeAmt" DOUBLE PRECISION NOT NULL,
  "overchargePct" DOUBLE PRECISION NOT NULL,
  "explanation" TEXT NOT NULL,
  "rawResult" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Quote_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Quote_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "Diagnosis" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Quote_diagnosisId_idx" ON "Quote" ("diagnosisId");
