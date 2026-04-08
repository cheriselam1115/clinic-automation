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

  let clinicName = "Clinic Automation";
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
    <div className="flex min-h-screen bg-[#f7f9fb]">
      <Sidebar clinicName={clinicName} logoUrl={logoUrl} />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-[#f7f9fb]/80 backdrop-blur-xl border-b border-[#c1c7d1]/30 px-8 py-3 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
            <input
              className="w-full bg-[#eceef0] border-none rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#004471]/20 text-[#191c1e] placeholder:text-slate-400"
              placeholder="Search patients, records or dates..."
              type="text"
              readOnly
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="text-slate-500 hover:bg-[#eceef0] p-2 rounded-full transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
          </div>
        </header>
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
