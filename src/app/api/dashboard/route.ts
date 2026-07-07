import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const tenantId = session.user.tenantId;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const [
    activeEmployees,
    totalEmployees,
    monthAttendance,
    pendingSalary,
    openJobs,
    activeReviews,
  ] = await Promise.all([
    // 在职员工数
    prisma.employee.count({
      where: { tenantId, status: "ACTIVE" },
    }),
    // 总员工数
    prisma.employee.count({
      where: { tenantId },
    }),
    // 本月打卡天数 (去重员工-日期)
    prisma.attendanceRecord.findMany({
      where: {
        tenantId,
        time: { gte: monthStart, lte: monthEnd },
      },
      select: { employeeId: true, time: true },
    }),
    // 本月待发工资条数
    prisma.salaryRecord.count({
      where: {
        tenantId,
        year,
        month,
        isIssued: false,
      },
    }),
    // 在招职位数
    prisma.jobPosting.count({
      where: { tenantId, status: "OPEN" },
    }),
    // 进行中的绩效评估数
    prisma.review.count({
      where: {
        cycle: { tenantId, status: "ACTIVE" },
      },
    }),
  ]);

  // 计算本月出勤率
  const workDays = getWorkDaysInMonth(year, month);
  const uniqueAttendanceDays = new Set(
    monthAttendance.map((r) => `${r.employeeId}_${r.time.toISOString().slice(0, 10)}`)
  ).size;
  const totalPossible = activeEmployees * workDays;
  const attendanceRate =
    totalPossible > 0
      ? Math.round((uniqueAttendanceDays / totalPossible) * 100)
      : 0;

  return NextResponse.json({
    activeEmployees,
    totalEmployees,
    attendanceRate,
    pendingSalaryCount: pendingSalary,
    openJobs,
    activeReviews,
  });
}

/** 粗略计算当月工作日 (不含周末) */
function getWorkDaysInMonth(year: number, month: number): number {
  let count = 0;
  const days = new Date(year, month, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}
