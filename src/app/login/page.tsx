import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9fb]">
      <main className="flex-grow flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-2xl shadow-[0_12px_32px_rgba(25,28,30,0.08)]">
          {/* Left: Branding panel */}
          <div
            className="hidden lg:flex relative overflow-hidden p-16 flex-col justify-between"
            style={{ background: "linear-gradient(135deg, #004471 0%, #005c97 100%)" }}
          >
            {/* Subtle texture overlay */}
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: "radial-gradient(circle at 20% 80%, #9bcaff 0%, transparent 50%), radial-gradient(circle at 80% 20%, #00696b 0%, transparent 50%)" }}
            />

            {/* Logo */}
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                  medical_services
                </span>
              </div>
              <span className="font-headline text-xl font-extrabold tracking-tight text-white">
                Clinic Automation
              </span>
            </div>

            {/* Headline */}
            <div className="relative z-10">
              <h1 className="font-headline text-5xl font-bold text-white tracking-tight leading-tight mb-6">
                Your Clinical<br />Sanctuary Awaits.
              </h1>
              <p className="text-blue-200 text-lg font-medium max-w-sm">
                Access your professional workspace designed for clarity, efficiency, and exceptional patient care.
              </p>
            </div>

            {/* Stats */}
            <div className="relative z-10 flex gap-8">
              <div>
                <div className="text-white font-headline text-3xl font-bold">SMS</div>
                <div className="text-blue-300 text-xs font-semibold tracking-widest uppercase">Automation</div>
              </div>
              <div>
                <div className="text-white font-headline text-3xl font-bold">24/7</div>
                <div className="text-blue-300 text-xs font-semibold tracking-widest uppercase">Reminders</div>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </main>

      <footer className="w-full py-6 px-12 flex justify-between items-center bg-[#f1f3f5]">
        <div className="text-xs tracking-wide text-slate-500">
          © {new Date().getFullYear()} Clinic Automation. All rights reserved.
        </div>
        <div className="flex gap-6">
          <span className="text-xs text-slate-400">HIPAA Compliant</span>
        </div>
      </footer>
    </div>
  );
}
