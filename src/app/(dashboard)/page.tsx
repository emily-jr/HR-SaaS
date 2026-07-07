"use client";

import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Typography, Spin } from "antd";
import {
  TeamOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  TrophyOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { useSession } from "next-auth/react";

const { Title, Text } = Typography;

interface DashboardStats {
  activeEmployees: number;
  totalEmployees: number;
  attendanceRate: number;
  pendingSalaryCount: number;
  openJobs: number;
  activeReviews: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          setStats(await res.json());
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const roleMap: Record<string, string> = {
    SUPER_ADMIN: "超级管理员",
    TENANT_ADMIN: "租户管理员",
    HR_MANAGER: "HR 经理",
    DEPT_MANAGER: "部门经理",
    EMPLOYEE: "员工",
  };

  const statCards = [
    {
      title: "在职员工",
      value: stats?.activeEmployees ?? 0,
      suffix: stats ? ` / ${stats.totalEmployees}` : "",
      icon: <TeamOutlined />,
      color: "#1677ff",
    },
    {
      title: "本月出勤率",
      value: stats?.attendanceRate ?? 0,
      suffix: "%",
      icon: <ClockCircleOutlined />,
      color: "#52c41a",
    },
    {
      title: "本月待发工资",
      value: stats?.pendingSalaryCount ?? 0,
      suffix: " 条",
      icon: <DollarOutlined />,
      color: "#faad14",
    },
    {
      title: "在招职位",
      value: stats?.openJobs ?? 0,
      suffix: " 个",
      icon: <UserSwitchOutlined />,
      color: "#722ed1",
    },
    {
      title: "绩效评估中",
      value: stats?.activeReviews ?? 0,
      suffix: " 人",
      icon: <TrophyOutlined />,
      color: "#eb2f96",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <Title level={4} className="!mb-1">
          欢迎回来，{session?.user?.employeeName || session?.user?.name}
        </Title>
        <Text type="secondary">
          租户：{session?.user?.tenantName} | 角色：{roleMap[session?.user?.role ?? ""] || session?.user?.role}
        </Text>
      </div>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {statCards.map((stat) => (
            <Col xs={24} sm={12} lg={8} xl={4} key={stat.title}>
              <Card>
                <Statistic
                  title={stat.title}
                  value={stat.value}
                  suffix={stat.suffix}
                  prefix={
                    <span style={{ color: stat.color }}>{stat.icon}</span>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Spin>

      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} lg={16}>
          <Card title="快捷入口">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {[
                { label: "员工管理", icon: <TeamOutlined />, color: "#1677ff" },
                { label: "考勤管理", icon: <ClockCircleOutlined />, color: "#52c41a" },
                { label: "薪酬管理", icon: <DollarOutlined />, color: "#faad14" },
                { label: "招聘管理", icon: <UserSwitchOutlined />, color: "#722ed1" },
                { label: "绩效管理", icon: <TrophyOutlined />, color: "#eb2f96" },
              ].map((item) => (
                <Card.Grid
                  key={item.label}
                  style={{
                    width: 160,
                    textAlign: "center",
                    padding: "16px 12px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ color: item.color, fontSize: 24, marginBottom: 8 }}>
                    {item.icon}
                  </div>
                  <Text>{item.label}</Text>
                </Card.Grid>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="系统信息">
            <div style={{ lineHeight: 2.2 }}>
              <Text type="secondary">平台版本：</Text>
              <Text>v1.0.0</Text>
              <br />
              <Text type="secondary">当前时间：</Text>
              <Text>{new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}</Text>
              <br />
              <Text type="secondary">租户状态：</Text>
              <Text style={{ color: "#52c41a" }}>● 正常</Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
