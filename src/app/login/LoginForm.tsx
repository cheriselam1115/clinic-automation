"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid username or password.");
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <div className="p-8 md:p-16 flex flex-col justify-center bg-white">
      <div className="max-w-md w-full mx-auto">
        {/* Mobile logo */}
        <div className="lg:hidden mb-12 flex items-center gap-3">
          <span className="material-symbols-outlined text-[#004471] text-3xl">medical_services</span>
          <span className="font-headline text-xl font-bold tracking-tight text-[#004471]">Clinic Automation</span>
        </div>

        <header className="mb-10">
          <h2 className="font-headline text-3xl font-bold text-[#191c1e] mb-2">Welcome Back</h2>
          <p className="text-[#414750] font-medium">Please enter your credentials to continue.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#414750] ml-1" htmlFor="username">
              Username
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-[#717881] text-xl group-focus-within:text-[#004471] transition-colors">
                  person
                </span>
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="your_username"
                className="w-full pl-12 pr-4 py-4 bg-[#eceef0] border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[#004471]/20 text-[#191c1e] placeholder:text-[#717881]/60 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#414750] ml-1" htmlFor="password">
              Password
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-[#717881] text-xl group-focus-within:text-[#004471] transition-colors">
                  lock
                </span>
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-12 pr-12 py-4 bg-[#eceef0] border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[#004471]/20 text-[#191c1e] placeholder:text-[#717881]/60 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#717881] hover:text-[#191c1e] transition-colors"
              >
                <span className="material-symbols-outlined text-xl">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-[#ba1a1a] ml-1">{error}</p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-headline font-bold py-4 rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #004471 0%, #005c97 100%)" }}
            >
              <span>{loading ? "Signing in…" : "Sign In to Dashboard"}</span>
              {!loading && <span className="material-symbols-outlined text-xl">login</span>}
            </button>
          </div>
        </form>

        <footer className="mt-12 pt-8 border-t border-[#eceef0]">
          <div className="flex items-center gap-4 text-[#c1c7d1]">
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            <span className="text-xs font-medium tracking-wide">Secure HIPAA Compliant Gateway</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
