"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard",              label: "Schedule",     icon: "calendar_today" },
  { href: "/dashboard/appointments", label: "Appointments", icon: "event_available" },
  { href: "/dashboard/reschedule",   label: "Call Queue",   icon: "phone_in_talk" },
  { href: "/dashboard/sms",          label: "SMS Activity", icon: "chat" },
  { href: "/dashboard/settings",     label: "Settings",     icon: "settings" },
];

interface SidebarProps {
  clinicName: string;
  logoUrl?: string | null;
}

export function Sidebar({ clinicName, logoUrl }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-[#f1f3f5] flex flex-col p-4 space-y-6 z-50">
      {/* Logo & Clinic Name */}
      <div className="flex items-center gap-3 px-2">
        <div className="w-10 h-10 rounded-xl bg-[#004471] flex items-center justify-center text-white overflow-hidden shrink-0">
          {logoUrl ? (
            <Image src={logoUrl} alt={clinicName} width={40} height={40} className="w-full h-full object-cover" />
          ) : (
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dentistry</span>
          )}
        </div>
        <div>
          <h1 className="text-sm font-extrabold text-[#004471] leading-tight font-headline line-clamp-2">{clinicName}</h1>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200",
                isActive
                  ? "bg-white text-[#004471] shadow-sm"
                  : "text-slate-600 hover:text-[#004471] hover:bg-white/60"
              )}
            >
              <span className="material-symbols-outlined mr-3 text-xl">{item.icon}</span>
              <span className="font-headline tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* New Appointment CTA */}
      <Link
        href="/dashboard/appointments"
        className="w-full text-center text-white py-3 rounded-xl font-bold font-headline text-sm shadow-sm hover:shadow-lg transition-all"
        style={{ background: "linear-gradient(135deg, #004471 0%, #005c97 100%)" }}
      >
        New Appointment
      </Link>

      {/* Footer */}
      <div className="border-t border-slate-200/60 pt-4 space-y-1">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center w-full px-4 py-2 text-sm text-slate-500 hover:text-[#004471] hover:bg-white/60 rounded-lg transition-all"
        >
          <span className="material-symbols-outlined mr-3 text-xl">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
