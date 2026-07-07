"use client";

import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Modal,
  Form,
  DatePicker,
  InputNumber,
  message,
  Card,
  Row,
  Col,
  Typography,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Title } = Typography;

interface Employee {
  id: string;
  employeeNo: string;
  name: string;
  gender: string;
  phone: string;
  email: string;
  hireDate: string;
  birthday?: string;
  status: string;
  department: { id: string; name: string } | null;
  position: { id: string; name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface Position {
  id: string;
  name: string;
  deptId: string;
}

const statusMap: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: "green", label: "在职" },
  PROBATION: { color: "blue", label: "试用期" },
  RESIGNED: { color: "red", label: "已离职" },
};

const genderMap: Record<string, string> = {
  MALE: "男",
  FEMALE: "女",
};

export default function EmployeesPage() {
  const [data, setData] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [form] = Form.useForm();

  const fetchOptions = async () => {
    const [deptRes, posRes] = await Promise.all([
      fetch("/api/departments"),
      fetch("/api/positions"),
    ]);
    if (deptRes.ok) setDepartments(await deptRes.json());
    if (posRes.ok) setPositions(await posRes.json());
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/employees?${params}`);
      const json = await res.json();
      setData(json.data);
      setTotal(json.total);
    } catch {
      message.error("获取数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, statusFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleCreate = () => {
    setEditingEmployee(null);
    form.resetFields();
    fetchOptions();
    setEditModalOpen(true);
  };

  const handleEdit = (record: Employee) => {
    setEditingEmployee(record);
    fetchOptions();
    form.setFieldsValue({
      ...record,
      hireDate: record.hireDate ? dayjs(record.hireDate) : undefined,
      birthday: record.birthday ? dayjs(record.birthday) : undefined,
      deptId: record.department?.id,
      positionId: record.position?.id,
    });
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const body: any = {
        ...values,
        hireDate: values.hireDate?.toISOString(),
        birthday: values.birthday?.toISOString(),
      };

      const url = editingEmployee
        ? `/api/employees/${editingEmployee.id}`
        : "/api/employees";
      const method = editingEmployee ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        message.success(editingEmployee ? "更新成功" : "创建成功");
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
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    message.success("已标记离职");
    fetchData();
  };

  const columns: ColumnsType<Employee> = [
    {
      title: "工号",
      dataIndex: "employeeNo",
      width: 100,
    },
    {
      title: "姓名",
      dataIndex: "name",
      width: 100,
      fixed: "left",
    },
    {
      title: "性别",
      dataIndex: "gender",
      width: 60,
      render: (v) => genderMap[v] || "-",
    },
    {
      title: "手机号",
      dataIndex: "phone",
      width: 130,
    },
    {
      title: "部门",
      dataIndex: ["department", "name"],
      width: 120,
    },
    {
      title: "岗位",
      dataIndex: ["position", "name"],
      width: 120,
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 80,
      render: (v: string) => (
        <Tag color={statusMap[v]?.color}>{statusMap[v]?.label || v}</Tag>
      ),
    },
    {
      title: "入职日期",
      dataIndex: "hireDate",
      width: 110,
      render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD") : "-"),
    },
    {
      title: "操作",
      width: 160,
      fixed: "right",
      render: (_: any, record: Employee) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认将该员工标记为离职?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" type="link" danger>
              离职
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
          员工管理
        </Title>
        <Space>
          <Button icon={<ExportOutlined />}>导出</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增员工
          </Button>
        </Space>
      </div>

      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space>
              <Input
                placeholder="搜索姓名/工号/手机"
                prefix={<SearchOutlined />}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: 250 }}
                allowClear
              />
              <Select
                placeholder="状态筛选"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v)}
                onClear={() => setStatusFilter(undefined)}
                allowClear
                style={{ width: 120 }}
                options={[
                  { label: "在职", value: "ACTIVE" },
                  { label: "试用期", value: "PROBATION" },
                  { label: "已离职", value: "RESIGNED" },
                ]}
              />
              <Button onClick={handleSearch} type="primary">
                搜索
              </Button>
              <Button icon={<ReloadOutlined />} onClick={fetchData}>
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      <Modal
        title={editingEmployee ? "编辑员工" : "新增员工"}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSave}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: "请输入姓名" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="employeeNo" label="工号">
                <Input placeholder="自动生成" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="gender" label="性别">
                <Select
                  options={[
                    { label: "男", value: "MALE" },
                    { label: "女", value: "FEMALE" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="手机号">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="邮箱">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="idCard" label="身份证号">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="deptId" label="部门">
                <Select
                  placeholder="选择部门"
                  allowClear
                  options={departments.map((d) => ({ label: d.name, value: d.id }))}
                  onChange={() => {
                    form.setFieldValue("positionId", undefined);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="positionId" label="岗位">
                <Select
                  placeholder="选择岗位"
                  allowClear
                  options={positions
                    .filter((p) => !form.getFieldValue("deptId") || p.deptId === form.getFieldValue("deptId"))
                    .map((p) => ({ label: p.name, value: p.id }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="hireDate" label="入职日期">
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="birthday" label="出生日期">
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="baseSalary" label="基本工资">
                <InputNumber
                  className="w-full"
                  min={0}
                  precision={2}
                  addonBefore="¥"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态">
                <Select
                  options={[
                    { label: "在职", value: "ACTIVE" },
                    { label: "试用期", value: "PROBATION" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
