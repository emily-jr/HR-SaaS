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

  const candidate = await prisma.candidate.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      jobPosting: { select: { id: true, title: true } },
      interviews: {
        include: {
          interviewer: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!candidate) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  return NextResponse.json(candidate);
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

  const result = await prisma.candidate.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data: body,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  const updated = await prisma.candidate.findUnique({
    where: { id: params.id },
    include: {
      jobPosting: { select: { id: true, title: true } },
      interviews: {
        include: {
          interviewer: { select: { id: true, name: true } },
        },
      },
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

  await prisma.candidate.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json({ success: true });
}
