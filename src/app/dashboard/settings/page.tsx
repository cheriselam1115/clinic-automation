export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { ReminderSettingsClient } from "@/components/settings/ReminderSettingsClient";

export default async function SettingsPage() {
  const clinicId = process.env.CLINIC_ID!;

  const configs = await prisma.reminderConfig.findMany({
    where: { clinicId },
    orderBy: { hoursBefore: "desc" },
  });

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Reminder Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure when reminder SMS messages are sent before each appointment.
        </p>
      </div>
      <ReminderSettingsClient initialConfigs={configs} />
    </div>
  );
}
