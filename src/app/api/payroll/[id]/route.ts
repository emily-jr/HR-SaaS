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

  const record = await prisma.salaryRecord.findFirst({
    where: { id: params.id, tenantId: session.user.tenantId },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true } },
    },
  });

  if (!record) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  return NextResponse.json({
    ...record,
    baseSalary: Number(record.baseSalary),
    overtimePay: Number(record.overtimePay),
    bonus: Number(record.bonus),
    deduction: Number(record.deduction),
    socialIns: Number(record.socialIns),
    housingFund: Number(record.housingFund),
    tax: Number(record.tax),
    netSalary: Number(record.netSalary),
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

  // Convert decimal fields
  const decimalFields = [
    "baseSalary", "overtimePay", "bonus", "deduction",
    "socialIns", "housingFund", "tax", "netSalary",
  ];
  const data: any = {};
  for (const [key, value] of Object.entries(body)) {
    if (decimalFields.includes(key) && typeof value === "number") {
      data[key] = new Prisma.Decimal(value);
    } else {
      data[key] = value;
    }
  }

  const result = await prisma.salaryRecord.updateMany({
    where: { id: params.id, tenantId: session.user.tenantId },
    data,
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  const updated = await prisma.salaryRecord.findUnique({
    where: { id: params.id },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true } },
    },
  });

  if (updated) {
    return NextResponse.json({
      ...updated,
      baseSalary: Number(updated.baseSalary),
      overtimePay: Number(updated.overtimePay),
      bonus: Number(updated.bonus),
      deduction: Number(updated.deduction),
      socialIns: Number(updated.socialIns),
      housingFund: Number(updated.housingFund),
      tax: Number(updated.tax),
      netSalary: Number(updated.netSalary),
    });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  await prisma.salaryRecord.deleteMany({
    where: { id: params.id, tenantId: session.user.tenantId },
  });

  return NextResponse.json({ success: true });
}
