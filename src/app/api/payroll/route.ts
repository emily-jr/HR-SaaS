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
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const year = parseInt(searchParams.get("year") || "0");
  const month = parseInt(searchParams.get("month") || "0");
  const employeeId = searchParams.get("employeeId");
  const isIssued = searchParams.get("isIssued");
  const keyword = searchParams.get("keyword") || "";

  const where: any = {
    tenantId: session.user.tenantId,
    ...(year > 0 && { year }),
    ...(month > 0 && { month }),
    ...(employeeId && { employeeId }),
    ...(isIssued !== null && isIssued !== undefined && isIssued !== "" && {
      isIssued: isIssued === "true",
    }),
    ...(keyword && {
      employee: {
        name: { contains: keyword },
      },
    }),
  };

  const [total, records] = await Promise.all([
    prisma.salaryRecord.count({ where }),
    prisma.salaryRecord.findMany({
      where,
      include: {
        employee: { select: { id: true, name: true, employeeNo: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  // Format decimals to numbers for JSON response
  const data = records.map((r) => ({
    ...r,
    baseSalary: Number(r.baseSalary),
    overtimePay: Number(r.overtimePay),
    bonus: Number(r.bonus),
    deduction: Number(r.deduction),
    socialIns: Number(r.socialIns),
    housingFund: Number(r.housingFund),
    tax: Number(r.tax),
    netSalary: Number(r.netSalary),
  }));

  return NextResponse.json({ total, page, pageSize, data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const body = await req.json();

  // Support batch generation
  if (body.batch) {
    const { employeeIds, year, month } = body;

    // Get employees with base salary
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        tenantId: session.user.tenantId,
        status: { not: "RESIGNED" },
      },
    });

    const records = [];
    for (const emp of employees) {
      const baseSalary = Number(emp.baseSalary) || 0;
      // Default calculation: base + overtime(0) + bonus(0) - deduction(0) - socialIns(10%) - housingFund(5%)
      const socialIns = Math.round(baseSalary * 0.1 * 100) / 100;
      const housingFund = Math.round(baseSalary * 0.05 * 100) / 100;
      const taxableIncome = baseSalary - socialIns - housingFund;
      const tax = Math.max(0, Math.round((taxableIncome - 5000) * 0.03 * 100) / 100);
      const netSalary =
        Math.round((baseSalary - socialIns - housingFund - tax) * 100) / 100;

      const record = await prisma.salaryRecord.upsert({
        where: {
          tenantId_employeeId_year_month: {
            tenantId: session.user.tenantId,
            employeeId: emp.id,
            year,
            month,
          },
        },
        update: {
          baseSalary,
          socialIns,
          housingFund,
          tax,
          netSalary,
        },
        create: {
          tenantId: session.user.tenantId,
          employeeId: emp.id,
          year,
          month,
          baseSalary,
          socialIns,
          housingFund,
          tax,
          netSalary,
        },
        include: {
          employee: { select: { id: true, name: true, employeeNo: true } },
        },
      });

      records.push({
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

    return NextResponse.json(records, { status: 201 });
  }

  // Single record
  const { employeeId, year, month, baseSalary, overtimePay, bonus, deduction, socialIns, housingFund, tax, netSalary } = body;

  const record = await prisma.salaryRecord.upsert({
    where: {
      tenantId_employeeId_year_month: {
        tenantId: session.user.tenantId,
        employeeId,
        year,
        month,
      },
    },
    update: {
      baseSalary: new Prisma.Decimal(baseSalary),
      overtimePay: new Prisma.Decimal(overtimePay || 0),
      bonus: new Prisma.Decimal(bonus || 0),
      deduction: new Prisma.Decimal(deduction || 0),
      socialIns: new Prisma.Decimal(socialIns || 0),
      housingFund: new Prisma.Decimal(housingFund || 0),
      tax: new Prisma.Decimal(tax || 0),
      netSalary: new Prisma.Decimal(netSalary),
    },
    create: {
      tenantId: session.user.tenantId,
      employeeId,
      year,
      month,
      baseSalary: new Prisma.Decimal(baseSalary),
      overtimePay: new Prisma.Decimal(overtimePay || 0),
      bonus: new Prisma.Decimal(bonus || 0),
      deduction: new Prisma.Decimal(deduction || 0),
      socialIns: new Prisma.Decimal(socialIns || 0),
      housingFund: new Prisma.Decimal(housingFund || 0),
      tax: new Prisma.Decimal(tax || 0),
      netSalary: new Prisma.Decimal(netSalary),
    },
    include: {
      employee: { select: { id: true, name: true, employeeNo: true } },
    },
  });

  return NextResponse.json(
    {
      ...record,
      baseSalary: Number(record.baseSalary),
      overtimePay: Number(record.overtimePay),
      bonus: Number(record.bonus),
      deduction: Number(record.deduction),
      socialIns: Number(record.socialIns),
      housingFund: Number(record.housingFund),
      tax: Number(record.tax),
      netSalary: Number(record.netSalary),
    },
    { status: 201 }
  );
}
