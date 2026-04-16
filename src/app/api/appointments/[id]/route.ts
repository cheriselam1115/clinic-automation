import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getClinicId } from "@/lib/session";
import { offerNextWaitlistPatient } from "@/lib/waitlist";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = await getClinicId();
  const { id } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: { id, clinicId },
    include: { patient: true, reminderLogs: true, smsLogs: true, clinic: true },
  });

  if (!appointment) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(appointment);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = await getClinicId();
  const { id } = await params;
  const body = await req.json();
  const { appointmentAt, appointmentType, status, notes } = body;

  // Fetch before update so we have the original state + clinic info
  const before = await prisma.appointment.findUnique({
    where: { id, clinicId },
    include: { clinic: true },
  });

  const appointment = await prisma.appointment.update({
    where: { id, clinicId },
    data: {
      ...(appointmentAt && { appointmentAt: new Date(appointmentAt) }),
      ...(appointmentType && { appointmentType }),
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
    },
    include: { patient: true },
  });

  // Trigger waitlist when cancelling via dashboard
  if (status === "cancelled" && before?.clinic) {
    try {
      await offerNextWaitlistPatient(
        {
          id: before.id,
          clinicId: before.clinicId,
          appointmentType: before.appointmentType,
          appointmentAt: before.appointmentAt,
        },
        {
          id: before.clinic.id,
          name: before.clinic.name,
          phoneNumber: before.clinic.phoneNumber,
          alertPhoneNumber: before.clinic.alertPhoneNumber,
          timezone: before.clinic.timezone,
        }
      );
    } catch (err) {
      console.error("Failed to trigger waitlist offer on PUT cancel:", err);
    }
  }

  return Response.json(appointment);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = await getClinicId();
  const { id } = await params;

  // Fetch clinic info before soft-deleting so we can trigger waitlist
  const appt = await prisma.appointment.findUnique({
    where: { id, clinicId },
    include: { clinic: true },
  });

  await prisma.appointment.update({
    where: { id, clinicId },
    data: { status: "cancelled" },
  });

  if (appt?.clinic) {
    try {
      await offerNextWaitlistPatient(
        {
          id: appt.id,
          clinicId: appt.clinicId,
          appointmentType: appt.appointmentType,
          appointmentAt: appt.appointmentAt,
        },
        {
          id: appt.clinic.id,
          name: appt.clinic.name,
          phoneNumber: appt.clinic.phoneNumber,
          alertPhoneNumber: appt.clinic.alertPhoneNumber,
          timezone: appt.clinic.timezone,
        }
      );
    } catch (err) {
      console.error("Failed to trigger waitlist offer on DELETE cancel:", err);
    }
  }

  return Response.json({ success: true });
}
