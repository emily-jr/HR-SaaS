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
  const status = searchParams.get("status");

  const where: any = {
    cycle: { tenantId: session.user.tenantId },
    ...(cycleId && { cycleId }),
    ...(employeeId && { employeeId }),
    ...(status && { status }),
  };

  const reviews = await prisma.review.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, employeeNo: true } },
      cycle: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = reviews.map((r) => ({
    ...r,
    selfScore: r.selfScore ? Number(r.selfScore) : null,
    mgrScore: r.mgrScore ? Number(r.mgrScore) : null,
  }));

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();

  const review = await prisma.review.create({
    data: {
      cycleId: body.cycleId,
      employeeId: body.employeeId,
    },
    include: {
      employee: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(review, { status: 201 });
}
