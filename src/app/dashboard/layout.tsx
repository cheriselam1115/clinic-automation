import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DEMO_CLINIC_ID, DEMO_CLINIC } from "@/lib/demo-data";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const clinicId = session?.user?.clinicId;

  let clinicName = "Clinic SMS";
  let logoUrl: string | null = null;

  if (clinicId === DEMO_CLINIC_ID) {
    clinicName = DEMO_CLINIC.name;
    logoUrl = DEMO_CLINIC.logoUrl;
  } else if (clinicId) {
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true, logoUrl: true },
    }).catch(() => null);
    if (clinic) {
      clinicName = clinic.name;
      logoUrl = clinic.logoUrl ?? null;
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar clinicName={clinicName} logoUrl={logoUrl} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
