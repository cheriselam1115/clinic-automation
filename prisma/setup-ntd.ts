import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.clinic.update({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    data: { name: "North Taunton Dental", timezone: "America/Toronto", address: "North Taunton, ON" },
  });

  await prisma.user.upsert({
    where: { username: "northtaunton" },
    update: {},
    create: {
      clinicId: "00000000-0000-0000-0000-000000000001",
      username: "northtaunton",
      passwordHash: "UNSET",
      name: "Receptionist",
    },
  });

  console.log("North Taunton Dental set up.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
