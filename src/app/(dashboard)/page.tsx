"use client";

import { Card, Col, Row, Statistic, Typography } from "antd";
import {
  TeamOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  TrophyOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { useSession } from "next-auth/react";

const { Title, Text } = Typography;

export default function DashboardPage() {
  const { data: session } = useSession();

  const stats = [
    {
      title: "在职员工",
      value: 0,
      icon: <TeamOutlined />,
      color: "#1677ff",
    },
    {
      title: "本月出勤率",
      value: "0%",
      icon: <ClockCircleOutlined />,
      color: "#52c41a",
    },
    {
      title: "本月待发工资",
      value: "¥0",
      icon: <DollarOutlined />,
      color: "#faad14",
    },
    {
      title: "在招职位",
      value: 0,
      icon: <UserSwitchOutlined />,
      color: "#722ed1",
    },
    {
      title: "绩效评估中",
      value: 0,
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
          租户：{session?.user?.tenantName} | 角色：{session?.user?.role}
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {stats.map((stat) => (
          <Col xs={24} sm={12} lg={8} xl={4} key={stat.title}>
            <Card>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={
                  <span style={{ color: stat.color }}>{stat.icon}</span>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} lg={16}>
          <Card title="最近动态">
            <Text type="secondary">暂无数据</Text>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="待办事项">
            <Text type="secondary">暂无待办</Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
