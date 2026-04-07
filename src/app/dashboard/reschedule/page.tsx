export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { CallQueueClient } from "@/components/dashboard/CallQueueClient";

export default async function ReschedulePage() {
  const clinicId = process.env.CLINIC_ID!;

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      status: { in: ["reschedule_requested", "no_response", "cancelled"] },
    },
    include: { patient: true },
    orderBy: { updatedAt: "desc" },
  });

  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Call Queue</h1>
        <p className="text-sm text-gray-500 mt-1">
          Patients who need a callback to reschedule or confirm.
        </p>
      </div>
      <CallQueueClient
        appointments={appointments}
        timezone={clinic?.timezone ?? "UTC"}
      />
    </div>
  );
}
