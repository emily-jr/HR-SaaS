import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const departments = await prisma.department.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, parentId: true },
  });

  return NextResponse.json(departments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();
  const department = await prisma.department.create({
    data: {
      tenantId: session.user.tenantId,
      ...body,
    },
  });

  return NextResponse.json(department, { status: 201 });
}
