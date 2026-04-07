export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { NewAppointmentButton } from "@/components/appointments/NewAppointmentButton";

export default async function AppointmentsPage() {
  const clinicId = process.env.CLINIC_ID!;

  const appointments = await prisma.appointment.findMany({
    where: {
      clinicId,
      appointmentAt: { gte: new Date() },
    },
    include: { patient: true },
    orderBy: { appointmentAt: "asc" },
    take: 100,
  });

  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Appointments</h1>
        <NewAppointmentButton clinicId={clinicId} />
      </div>
      <AppointmentTable
        appointments={appointments}
        timezone={clinic?.timezone ?? "UTC"}
      />
    </div>
  );
}
