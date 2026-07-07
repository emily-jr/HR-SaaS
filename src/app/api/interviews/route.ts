import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const candidateId = searchParams.get("candidateId");
  const employeeId = searchParams.get("employeeId");
  const result = searchParams.get("result");

  const where: any = {
    candidate: { tenantId: session.user.tenantId },
    ...(candidateId && { candidateId }),
    ...(employeeId && { employeeId }),
    ...(result && { result }),
  };

  const interviews = await prisma.interview.findMany({
    where,
    include: {
      candidate: { select: { id: true, name: true, jobPosting: { select: { title: true } } } },
      interviewer: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });

  return NextResponse.json(interviews);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();
  const { candidateId, employeeId, scheduledAt } = body;

  const interview = await prisma.interview.create({
    data: {
      candidateId,
      employeeId: employeeId || session.user.employeeId,
      scheduledAt: new Date(scheduledAt),
    },
    include: {
      candidate: { select: { id: true, name: true } },
      interviewer: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(interview, { status: 201 });
}
