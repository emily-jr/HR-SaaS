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

  const where: any = {
    tenantId: session.user.tenantId,
    ...(status && { status }),
  };

  const [total, cycles] = await Promise.all([
    prisma.performanceCycle.count({ where }),
    prisma.performanceCycle.findMany({
      where,
      include: {
        _count: { select: { kpis: true, reviews: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, data: cycles });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();
  const { name, startDate, endDate } = body;

  const cycle = await prisma.performanceCycle.create({
    data: {
      tenantId: session.user.tenantId,
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: "DRAFT",
    },
  });

  return NextResponse.json(cycle, { status: 201 });
}
