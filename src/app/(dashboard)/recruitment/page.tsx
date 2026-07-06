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
  InputNumber,
  message,
  Card,
  Row,
  Col,
  Typography,
  Popconfirm,
  Tabs,
  Rate,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TextArea } = Input;

// ─── Types ───
interface JobPosting {
  id: string;
  title: string;
  deptId: string;
  positionId: string;
  description: string | null;
  requirements: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  headcount: number;
  status: string;
  department: { id: string; name: string };
  position: { id: string; name: string };
  _count: { candidates: number };
}

interface Candidate {
  id: string;
  jobId: string;
  name: string;
  phone: string | null;
  email: string | null;
  resumeUrl: string | null;
  source: string | null;
  status: string;
  rating: number | null;
  notes: string | null;
  createdAt: string;
  jobPosting: { id: string; title: string };
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

// ─── Maps ───
const jobStatusMap: Record<string, { color: string; label: string }> = {
  OPEN: { color: "green", label: "招聘中" },
  CLOSED: { color: "default", label: "已关闭" },
  DRAFT: { color: "blue", label: "草稿" },
};

const candidateStatusMap: Record<string, { color: string; label: string }> = {
  NEW: { color: "blue", label: "新候选人" },
  SCREENING: { color: "cyan", label: "筛选中" },
  INTERVIEWING: { color: "orange", label: "面试中" },
  OFFERED: { color: "purple", label: "已发Offer" },
  HIRED: { color: "green", label: "已入职" },
  REJECTED: { color: "red", label: "已拒绝" },
};

const sourceMap: Record<string, string> = {
  BOSS: "BOSS直聘",
  ZHIPIN: "智联招聘",
  LIEPA: "猎聘",
  NEITUI: "内推",
  OTHER: "其他",
};

// ─── Tab 1: Job Postings ───
function JobPostings() {
  const [data, setData] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JobPosting | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/job-postings?${params}`);
      const json = await res.json();
      setData(json.data);
      setTotal(json.total);
    } catch {
      message.error("获取数据失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchOptions = async () => {
    const [deptRes, posRes] = await Promise.all([
      fetch("/api/departments"),
      fetch("/api/positions"),
    ]);
    if (deptRes.ok) setDepartments(await deptRes.json());
    if (posRes.ok) setPositions(await posRes.json());
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchOptions();
  }, []);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({ headcount: 1, status: "OPEN" });
    setEditModalOpen(true);
  };

  const handleEdit = (record: JobPosting) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const url = editingItem
        ? `/api/job-postings/${editingItem.id}`
        : "/api/job-postings";
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

  const handleClose = async (id: string) => {
    await fetch(`/api/job-postings/${id}`, { method: "DELETE" });
    message.success("已关闭");
    fetchData();
  };

  const columns: ColumnsType<JobPosting> = [
    {
      title: "职位",
      dataIndex: "title",
      width: 200,
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
      title: "薪资范围",
      width: 150,
      render: (_: any, r: JobPosting) =>
        r.salaryMin && r.salaryMax
          ? `${r.salaryMin / 1000}k - ${r.salaryMax / 1000}k`
          : "-",
    },
    {
      title: "招聘人数",
      dataIndex: "headcount",
      width: 80,
    },
    {
      title: "候选人",
      dataIndex: ["_count", "candidates"],
      width: 80,
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 90,
      render: (v: string) => (
        <Tag color={jobStatusMap[v]?.color}>{jobStatusMap[v]?.label || v}</Tag>
      ),
    },
    {
      title: "操作",
      width: 180,
      fixed: "right",
      render: (_: any, record: JobPosting) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {record.status === "OPEN" && (
            <Popconfirm title="确认关闭?" onConfirm={() => handleClose(record.id)}>
              <Button size="small" type="link" danger>
                关闭
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Title level={4} className="!mb-0">
          职位管理
        </Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            发布职位
          </Button>
        </Space>
      </div>

      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Input
                placeholder="搜索职位名称"
                prefix={<SearchOutlined />}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: 200 }}
                allowClear
              />
              <Select
                placeholder="状态筛选"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v)}
                onClear={() => setStatusFilter(undefined)}
                allowClear
                style={{ width: 120 }}
                options={Object.entries(jobStatusMap).map(([k, v]) => ({
                  label: v.label,
                  value: k,
                }))}
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
          scroll={{ x: 1000 }}
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
        title={editingItem ? "编辑职位" : "发布职位"}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSave}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="职位名称"
                rules={[{ required: true, message: "请输入" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="headcount"
                label="招聘人数"
                rules={[{ required: true, message: "请输入" }]}
              >
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="deptId"
                label="部门"
                rules={[{ required: true, message: "请选择" }]}
              >
                <Select
                  options={departments.map((d) => ({
                    label: d.name,
                    value: d.id,
                  }))}
                  onChange={() => {
                    form.setFieldValue("positionId", undefined);
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="positionId"
                label="岗位"
                rules={[{ required: true, message: "请选择" }]}
              >
                <Select
                  options={positions.map((p) => ({
                    label: p.name,
                    value: p.id,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="salaryMin" label="最低薪资 (元)">
                <InputNumber min={0} className="w-full" addonBefore="¥" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="salaryMax" label="最高薪资 (元)">
                <InputNumber min={0} className="w-full" addonBefore="¥" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="requirements" label="任职要求">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="description" label="职位描述">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={Object.entries(jobStatusMap).map(([k, v]) => ({
                label: v.label,
                value: k,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Tab 2: Candidates ───
function Candidates() {
  const [data, setData] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Candidate | null>(null);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/candidates?${params}`);
      const json = await res.json();
      setData(json.data);
      setTotal(json.total);
    } catch {
      message.error("获取数据失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    const res = await fetch("/api/job-postings?pageSize=999&status=OPEN");
    if (res.ok) {
      const json = await res.json();
      setJobPostings(json.data);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({ status: "NEW" });
    setEditModalOpen(true);
  };

  const handleEdit = (record: Candidate) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const url = editingItem
        ? `/api/candidates/${editingItem.id}`
        : "/api/candidates";
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

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    message.success("状态已更新");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/candidates/${id}`, { method: "DELETE" });
    message.success("删除成功");
    fetchData();
  };

  const columns: ColumnsType<Candidate> = [
    {
      title: "姓名",
      dataIndex: "name",
      width: 100,
      fixed: "left",
    },
    {
      title: "应聘职位",
      dataIndex: ["jobPosting", "title"],
      width: 150,
    },
    {
      title: "手机号",
      dataIndex: "phone",
      width: 130,
      render: (v: string | null) => v || "-",
    },
    {
      title: "邮箱",
      dataIndex: "email",
      width: 180,
      render: (v: string | null) => v || "-",
    },
    {
      title: "来源",
      dataIndex: "source",
      width: 100,
      render: (v: string | null) => sourceMap[v || ""] || v || "-",
    },
    {
      title: "评分",
      dataIndex: "rating",
      width: 150,
      render: (v: number | null) =>
        v ? <Rate disabled value={v} style={{ fontSize: 14 }} /> : "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (v: string) => (
        <Tag color={candidateStatusMap[v]?.color}>
          {candidateStatusMap[v]?.label || v}
        </Tag>
      ),
    },
    {
      title: "投递时间",
      dataIndex: "createdAt",
      width: 110,
      render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD") : "-"),
    },
    {
      title: "操作",
      width: 240,
      fixed: "right",
      render: (_: any, record: Candidate) => (
        <Space size="small">
          {record.status === "NEW" && (
            <Button
              size="small"
              type="link"
              onClick={() => handleStatusChange(record.id, "SCREENING")}
            >
              筛选
            </Button>
          )}
          {(record.status === "NEW" || record.status === "SCREENING") && (
            <Button
              size="small"
              type="link"
              style={{ color: "#faad14" }}
              onClick={() => handleStatusChange(record.id, "INTERVIEWING")}
            >
              面试
            </Button>
          )}
          {record.status === "INTERVIEWING" && (
            <Button
              size="small"
              type="link"
              style={{ color: "#722ed1" }}
              onClick={() => handleStatusChange(record.id, "OFFERED")}
            >
              Offer
            </Button>
          )}
          {record.status === "OFFERED" && (
            <Button
              size="small"
              type="link"
              style={{ color: "#52c41a" }}
              onClick={() => handleStatusChange(record.id, "HIRED")}
            >
              入职
            </Button>
          )}
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
          候选人管理
        </Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            添加候选人
          </Button>
        </Space>
      </div>

      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Input
                placeholder="搜索姓名/手机/邮箱"
                prefix={<SearchOutlined />}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: 220 }}
                allowClear
              />
              <Select
                placeholder="状态筛选"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v)}
                onClear={() => setStatusFilter(undefined)}
                allowClear
                style={{ width: 130 }}
                options={Object.entries(candidateStatusMap).map(([k, v]) => ({
                  label: v.label,
                  value: k,
                }))}
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
          scroll={{ x: 1200 }}
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
        title={editingItem ? "编辑候选人" : "添加候选人"}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSave}
        width={560}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: "请输入" }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="jobId"
                label="应聘职位"
                rules={[{ required: true, message: "请选择" }]}
              >
                <Select
                  options={jobPostings.map((j) => ({
                    label: j.title,
                    value: j.id,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="手机号">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="邮箱">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="source" label="来源渠道">
                <Select
                  options={Object.entries(sourceMap).map(([k, v]) => ({
                    label: v,
                    value: k,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="rating" label="评分">
                <InputNumber min={1} max={5} className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="resumeUrl" label="简历链接">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={Object.entries(candidateStatusMap).map(([k, v]) => ({
                label: v.label,
                value: k,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Main Page ───
export default function RecruitmentPage() {
  const [activeTab, setActiveTab] = useState("jobs");

  return (
    <div>
      <Title level={4} className="mb-4">
        招聘管理
      </Title>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "jobs",
            label: "职位管理",
            children: <JobPostings />,
          },
          {
            key: "candidates",
            label: "候选人管理",
            children: <Candidates />,
          },
        ]}
      />
    </div>
  );
}
