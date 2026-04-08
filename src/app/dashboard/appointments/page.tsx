export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getClinicId } from "@/lib/session";
import { DEMO_CLINIC_ID, DEMO_CLINIC, DEMO_APPOINTMENTS } from "@/lib/demo-data";
import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { NewAppointmentButton } from "@/components/appointments/NewAppointmentButton";

export default async function AppointmentsPage() {
  const clinicId = await getClinicId();

  let appointments, timezone;

  if (clinicId === DEMO_CLINIC_ID) {
    appointments = DEMO_APPOINTMENTS;
    timezone = DEMO_CLINIC.timezone;
  } else {
    const [appts, clinic] = await Promise.all([
      prisma.appointment.findMany({ where: { clinicId, appointmentAt: { gte: new Date() } }, include: { patient: true }, orderBy: { appointmentAt: "asc" }, take: 100 }),
      prisma.clinic.findUnique({ where: { id: clinicId } }),
    ]);
    appointments = appts;
    timezone = clinic?.timezone ?? "UTC";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Appointments</h1>
        <NewAppointmentButton clinicId={clinicId} />
      </div>
      <AppointmentTable appointments={appointments} timezone={timezone} />
    </div>
  );
}
