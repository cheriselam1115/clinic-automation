import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getClinicId } from "@/lib/session";
import { sendSms } from "@/lib/twilio";
import { waitlistJoinedSms, type Language } from "@/lib/sms-templates";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = await getClinicId();

  const entries = await prisma.waitlistEntry.findMany({
    where: { clinicId, status: { notIn: ["removed"] } },
    include: {
      patient: true,
      offers: {
        where: { status: "pending" },
        orderBy: { offeredApptAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(entries);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = await getClinicId();
  const body = await req.json();
  const {
    patientId,
    appointmentType = null,
    preferredDateFrom = null,
    preferredDateTo = null,
    timePreference = "any",
    notes = null,
  } = body;

  if (!patientId) {
    return Response.json({ error: "patientId is required" }, { status: 400 });
  }

  // Prevent duplicate active entries for the same patient+clinic+type
  const existing = await prisma.waitlistEntry.findFirst({
    where: {
      clinicId,
      patientId,
      appointmentType: appointmentType ?? null,
      status: { in: ["waiting", "offered"] },
    },
  });

  if (existing) {
    return Response.json(
      { error: "Patient already has an active waitlist entry for this type" },
      { status: 409 }
    );
  }

  const [entry, patient, clinic] = await Promise.all([
    prisma.waitlistEntry.create({
      data: {
        clinicId,
        patientId,
        appointmentType,
        preferredDateFrom: preferredDateFrom ? new Date(preferredDateFrom) : null,
        preferredDateTo: preferredDateTo ? new Date(preferredDateTo) : null,
        timePreference,
        notes,
        status: "waiting",
      },
      include: { patient: true },
    }),
    prisma.patient.findUnique({ where: { id: patientId } }),
    prisma.clinic.findUnique({ where: { id: clinicId } }),
  ]);

  // Notify patient they've been added
  if (patient && clinic) {
    try {
      const smsBody = waitlistJoinedSms(
        {
          clinicName: clinic.name,
          appointmentType,
          timePreference,
        },
        patient.preferredLanguage as Language
      );
      const msg = await sendSms(patient.phoneNumber, smsBody);
      await prisma.smsLog.create({
        data: {
          clinicId,
          patientId: patient.id,
          direction: "outbound",
          body: smsBody,
          fromNumber: clinic.phoneNumber,
          toNumber: patient.phoneNumber,
          twilioMessageSid: msg.sid,
          status: msg.status,
        },
      });
    } catch (err) {
      console.error("Failed to send waitlist joined SMS:", err);
    }
  }

  return Response.json(entry, { status: 201 });
}
