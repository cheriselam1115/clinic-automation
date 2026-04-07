import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { patient: true, reminderLogs: true, smsLogs: true },
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

  const { id } = await params;
  const body = await req.json();
  const { appointmentAt, appointmentType, status, notes } = body;

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      ...(appointmentAt && { appointmentAt: new Date(appointmentAt) }),
      ...(appointmentType && { appointmentType }),
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
    },
    include: { patient: true },
  });

  return Response.json(appointment);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.appointment.update({
    where: { id },
    data: { status: "cancelled" },
  });

  return Response.json({ success: true });
}
