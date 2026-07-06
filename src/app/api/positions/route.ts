import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const deptId = searchParams.get("deptId");

  const positions = await prisma.position.findMany({
    where: {
      tenantId: session.user.tenantId,
      ...(deptId && { deptId }),
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, deptId: true },
  });

  return NextResponse.json(positions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();
  const position = await prisma.position.create({
    data: {
      tenantId: session.user.tenantId,
      ...body,
    },
  });

  return NextResponse.json(position, { status: 201 });
}
