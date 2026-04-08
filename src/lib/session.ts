import { auth } from "@/lib/auth";

export async function getClinicId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.clinicId) {
    throw new Error("Unauthorized");
  }
  return session.user.clinicId;
}
