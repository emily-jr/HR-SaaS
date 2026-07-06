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
  const employeeId = searchParams.get("employeeId");
  const keyword = searchParams.get("keyword") || "";
  const type = searchParams.get("type");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const where: any = {
    tenantId: session.user.tenantId,
    ...(employeeId && { employeeId }),
    ...(type && { type }),
    ...((startDate || endDate) && {
      time: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate + "T23:59:59.999Z") }),
      },
    }),
    ...(keyword && {
      employee: {
        name: { contains: keyword },
      },
    }),
  };

  const [total, records] = await Promise.all([
    prisma.attendanceRecord.count({ where }),
    prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, employeeNo: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { time: "desc" },
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, data: records });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();
  const { employeeId, type, time, location, ipAddress, remark } = body;

  const record = await prisma.attendanceRecord.create({
    data: {
      tenantId: session.user.tenantId,
      employeeId: employeeId || session.user.employeeId,
      type,
      time: time ? new Date(time) : new Date(),
      location,
      ipAddress,
      remark,
    },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true } },
    },
  });

  return NextResponse.json(record, { status: 201 });
}
