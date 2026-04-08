import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const clinic = session?.user?.clinicId
    ? await prisma.clinic.findUnique({
        where: { id: session.user.clinicId },
        select: { name: true, logoUrl: true },
      })
    : null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar clinicName={clinic?.name ?? "Clinic SMS"} logoUrl={clinic?.logoUrl ?? null} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
