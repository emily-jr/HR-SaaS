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

  const record = await prisma.attendanceRecord.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true } },
    },
  });

  if (!record) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  return NextResponse.json(record);
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

  const record = await prisma.attendanceRecord.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: body,
  });

  if (record.count === 0) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  const updated = await prisma.attendanceRecord.findUnique({
    where: { id: params.id },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true } },
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

  await prisma.attendanceRecord.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json({ success: true });
}
