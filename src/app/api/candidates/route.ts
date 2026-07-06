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
  const jobId = searchParams.get("jobId");
  const keyword = searchParams.get("keyword") || "";

  const where: any = {
    tenantId: session.user.tenantId,
    ...(status && { status }),
    ...(jobId && { jobId }),
    ...(keyword && {
      OR: [
        { name: { contains: keyword } },
        { phone: { contains: keyword } },
        { email: { contains: keyword } },
      ],
    }),
  };

  const [total, candidates] = await Promise.all([
    prisma.candidate.count({ where }),
    prisma.candidate.findMany({
      where,
      include: {
        jobPosting: { select: { id: true, title: true } },
        interviews: {
          include: {
            interviewer: { select: { id: true, name: true } },
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, data: candidates });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();

  const candidate = await prisma.candidate.create({
    data: {
      tenantId: session.user.tenantId,
      ...body,
    },
    include: {
      jobPosting: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(candidate, { status: 201 });
}
