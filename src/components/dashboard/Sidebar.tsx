"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Today" },
  { href: "/dashboard/appointments", label: "Appointments" },
  { href: "/dashboard/reschedule", label: "Call Queue" },
  { href: "/dashboard/sms", label: "SMS Activity" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-white border-r flex flex-col">
      <div className="px-6 py-5 border-b">
        <span className="font-semibold text-lg tracking-tight">Clinic SMS</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="px-3 py-4 border-t">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
