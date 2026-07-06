import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const employee = await prisma.employee.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      department: true,
      position: true,
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  return NextResponse.json(employee);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();

  const employee = await prisma.employee.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: body,
  });

  if (employee.count === 0) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  const updated = await prisma.employee.findUnique({
    where: { id: params.id },
    include: {
      department: { select: { id: true, name: true } },
      position: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  await prisma.employee.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: { status: "RESIGNED" },
  });

  return NextResponse.json({ success: true });
}
