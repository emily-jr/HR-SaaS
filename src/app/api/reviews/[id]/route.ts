import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const review = await prisma.review.findFirst({
    where: { id: params.id, cycle: { tenantId: session.user.tenantId } },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true } },
      cycle: { select: { id: true, name: true } },
    },
  });

  if (!review) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  return NextResponse.json({
    ...review,
    selfScore: review.selfScore ? Number(review.selfScore) : null,
    mgrScore: review.mgrScore ? Number(review.mgrScore) : null,
  });
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
  const data: any = { ...body };
  if (body.selfScore !== undefined) data.selfScore = new Prisma.Decimal(body.selfScore);
  if (body.mgrScore !== undefined) data.mgrScore = new Prisma.Decimal(body.mgrScore);

  const result = await prisma.review.updateMany({
    where: { id: params.id },
    data,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  const updated = await prisma.review.findUnique({
    where: { id: params.id },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true } },
      cycle: { select: { id: true, name: true } },
    },
  });

  if (updated) {
    return NextResponse.json({
      ...updated,
      selfScore: updated.selfScore ? Number(updated.selfScore) : null,
      mgrScore: updated.mgrScore ? Number(updated.mgrScore) : null,
    });
  }

  return NextResponse.json({ success: true });
}
