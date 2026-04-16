// PHIPA (Ontario Personal Health Information Protection Act) requires that PHI
// remain in Canada. Your Neon project MUST be created in the ca-central-1 region.
// Verify at: Neon Console → Project Settings → Region
// Hostname pattern for Canadian region: *.ca-central-1.aws.neon.tech
//
// The check below warns at startup if the DATABASE_URL doesn't match that pattern.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // PHIPA region check — warn loudly if database is not in Canada
  if (!connectionString.includes("ca-central")) {
    console.warn(
      "[PHIPA] DATABASE_URL does not appear to reference a Canadian Neon region " +
        "(expected ca-central-1). Patient health information must be stored in " +
        "Canada under PHIPA. Verify your Neon project region before deploying."
    );
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
