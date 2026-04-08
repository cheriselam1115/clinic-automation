export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getClinicId } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  reschedule_requested: "bg-yellow-100 text-yellow-800",
  no_response: "bg-orange-100 text-orange-800",
};

export default async function DashboardPage() {
  const clinicId = await getClinicId();

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [todayAppointments, callQueue, totalScheduled, clinic] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        clinicId,
        appointmentAt: { gte: startOfDay, lte: endOfDay },
      },
      include: { patient: true },
      orderBy: { appointmentAt: "asc" },
    }),
    prisma.appointment.count({
      where: {
        clinicId,
        status: { in: ["reschedule_requested", "no_response"] },
        appointmentAt: { gte: now },
      },
    }),
    prisma.appointment.count({
      where: { clinicId, status: "scheduled", appointmentAt: { gte: now } },
    }),
    prisma.clinic.findUnique({ where: { id: clinicId } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Today&apos;s Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Today&apos;s Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayAppointments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Needs Call Back</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{callQueue}</div>
            {callQueue > 0 && (
              <Link href="/dashboard/reschedule" className="text-xs text-blue-600 hover:underline">
                View queue →
              </Link>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Upcoming (unconfirmed)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalScheduled}</div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-3">Today&apos;s Schedule</h2>
        {todayAppointments.length === 0 ? (
          <p className="text-gray-400 text-sm">No appointments scheduled for today.</p>
        ) : (
          <div className="bg-white rounded-lg border divide-y">
            {todayAppointments.map((appt) => (
              <div key={appt.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-sm text-gray-900">{appt.patient.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(appt.appointmentAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: clinic?.timezone ?? "UTC",
                    })}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    STATUS_COLORS[appt.status] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {appt.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
