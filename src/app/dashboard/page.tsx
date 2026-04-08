export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getClinicId } from "@/lib/session";
import { DEMO_CLINIC_ID, DEMO_CLINIC, DEMO_APPOINTMENTS, DEMO_SMS_LOGS } from "@/lib/demo-data";
import Link from "next/link";

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  scheduled:            { label: "Upcoming",           classes: "bg-[#eceef0] text-[#414750]" },
  confirmed:            { label: "Confirmed",           classes: "bg-[#9beeef] text-[#006e70]" },
  cancelled:            { label: "Cancelled",           classes: "bg-[#ffdad6] text-[#93000a]" },
  reschedule_requested: { label: "Reschedule",          classes: "bg-amber-100 text-amber-700" },
  no_response:          { label: "No Response",         classes: "bg-orange-100 text-orange-700" },
};

export default async function DashboardPage() {
  const clinicId = await getClinicId();

  let todayAppointments: Array<{
    id: string;
    appointmentAt: Date;
    appointmentType: string | null;
    status: string;
    patient: { name: string };
  }>;
  let callQueueCount: number;
  let unconfirmedCount: number;
  let recentSmsCount: number;
  let clinic: { name: string; timezone: string | null } | null;

  if (clinicId === DEMO_CLINIC_ID) {
    const today = new Date();
    todayAppointments = DEMO_APPOINTMENTS.filter((a) => {
      const d = new Date(a.appointmentAt);
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    });
    callQueueCount = DEMO_APPOINTMENTS.filter((a) =>
      ["reschedule_requested", "no_response"].includes(a.status)
    ).length;
    unconfirmedCount = DEMO_APPOINTMENTS.filter((a) => a.status === "scheduled").length;
    recentSmsCount = DEMO_SMS_LOGS.length;
    clinic = DEMO_CLINIC;
  } else {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    [todayAppointments, callQueueCount, unconfirmedCount, clinic] = await Promise.all([
      prisma.appointment.findMany({
        where: { clinicId, appointmentAt: { gte: startOfDay, lte: endOfDay } },
        include: { patient: true },
        orderBy: { appointmentAt: "asc" },
      }),
      prisma.appointment.count({
        where: { clinicId, status: { in: ["reschedule_requested", "no_response"] }, appointmentAt: { gte: now } },
      }),
      prisma.appointment.count({
        where: { clinicId, status: "scheduled", appointmentAt: { gte: now } },
      }),
      prisma.clinic.findUnique({ where: { id: clinicId } }),
    ]);
    recentSmsCount = await prisma.smsLog.count({ where: { clinicId } }).catch(() => 0);
  }

  const tz = clinic?.timezone ?? "UTC";
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#414750] mb-1">
          Today&apos;s At-a-Glance
        </p>
        <h1 className="text-4xl font-extrabold font-headline text-[#004471]">
          {todayAppointments.length} Appointment{todayAppointments.length !== 1 ? "s" : ""}
        </h1>
        <p className="text-sm text-[#414750] mt-1">{dateLabel}</p>
      </div>

      {/* Bento stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="text-white p-6 rounded-2xl flex flex-col justify-between min-h-[120px]"
          style={{ background: "linear-gradient(135deg, #004471 0%, #005c97 100%)" }}
        >
          <span className="material-symbols-outlined text-[#9bcaff] text-3xl">phone_in_talk</span>
          <div>
            <p className="text-sm opacity-80 mb-1">Needs Callback</p>
            <p className="text-3xl font-bold font-headline">{callQueueCount}</p>
          </div>
        </div>

        <div
          className="text-white p-6 rounded-2xl flex flex-col justify-between min-h-[120px]"
          style={{ background: "linear-gradient(135deg, #00696b 0%, #004d4e 100%)" }}
        >
          <span className="material-symbols-outlined text-[#9ef1f2] text-3xl">chat</span>
          <div>
            <p className="text-sm opacity-80 mb-1">SMS Messages</p>
            <p className="text-3xl font-bold font-headline">{recentSmsCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl flex flex-col justify-between min-h-[120px] shadow-sm">
          <span className="material-symbols-outlined text-[#004471] text-3xl">event_available</span>
          <div>
            <p className="text-sm text-[#414750] mb-1">Unconfirmed</p>
            <p className="text-3xl font-bold font-headline text-[#191c1e]">{unconfirmedCount}</p>
          </div>
        </div>
      </div>

      {/* Main layout: schedule + quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Schedule */}
        <section className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-extrabold font-headline text-[#191c1e]">Daily Schedule</h2>
            <Link
              href="/dashboard/appointments"
              className="text-xs font-bold text-[#004471] hover:underline uppercase tracking-wide"
            >
              View All →
            </Link>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
            {todayAppointments.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-4xl text-[#c1c7d1] block mb-2">event_busy</span>
                <p className="text-[#414750] text-sm">No appointments scheduled for today.</p>
              </div>
            ) : (
              todayAppointments.map((appt, i) => {
                const isFirst = i === 0;
                const time = new Date(appt.appointmentAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: tz,
                });
                const cfg = STATUS_CONFIG[appt.status] ?? { label: appt.status, classes: "bg-[#eceef0] text-[#414750]" };

                if (isFirst) {
                  return (
                    <div
                      key={appt.id}
                      className="relative bg-[#f7f9fb] ring-2 ring-[#004471]/10 rounded-2xl p-5 shadow-sm -mx-1 scale-[1.01]"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-[#004471] rounded-l-2xl" />
                      <div className="flex justify-between items-start ml-3">
                        <div>
                          <h4 className="text-lg font-extrabold font-headline text-[#191c1e] leading-none mb-1">
                            {appt.patient.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${cfg.classes}`}>
                              {cfg.label}
                            </span>
                            {appt.appointmentType && (
                              <span className="text-sm text-[#414750]">{appt.appointmentType}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-bold text-[#004471]">{time}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={appt.id}
                    className="grid grid-cols-12 gap-4 items-center opacity-75"
                  >
                    <div className="col-span-2 text-right">
                      <span className="text-xs font-bold text-slate-400">{time}</span>
                    </div>
                    <div className="col-span-10 bg-[#f2f4f6] rounded-xl px-4 py-3 flex justify-between items-center hover:bg-[#eceef0] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-8 rounded-full ${appt.status === "confirmed" ? "bg-[#00696b]" : "bg-[#c1c7d1]"}`} />
                        <div>
                          <p className="font-bold text-sm text-[#191c1e]">{appt.patient.name}</p>
                          {appt.appointmentType && (
                            <p className="text-xs text-[#414750]">{appt.appointmentType}</p>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${cfg.classes}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="lg:col-span-4 space-y-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#414750] mb-3 px-1">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Call Queue",    icon: "phone_in_talk", href: "/dashboard/reschedule" },
                { label: "SMS Activity",  icon: "chat",          href: "/dashboard/sms" },
                { label: "Appointments",  icon: "event_note",    href: "/dashboard/appointments" },
                { label: "Settings",      icon: "settings",      href: "/dashboard/settings" },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm hover:bg-[#004471] hover:text-white transition-all group"
                >
                  <span className="material-symbols-outlined mb-2 text-[#004471] group-hover:text-white text-2xl">
                    {action.icon}
                  </span>
                  <span className="text-xs font-bold text-center leading-tight">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Call queue alert */}
          {callQueueCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-600 text-2xl">warning</span>
                <div>
                  <p className="font-bold text-sm text-amber-800">
                    {callQueueCount} patient{callQueueCount !== 1 ? "s" : ""} need{callQueueCount === 1 ? "s" : ""} a callback
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    Reschedule requests or no responses.
                  </p>
                  <Link
                    href="/dashboard/reschedule"
                    className="mt-3 inline-block text-xs font-bold text-amber-700 hover:underline"
                  >
                    View Call Queue →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
