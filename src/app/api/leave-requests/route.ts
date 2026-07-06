import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const employeeId = searchParams.get("employeeId");
  const keyword = searchParams.get("keyword") || "";

  const where: any = {
    tenantId: session.user.tenantId,
    ...(status && { status }),
    ...(type && { type }),
    ...(employeeId && { employeeId }),
    ...(keyword && {
      employee: {
        name: { contains: keyword },
      },
    }),
  };

  const [total, requests] = await Promise.all([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, employeeNo: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, data: requests });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();
  const { employeeId, type, startDate, endDate, days, reason } = body;

  const request = await prisma.leaveRequest.create({
    data: {
      tenantId: session.user.tenantId,
      employeeId: employeeId || session.user.employeeId,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      days,
      reason,
    },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true } },
    },
  });

  return NextResponse.json(request, { status: 201 });
}
