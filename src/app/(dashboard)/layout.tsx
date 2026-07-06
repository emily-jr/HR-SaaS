"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ProLayout } from "@ant-design/pro-layout";
import {
  DashboardOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  IdcardOutlined,
  TrophyOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Avatar, Dropdown, Space, Typography, theme } from "antd";
import type { MenuDataItem } from "@ant-design/pro-layout";

const { Text } = Typography;

const menuData: MenuDataItem[] = [
  {
    path: "/",
    name: "工作台",
    icon: <DashboardOutlined />,
  },
  {
    path: "/employees",
    name: "员工管理",
    icon: <TeamOutlined />,
  },
  {
    path: "/attendance",
    name: "考勤管理",
    icon: <ClockCircleOutlined />,
  },
  {
    path: "/payroll",
    name: "薪酬管理",
    icon: <DollarOutlined />,
  },
  {
    path: "/recruitment",
    name: "招聘管理",
    icon: <IdcardOutlined />,
  },
  {
    path: "/performance",
    name: "绩效管理",
    icon: <TrophyOutlined />,
  },
  {
    path: "/settings",
    name: "系统设置",
    icon: <SettingOutlined />,
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();

  const avatarMenu = {
    items: [
      {
        key: "profile",
        icon: <UserOutlined />,
        label: `${session?.user?.employeeName || session?.user?.name || "用户"}`,
        disabled: true,
      },
      { type: "divider" as const },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "退出登录",
        danger: true,
      },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === "logout") {
        signOut({ callbackUrl: "/login" });
      }
    },
  };

  return (
    <ProLayout
      title="HR SaaS"
      logo="https://img.alicdn.com/imgextra/i2/O1CN01KqjGOc1URW1GaxMTN_!!6000000002536-55-tps-64-64.svg"
      route={{ path: "/", routes: menuData }}
      location={{ pathname }}
      menuDataRender={() => menuData}
      menuItemRender={(item, dom) => (
        <a onClick={() => item.path && router.push(item.path)}>
          {dom}
        </a>
      )}
      collapsed={collapsed}
      onCollapse={setCollapsed}
      avatarProps={{
        icon: <UserOutlined />,
        style: { backgroundColor: token.colorPrimary },
        render: (_, defaultDom) => (
          <Dropdown menu={avatarMenu} trigger={["click"]}>
            <Space className="cursor-pointer">
              {defaultDom}
              <Text className="hidden md:inline">
                {session?.user?.employeeName || session?.user?.name || "用户"}
              </Text>
            </Space>
          </Dropdown>
        ),
      }}
      token={{
        header: {
          colorBgHeader: token.colorBgContainer,
          heightLayoutHeader: 56,
        },
        sider: {
          colorMenuBackground: token.colorBgContainer,
        },
      }}
    >
      <div style={{ padding: 24, minHeight: "calc(100vh - 56px)" }}>
        {children}
      </div>
    </ProLayout>
  );
}
