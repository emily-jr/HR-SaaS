import "next-auth";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    tenantId?: string;
    tenantName?: string;
    role?: string;
    employeeId?: string | null;
    employeeName?: string | null;
    deptName?: string | null;
    positionName?: string | null;
  }

  interface Session {
    user: {
      id: string;
      tenantId: string;
      tenantName: string;
      role: string;
      employeeId: string | null;
      employeeName: string | null;
      deptName: string | null;
      positionName: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId?: string;
    tenantName?: string;
    role?: string;
    employeeId?: string | null;
    employeeName?: string | null;
    deptName?: string | null;
    positionName?: string | null;
  }
}
