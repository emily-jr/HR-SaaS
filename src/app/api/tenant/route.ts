import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: session.user.tenantId },
  });

  if (!tenant) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  return NextResponse.json(tenant);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();
  const { name, logo } = body;

  const tenant = await prisma.tenant.update({
    where: { id: session.user.tenantId },
    data: { name, logo },
  });

  return NextResponse.json(tenant);
}
