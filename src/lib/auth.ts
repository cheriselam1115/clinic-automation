import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Demo accounts — no DB required
const DEMO_USERS: Record<string, { password: string; clinicId: string; name: string }> = {
  demo: {
    password: "Preview#9182",
    clinicId: "demo-ntd",
    name: "Receptionist",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const username = credentials?.username as string;
        const password = credentials?.password as string;

        if (!username || !password) return null;

        // Try real DB first
        try {
          const user = await prisma.user.findUnique({ where: { username } });
          if (user) {
            const isValid = await bcrypt.compare(password, user.passwordHash);
            if (!isValid) return null;
            return { id: user.id, clinicId: user.clinicId, name: user.name, email: null };
          }
        } catch {
          // DB not available — fall through to demo
        }

        // Demo fallback
        const demo = DEMO_USERS[username];
        if (demo && password === demo.password) {
          return { id: `demo-${username}`, clinicId: demo.clinicId, name: demo.name, email: null };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id ?? "";
        token.clinicId = (user as { clinicId: string }).clinicId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.clinicId = token.clinicId;
      return session;
    },
  },
});
