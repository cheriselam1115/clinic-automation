import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create or update the clinic record
  const clinic = await prisma.clinic.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "My Dental Clinic",
      phoneNumber: process.env.TWILIO_PHONE_NUMBER ?? "+10000000000",
      alertPhoneNumber: process.env.ALERT_PHONE_NUMBER ?? "+10000000000",
      timezone: "America/Vancouver",
      address: "123 Main St, Vancouver, BC",
    },
  });

  // Create default reminder configs: 8 days, 48 hours, 2 hours
  await prisma.reminderConfig.createMany({
    data: [
      { clinicId: clinic.id, hoursBefore: 192, label: "8-day reminder" },
      { clinicId: clinic.id, hoursBefore: 48, label: "48-hour reminder" },
      { clinicId: clinic.id, hoursBefore: 2, label: "2-hour reminder" },
    ],
    skipDuplicates: true,
  });

  console.log("Seeded clinic:", clinic.id);
  console.log("Add this to your .env.local: CLINIC_ID=" + clinic.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
