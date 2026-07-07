
-- Tenant
INSERT INTO "tenants" ("id", "name", "updated_at") VALUES ('demo-tenant', '演示科技有限公司', NOW());

-- Departments
INSERT INTO "departments" ("id", "tenant_id", "name", "sort_order", "updated_at") VALUES ('dept-hr', 'demo-tenant', '人力资源部', 1, NOW());
INSERT INTO "departments" ("id", "tenant_id", "name", "sort_order", "updated_at") VALUES ('dept-tech', 'demo-tenant', '技术研发部', 2, NOW());
INSERT INTO "departments" ("id", "tenant_id", "name", "sort_order", "updated_at") VALUES ('dept-sales', 'demo-tenant', '销售部', 3, NOW());

-- Positions
INSERT INTO "positions" ("id", "tenant_id", "name", "dept_id", "updated_at") VALUES ('pos-hrm', 'demo-tenant', '人事经理', 'dept-hr', NOW());
INSERT INTO "positions" ("id", "tenant_id", "name", "dept_id", "updated_at") VALUES ('pos-dev', 'demo-tenant', '高级开发工程师', 'dept-tech', NOW());
INSERT INTO "positions" ("id", "tenant_id", "name", "dept_id", "updated_at") VALUES ('pos-sales', 'demo-tenant', '销售经理', 'dept-sales', NOW());

-- Employees
INSERT INTO "employees" ("id", "tenant_id", "employee_no", "name", "gender", "phone", "email", "hire_date", "dept_id", "position_id", "base_salary", "social_ins_city", "updated_at") VALUES ('emp-1', 'demo-tenant', 'EMP001', '张管理', 'FEMALE', '13800001001', 'zhanghr@demo.com', '2023-01-01', 'dept-hr', 'pos-hrm', 25000, '北京', NOW());
INSERT INTO "employees" ("id", "tenant_id", "employee_no", "name", "gender", "phone", "email", "hire_date", "dept_id", "position_id", "base_salary", "social_ins_city", "updated_at") VALUES ('emp-2', 'demo-tenant', 'EMP002', '李开发', 'MALE', '13800001002', 'lidev@demo.com', '2023-03-15', 'dept-tech', 'pos-dev', 30000, '北京', NOW());
INSERT INTO "employees" ("id", "tenant_id", "employee_no", "name", "gender", "phone", "email", "hire_date", "dept_id", "position_id", "base_salary", "social_ins_city", "updated_at") VALUES ('emp-3', 'demo-tenant', 'EMP003', '王销售', 'MALE', '13800001003', 'wangsales@demo.com', '2023-06-01', 'dept-sales', 'pos-sales', 20000, '上海', NOW());

-- Users (password: 123456)
INSERT INTO "users" ("id", "tenant_id", "email", "password_hash", "name", "role", "employee_id", "updated_at") VALUES ('admin-user', 'demo-tenant', 'admin@demo.com', '$2a$12$9dzqc8wV40KJp56fOLTdVu71zjlKjlV3gFZZcXQcbsKisZTSOFCp.', '张管理', 'TENANT_ADMIN', 'emp-1', NOW());
INSERT INTO "users" ("id", "tenant_id", "email", "password_hash", "name", "role", "employee_id", "updated_at") VALUES ('dev-user', 'demo-tenant', 'dev@demo.com', '$2a$12$9dzqc8wV40KJp56fOLTdVu71zjlKjlV3gFZZcXQcbsKisZTSOFCp.', '李开发', 'EMPLOYEE', 'emp-2', NOW());
INSERT INTO "users" ("id", "tenant_id", "email", "password_hash", "name", "role", "employee_id", "updated_at") VALUES ('sales-user', 'demo-tenant', 'sales@demo.com', '$2a$12$9dzqc8wV40KJp56fOLTdVu71zjlKjlV3gFZZcXQcbsKisZTSOFCp.', '王销售', 'DEPT_MANAGER', 'emp-3', NOW());
