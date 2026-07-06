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

  const request = await prisma.leaveRequest.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true } },
    },
  });

  if (!request) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  return NextResponse.json(request);
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

  // Handle approval/rejection
  const data: any = { ...body };
  if (body.status === "APPROVED" || body.status === "REJECTED") {
    data.approvedBy = session.user.employeeId;
    data.approvedAt = new Date();
  }

  const result = await prisma.leaveRequest.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  const updated = await prisma.leaveRequest.findUnique({
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

  await prisma.leaveRequest.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json({ success: true });
}
