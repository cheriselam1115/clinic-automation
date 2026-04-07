import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = process.env.CLINIC_ID!;
  const q = req.nextUrl.searchParams.get("q") ?? "";

  const patients = await prisma.patient.findMany({
    where: {
      clinicId,
      OR: q
        ? [
            { name: { contains: q, mode: "insensitive" } },
            { phoneNumber: { contains: q } },
          ]
        : undefined,
    },
    orderBy: { name: "asc" },
    take: 20,
  });

  return Response.json(patients);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = process.env.CLINIC_ID!;
  const body = await req.json();
  const { name, phoneNumber, preferredLanguage = "en" } = body;

  if (!name || !phoneNumber) {
    return Response.json({ error: "name and phoneNumber required" }, { status: 400 });
  }

  // Upsert — if patient with same phone already exists, return them
  const patient = await prisma.patient.upsert({
    where: { clinicId_phoneNumber: { clinicId, phoneNumber } },
    update: { name, preferredLanguage },
    create: { clinicId, name, phoneNumber, preferredLanguage },
  });

  return Response.json(patient, { status: 201 });
}
