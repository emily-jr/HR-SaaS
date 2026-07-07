"use client";

import { Suspense, useState } from "react";

export const dynamic = "force-dynamic";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  message,
  Space,
  Spin,
} from "antd";
import { UserOutlined, LockOutlined, LoginOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: {
    email: string;
    password: string;
    tenantId: string;
  }) => {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        tenantId: values.tenantId,
        redirect: false,
      });

      if (result?.error) {
        message.error("登录失败，请检查邮箱、密码和租户ID");
      } else {
        message.success("登录成功");
        const callbackUrl = searchParams.get("callbackUrl") || "/";
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      message.error("登录异常，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      name="login"
      layout="vertical"
      onFinish={onFinish}
      autoComplete="off"
      size="large"
      initialValues={{ tenantId: "demo" }}
    >
      <Form.Item
        name="tenantId"
        label="租户ID"
        rules={[{ required: true, message: "请输入租户ID" }]}
      >
        <Input placeholder="输入租户ID" />
      </Form.Item>

      <Form.Item
        name="email"
        label="邮箱"
        rules={[
          { required: true, message: "请输入邮箱" },
          { type: "email", message: "请输入有效邮箱" },
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder="admin@company.com"
        />
      </Form.Item>

      <Form.Item
        name="password"
        label="密码"
        rules={[{ required: true, message: "请输入密码" }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="输入密码"
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          block
          loading={loading}
          icon={<LoginOutlined />}
        >
          登录
        </Button>
      </Form.Item>
    </Form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card
        className="w-full max-w-md shadow-lg"
        styles={{ body: { padding: 40 } }}
      >
        <Space direction="vertical" size="large" className="w-full">
          <div className="text-center">
            <Title level={3} className="!mb-1">
              HR SaaS 平台
            </Title>
            <Text type="secondary">一体化人力资源管理系统</Text>
          </div>

          <Suspense fallback={<Spin className="flex justify-center" />}>
            <LoginForm />
          </Suspense>
        </Space>
      </Card>
    </div>
  );
}
