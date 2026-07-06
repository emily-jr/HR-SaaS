import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cycleId = searchParams.get("cycleId");
  const employeeId = searchParams.get("employeeId");

  const where: any = {
    cycle: { tenantId: session.user.tenantId },
    ...(cycleId && { cycleId }),
    ...(employeeId && { employeeId }),
  };

  const kpis = await prisma.kPI.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const data = kpis.map((k) => ({
    ...k,
    weight: Number(k.weight),
    score: k.score ? Number(k.score) : null,
  }));

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();
  const { cycleId, employeeId, name, target, weight } = body;

  const kpi = await prisma.kPI.create({
    data: {
      cycleId,
      employeeId,
      name,
      target,
      weight: new Prisma.Decimal(weight),
    },
  });

  return NextResponse.json(
    { ...kpi, weight: Number(kpi.weight) },
    { status: 201 }
  );
}
