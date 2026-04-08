import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getClinicId } from "@/lib/session";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = await getClinicId();
  const configs = await prisma.reminderConfig.findMany({
    where: { clinicId },
    orderBy: { hoursBefore: "desc" },
  });

  return Response.json(configs);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = await getClinicId();
  const body = await req.json();
  const { configs } = body as {
    configs: { hoursBefore: number; label: string }[];
  };

  if (!Array.isArray(configs)) {
    return Response.json({ error: "configs array required" }, { status: 400 });
  }

  // Replace all configs atomically
  await prisma.$transaction([
    prisma.reminderConfig.deleteMany({ where: { clinicId } }),
    prisma.reminderConfig.createMany({
      data: configs.map((c) => ({
        clinicId,
        hoursBefore: c.hoursBefore,
        label: c.label,
      })),
    }),
  ]);

  const updated = await prisma.reminderConfig.findMany({
    where: { clinicId },
    orderBy: { hoursBefore: "desc" },
  });

  return Response.json(updated);
}
