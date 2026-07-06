import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

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
  if (body.weight !== undefined) data.weight = new Prisma.Decimal(body.weight);
  if (body.score !== undefined) data.score = new Prisma.Decimal(body.score);

  await prisma.kPI.updateMany({
    where: { id: params.id },
    data,
  });

  const updated = await prisma.kPI.findUnique({ where: { id: params.id } });

  if (updated) {
    return NextResponse.json({
      ...updated,
      weight: Number(updated.weight),
      score: updated.score ? Number(updated.score) : null,
    });
  }

  return NextResponse.json({ error: "未找到" }, { status: 404 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  await prisma.kPI.deleteMany({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
