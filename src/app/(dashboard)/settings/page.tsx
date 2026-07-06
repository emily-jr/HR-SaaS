"use client";

import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  message,
  Card,
  Row,
  Col,
  Typography,
  Popconfirm,
  Tabs,
  Divider,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { useSession } from "next-auth/react";

const { Title, Text } = Typography;

// ─── Types ───
interface Department {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
}

interface Position {
  id: string;
  name: string;
  deptId: string;
}

interface Tenant {
  id: string;
  name: string;
  logo: string | null;
}

// ─── Tab 1: Department Management ───
function DepartmentManagement() {
  const [data, setData] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Department | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/departments");
      const json = await res.json();
      setData(json);
    } catch {
      message.error("获取数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({ sortOrder: 0 });
    setEditModalOpen(true);
  };

  const handleEdit = (record: Department) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const url = editingItem
        ? `/api/departments/${editingItem.id}`
        : "/api/departments";
      const method = editingItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success(editingItem ? "更新成功" : "创建成功");
        setEditModalOpen(false);
        fetchData();
      } else {
        message.error("保存失败");
      }
    } catch {
      // validation error
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/departments/${id}`, { method: "DELETE" });
    message.success("删除成功");
    fetchData();
  };

  const columns: ColumnsType<Department> = [
    {
      title: "部门名称",
      dataIndex: "name",
      width: 200,
    },
    {
      title: "上级部门",
      dataIndex: "parentId",
      width: 150,
      render: (v: string | null) =>
        v ? data.find((d) => d.id === v)?.name || v : "—",
    },
    {
      title: "排序",
      dataIndex: "sortOrder",
      width: 80,
    },
    {
      title: "操作",
      width: 140,
      render: (_: any, record: Department) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Title level={4} className="!mb-0">
          部门管理
        </Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增部门
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 50, showTotal: (t) => `共 ${t} 条` }}
          expandable={{
            defaultExpandAllRows: true,
          }}
        />
      </Card>

      <Modal
        title={editingItem ? "编辑部门" : "新增部门"}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSave}
        width={450}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="部门名称"
            rules={[{ required: true, message: "请输入" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="parentId" label="上级部门">
            <Select
              allowClear
              placeholder="无 (顶级部门)"
              options={data
                .filter((d) => d.id !== editingItem?.id)
                .map((d) => ({ label: d.name, value: d.id }))}
            />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Tab 2: Position Management ───
function PositionManagement() {
  const [data, setData] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Position | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [posRes, deptRes] = await Promise.all([
        fetch("/api/positions"),
        fetch("/api/departments"),
      ]);
      if (posRes.ok) setData(await posRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
    } catch {
      message.error("获取数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setEditModalOpen(true);
  };

  const handleEdit = (record: Position) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const url = editingItem
        ? `/api/positions/${editingItem.id}`
        : "/api/positions";
      const method = editingItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success(editingItem ? "更新成功" : "创建成功");
        setEditModalOpen(false);
        fetchData();
      } else {
        message.error("保存失败");
      }
    } catch {
      // validation error
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/positions/${id}`, { method: "DELETE" });
    message.success("删除成功");
    fetchData();
  };

  const columns: ColumnsType<Position> = [
    {
      title: "岗位名称",
      dataIndex: "name",
      width: 200,
    },
    {
      title: "所属部门",
      dataIndex: "deptId",
      width: 200,
      render: (v: string) =>
        departments.find((d) => d.id === v)?.name || v,
    },
    {
      title: "操作",
      width: 140,
      render: (_: any, record: Position) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Title level={4} className="!mb-0">
          岗位管理
        </Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增岗位
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 50, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>

      <Modal
        title={editingItem ? "编辑岗位" : "新增岗位"}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSave}
        width={450}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="岗位名称"
            rules={[{ required: true, message: "请输入" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="deptId"
            label="所属部门"
            rules={[{ required: true, message: "请选择" }]}
          >
            <Select
              options={departments.map((d) => ({
                label: d.name,
                value: d.id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Tab 3: Tenant Settings ───
function TenantSettings() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchTenant = async () => {
      const res = await fetch("/api/tenant");
      if (res.ok) {
        const tenant = await res.json();
        form.setFieldsValue(tenant);
      }
    };
    fetchTenant();
  }, [form]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const res = await fetch("/api/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success("保存成功");
      } else {
        message.error("保存失败");
      }
    } catch {
      // validation error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={4} className="mb-4">
        租户设置
      </Title>

      <Card title="基本信息" className="max-w-lg">
        <Form form={form} layout="vertical">
          <Form.Item label="租户 ID">
            <Input value={session?.user?.tenantId} disabled />
          </Form.Item>
          <Form.Item
            name="name"
            label="企业名称"
            rules={[{ required: true, message: "请输入企业名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="logo" label="Logo URL">
            <Input placeholder="https://..." />
          </Form.Item>
        </Form>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={loading}
        >
          保存设置
        </Button>
      </Card>

      <Card title="系统信息" className="max-w-lg mt-4">
        <div className="space-y-2">
          <Row>
            <Col span={8}>
              <Text type="secondary">平台版本</Text>
            </Col>
            <Col span={16}>
              <Text>v1.0.0</Text>
            </Col>
          </Row>
          <Row>
            <Col span={8}>
              <Text type="secondary">技术栈</Text>
            </Col>
            <Col span={16}>
              <Text>Next.js 14 + Ant Design 5 + Prisma</Text>
            </Col>
          </Row>
          <Row>
            <Col span={8}>
              <Text type="secondary">数据库</Text>
            </Col>
            <Col span={16}>
              <Text>PostgreSQL</Text>
            </Col>
          </Row>
        </div>
      </Card>
    </div>
  );
}

// ─── Main Page ───
export default function SettingsPage() {
  return (
    <div>
      <Title level={4} className="mb-4">
        系统设置
      </Title>
      <Tabs
        items={[
          {
            key: "departments",
            label: "部门管理",
            children: <DepartmentManagement />,
          },
          {
            key: "positions",
            label: "岗位管理",
            children: <PositionManagement />,
          },
          {
            key: "tenant",
            label: "租户设置",
            children: <TenantSettings />,
          },
        ]}
      />
    </div>
  );
}
