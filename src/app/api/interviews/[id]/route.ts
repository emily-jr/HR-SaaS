import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();

  await prisma.interview.updateMany({
    where: { id: params.id },
    data: body,
  });

  const updated = await prisma.interview.findUnique({
    where: { id: params.id },
    include: {
      candidate: { select: { id: true, name: true } },
      interviewer: { select: { id: true, name: true } },
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

  await prisma.interview.deleteMany({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
