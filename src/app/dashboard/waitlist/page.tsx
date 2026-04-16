export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getClinicId } from "@/lib/session";
import { WaitlistClient } from "@/components/waitlist/WaitlistClient";
import { DEMO_CLINIC_ID, DEMO_CLINIC, DEMO_WAITLIST } from "@/lib/demo-data";

export default async function WaitlistPage() {
  const clinicId = await getClinicId();

  let entries, timezone;

  if (clinicId === DEMO_CLINIC_ID) {
    entries = DEMO_WAITLIST;
    timezone = DEMO_CLINIC.timezone;
  } else {
    const [rawEntries, clinic] = await Promise.all([
      prisma.waitlistEntry.findMany({
        where: { clinicId, status: { notIn: ["removed"] } },
        include: {
          patient: true,
          offers: {
            where: { status: "pending" },
            orderBy: { offeredApptAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.clinic.findUnique({ where: { id: clinicId } }),
    ]);
    entries = rawEntries;
    timezone = clinic?.timezone ?? "UTC";
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#414750] mb-1">
          Auto-fill
        </p>
        <h1 className="text-4xl font-extrabold font-headline text-[#004471]">Waitlist</h1>
        <p className="text-sm text-[#414750] mt-1">
          Patients waiting for an opening. When any appointment cancels, the first matching
          patient is automatically offered the slot via SMS.
        </p>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <WaitlistClient entries={entries as any} clinicId={clinicId} timezone={timezone} />
    </div>
  );
}
