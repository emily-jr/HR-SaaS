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
  const keyword = searchParams.get("keyword") || "";
  const deptId = searchParams.get("deptId");
  const status = searchParams.get("status");

  const where: any = {
    tenantId: session.user.tenantId,
    ...(keyword && {
      OR: [
        { name: { contains: keyword } },
        { employeeNo: { contains: keyword } },
        { phone: { contains: keyword } },
        { email: { contains: keyword } },
      ],
    }),
    ...(deptId && { deptId }),
    ...(status && { status }),
  };

  const [total, employees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, data: employees });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();
  const { employeeNo, name, ...rest } = body;

  const employee = await prisma.employee.create({
    data: {
      tenantId: session.user.tenantId,
      employeeNo: employeeNo || `EMP${Date.now()}`,
      name,
      ...rest,
    },
    include: {
      department: { select: { id: true, name: true } },
      position: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(employee, { status: 201 });
}
