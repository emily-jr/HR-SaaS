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
  const keyword = searchParams.get("keyword") || "";

  const where: any = {
    tenantId: session.user.tenantId,
    ...(status && { status }),
    ...(keyword && {
      OR: [
        { title: { contains: keyword } },
        { description: { contains: keyword } },
      ],
    }),
  };

  const [total, postings] = await Promise.all([
    prisma.jobPosting.count({ where }),
    prisma.jobPosting.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
        _count: { select: { candidates: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ total, page, pageSize, data: postings });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();

  const posting = await prisma.jobPosting.create({
    data: {
      tenantId: session.user.tenantId,
      ...body,
    },
    include: {
      department: { select: { id: true, name: true } },
      position: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(posting, { status: 201 });
}
