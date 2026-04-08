import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      clinicId: string;
      name?: string | null;
      email?: string | null;
    };
  }

  interface User {
    clinicId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    clinicId: string;
    userId: string;
  }
}
