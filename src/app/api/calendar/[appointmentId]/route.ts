import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateIcsContent } from "@/lib/calendar";

// Public route — no auth needed (UUID is unguessable)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  const { appointmentId } = await params;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      clinic: true,
    },
  });

  if (!appointment) {
    return new Response("Not found", { status: 404 });
  }

  const icsContent = generateIcsContent({
    appointmentId: appointment.id,
    patientName: appointment.patient.name,
    clinicName: appointment.clinic.name,
    clinicAddress: appointment.clinic.address,
    appointmentAt: appointment.appointmentAt,
  });

  return new Response(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="appointment.ics"`,
      "Cache-Control": "no-cache",
    },
  });
}
