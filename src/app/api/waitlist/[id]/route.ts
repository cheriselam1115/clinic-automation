import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getClinicId } from "@/lib/session";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = await getClinicId();
  const { id } = await params;

  const entry = await prisma.waitlistEntry.findUnique({
    where: { id },
  });

  if (!entry || entry.clinicId !== clinicId) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.waitlistEntry.update({
    where: { id },
    data: { status: "removed" },
  });

  return Response.json({ success: true });
}
