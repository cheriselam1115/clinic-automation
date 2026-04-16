import { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  // Rate-limit sign-in: max 5 attempts per IP per minute
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = rateLimit(`signin:${ip}`, { limit: 5, windowMs: 60_000 });

  if (!allowed) {
    return Response.json(
      { error: "Too many login attempts. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  return handlers.POST(req);
}
