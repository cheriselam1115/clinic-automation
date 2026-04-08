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

  // Create default receptionist user tied to this clinic
  const username = process.env.RECEPTIONIST_USERNAME ?? "admin";
  const passwordHash = process.env.RECEPTIONIST_PASSWORD_HASH;

  if (passwordHash) {
    await prisma.user.upsert({
      where: { username },
      update: { clinicId: clinic.id },
      create: {
        clinicId: clinic.id,
        username,
        passwordHash,
        name: "Receptionist",
      },
    });
    console.log("Seeded user:", username);
  } else {
    console.warn(
      "⚠️  RECEPTIONIST_PASSWORD_HASH not set — skipping user seed.\n" +
      "   Generate one with: node -e \"require('bcryptjs').hash('yourpassword', 10).then(console.log)\""
    );
  }

  console.log("Seeded clinic:", clinic.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
