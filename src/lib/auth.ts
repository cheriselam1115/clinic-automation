import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
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

        const validUsername = process.env.RECEPTIONIST_USERNAME;
        const passwordHash = process.env.RECEPTIONIST_PASSWORD_HASH;

        if (!validUsername || !passwordHash) return null;
        if (username !== validUsername) return null;

        const isValid = await bcrypt.compare(password, passwordHash);
        if (!isValid) return null;

        return {
          id: "receptionist",
          name: "Receptionist",
          email: "receptionist@clinic.local",
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
