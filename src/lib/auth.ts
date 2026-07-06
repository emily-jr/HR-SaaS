import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" },
        tenantId: { label: "租户ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;
        const tenantId = credentials.tenantId as string;

        const user = await prisma.user.findFirst({
          where: {
            email,
            tenantId,
            isActive: true,
          },
          include: {
            tenant: true,
            employee: {
              include: {
                department: true,
                position: true,
              },
            },
          },
        });

        if (!user) return null;

        const isValid = await compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          tenantId: user.tenantId,
          tenantName: user.tenant.name,
          role: user.role,
          employeeId: user.employeeId,
          employeeName: user.employee?.name ?? null,
          deptName: user.employee?.department?.name ?? null,
          positionName: user.employee?.position?.name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId;
        token.tenantName = user.tenantName;
        token.role = user.role;
        token.employeeId = user.employeeId;
        token.employeeName = user.employeeName;
        token.deptName = user.deptName;
        token.positionName = user.positionName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.tenantId = token.tenantId as string;
        session.user.tenantName = token.tenantName as string;
        session.user.role = token.role as string;
        session.user.employeeId = token.employeeId as string | null;
        session.user.employeeName = token.employeeName as string | null;
        session.user.deptName = token.deptName as string | null;
        session.user.positionName = token.positionName as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
