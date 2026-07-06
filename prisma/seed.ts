import { PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 开始填充种子数据...");

  // 1. 创建租户
  const tenant = await prisma.tenant.upsert({
    where: { id: "demo-tenant" },
    update: {},
    create: {
      id: "demo-tenant",
      name: "演示科技有限公司",
    },
  });
  console.log("✅ 租户创建完成:", tenant.name);

  // 2. 创建部门
  const deptHR = await prisma.department.create({
    data: {
      tenantId: tenant.id,
      name: "人力资源部",
      sortOrder: 1,
    },
  });

  const deptTech = await prisma.department.create({
    data: {
      tenantId: tenant.id,
      name: "技术研发部",
      sortOrder: 2,
    },
  });

  const deptSales = await prisma.department.create({
    data: {
      tenantId: tenant.id,
      name: "销售部",
      sortOrder: 3,
    },
  });
  console.log("✅ 部门创建完成");

  // 3. 创建岗位
  const posHRM = await prisma.position.create({
    data: {
      tenantId: tenant.id,
      name: "人事经理",
      deptId: deptHR.id,
    },
  });

  const posDev = await prisma.position.create({
    data: {
      tenantId: tenant.id,
      name: "高级开发工程师",
      deptId: deptTech.id,
    },
  });

  const posSales = await prisma.position.create({
    data: {
      tenantId: tenant.id,
      name: "销售经理",
      deptId: deptSales.id,
    },
  });
  console.log("✅ 岗位创建完成");

  // 4. 创建员工
  const emp1 = await prisma.employee.create({
    data: {
      tenantId: tenant.id,
      employeeNo: "EMP001",
      name: "张管理",
      gender: "FEMALE",
      phone: "13800001001",
      email: "zhanghr@demo.com",
      hireDate: new Date("2023-01-01"),
      deptId: deptHR.id,
      positionId: posHRM.id,
      baseSalary: 25000,
      socialInsCity: "北京",
    },
  });

  const emp2 = await prisma.employee.create({
    data: {
      tenantId: tenant.id,
      employeeNo: "EMP002",
      name: "李开发",
      gender: "MALE",
      phone: "13800001002",
      email: "lidev@demo.com",
      hireDate: new Date("2023-03-15"),
      deptId: deptTech.id,
      positionId: posDev.id,
      baseSalary: 30000,
      socialInsCity: "北京",
    },
  });

  const emp3 = await prisma.employee.create({
    data: {
      tenantId: tenant.id,
      employeeNo: "EMP003",
      name: "王销售",
      gender: "MALE",
      phone: "13800001003",
      email: "wangsales@demo.com",
      hireDate: new Date("2023-06-01"),
      deptId: deptSales.id,
      positionId: posSales.id,
      baseSalary: 20000,
      socialInsCity: "上海",
    },
  });
  console.log("✅ 员工创建完成");

  // 5. 创建用户账号 (密码: 123456)
  const hashedPassword = await hash("123456", 12);

  await prisma.user.upsert({
    where: { id: "admin-user" },
    update: {},
    create: {
      id: "admin-user",
      tenantId: tenant.id,
      email: "admin@demo.com",
      passwordHash: hashedPassword,
      name: "张管理",
      role: UserRole.TENANT_ADMIN,
      employeeId: emp1.id,
    },
  });

  await prisma.user.upsert({
    where: { id: "dev-user" },
    update: {},
    create: {
      id: "dev-user",
      tenantId: tenant.id,
      email: "dev@demo.com",
      passwordHash: hashedPassword,
      name: "李开发",
      role: UserRole.EMPLOYEE,
      employeeId: emp2.id,
    },
  });

  await prisma.user.upsert({
    where: { id: "sales-user" },
    update: {},
    create: {
      id: "sales-user",
      tenantId: tenant.id,
      email: "sales@demo.com",
      passwordHash: hashedPassword,
      name: "王销售",
      role: UserRole.DEPT_MANAGER,
      employeeId: emp3.id,
    },
  });
  console.log("✅ 用户账号创建完成 (密码均为: 123456)");

  console.log("\n📋 登录信息:");
  console.log("  租户ID: demo");
  console.log("  管理员: admin@demo.com / 123456");
  console.log("  员工:   dev@demo.com / 123456");
  console.log("  经理:   sales@demo.com / 123456");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
