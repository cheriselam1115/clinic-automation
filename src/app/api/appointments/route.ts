import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getClinicId } from "@/lib/session";
import { sendSms } from "@/lib/twilio";
import { confirmationSms, type Language } from "@/lib/sms-templates";
import { buildGoogleCalendarUrl, buildAppleCalendarUrl } from "@/lib/calendar";
import { formatAppointmentDate } from "@/lib/format-date";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = await getClinicId();
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const date = searchParams.get("date"); // YYYY-MM-DD

  const where: Record<string, unknown> = { clinicId };
  if (status) where.status = status;
  if (date) {
    const d = new Date(date);
    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);
    where.appointmentAt = { gte: d, lt: nextDay };
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: { patient: true },
    orderBy: { appointmentAt: "asc" },
  });

  return Response.json(appointments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = await getClinicId();
  const body = await req.json();
  const { patientId, appointmentAt, appointmentType, notes } = body;

  if (!patientId || !appointmentAt || !appointmentType) {
    return Response.json(
      { error: "patientId, appointmentAt, and appointmentType are required" },
      { status: 400 }
    );
  }

  const [clinic, patient] = await Promise.all([
    prisma.clinic.findUnique({ where: { id: clinicId } }),
    prisma.patient.findUnique({ where: { id: patientId } }),
  ]);

  if (!clinic || !patient) {
    return Response.json({ error: "Clinic or patient not found" }, { status: 404 });
  }

  const appointment = await prisma.appointment.create({
    data: {
      clinicId,
      patientId,
      appointmentAt: new Date(appointmentAt),
      appointmentType,
      notes,
    },
  });

  // Send confirmation SMS
  try {
    const apptDate = new Date(appointmentAt);
    const { appointmentDate, appointmentTime } = formatAppointmentDate(
      apptDate,
      clinic.timezone
    );

    const googleUrl = buildGoogleCalendarUrl({
      appointmentId: appointment.id,
      patientName: patient.name,
      clinicName: clinic.name,
      clinicAddress: clinic.address,
      appointmentAt: apptDate,
    });
    const appleUrl = buildAppleCalendarUrl(appointment.id);

    const smsBody = confirmationSms(
      {
        patientName: patient.name,
        clinicName: clinic.name,
        clinicAddress: clinic.address,
        clinicPhone: clinic.alertPhoneNumber,
        appointmentDate,
        appointmentTime,
        googleCalendarUrl: googleUrl,
        appleCalendarUrl: appleUrl,
      },
      patient.preferredLanguage as Language
    );

    const msg = await sendSms(patient.phoneNumber, smsBody, appointment.id);

    await prisma.smsLog.create({
      data: {
        clinicId,
        appointmentId: appointment.id,
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
    console.error("Failed to send confirmation SMS:", err);
    // Don't fail the appointment creation if SMS fails
  }

  return Response.json(appointment, { status: 201 });
}
