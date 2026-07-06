"use client";

import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Space,
  Select,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  message,
  Card,
  Row,
  Col,
  Typography,
  Popconfirm,
  Tabs,
  Progress,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TextArea } = Input;

// ─── Types ───
interface PerformanceCycle {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  _count: { kpis: number; reviews: number };
}

interface KPI {
  id: string;
  cycleId: string;
  employeeId: string;
  name: string;
  target: string | null;
  weight: number;
  score: number | null;
  employee: { id: string; name: string };
}

interface Review {
  id: string;
  cycleId: string;
  employeeId: string;
  selfScore: number | null;
  selfComment: string | null;
  mgrScore: number | null;
  mgrComment: string | null;
  status: string;
  employee: { id: string; name: string; employeeNo: string };
  cycle: { id: string; name: string };
}

// ─── Maps ───
const cycleStatusMap: Record<string, { color: string; label: string }> = {
  DRAFT: { color: "default", label: "草稿" },
  ACTIVE: { color: "green", label: "进行中" },
  CLOSED: { color: "blue", label: "已结束" },
};

const reviewStatusMap: Record<string, { color: string; label: string }> = {
  PENDING: { color: "orange", label: "待评估" },
  SELF_DONE: { color: "blue", label: "自评完成" },
  MANAGER_DONE: { color: "cyan", label: "经理已评" },
  COMPLETED: { color: "green", label: "已完成" },
};

// ─── Tab 1: Performance Cycles ───
function PerformanceCycles() {
  const [data, setData] = useState<PerformanceCycle[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PerformanceCycle | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/performance-cycles?${params}`);
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

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setEditModalOpen(true);
  };

  const handleEdit = (record: PerformanceCycle) => {
    setEditingItem(record);
    form.setFieldsValue({
      ...record,
      startDate: record.startDate ? dayjs(record.startDate) : undefined,
      endDate: record.endDate ? dayjs(record.endDate) : undefined,
    });
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const body = {
        ...values,
        startDate: values.startDate?.toISOString(),
        endDate: values.endDate?.toISOString(),
      };

      const url = editingItem
        ? `/api/performance-cycles/${editingItem.id}`
        : "/api/performance-cycles";
      const method = editingItem ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
    await fetch(`/api/performance-cycles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    message.success("状态已更新");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/performance-cycles/${id}`, { method: "DELETE" });
    message.success("删除成功");
    fetchData();
  };

  const columns: ColumnsType<PerformanceCycle> = [
    {
      title: "考核名称",
      dataIndex: "name",
      width: 200,
    },
    {
      title: "开始日期",
      dataIndex: "startDate",
      width: 110,
      render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD") : "-"),
    },
    {
      title: "结束日期",
      dataIndex: "endDate",
      width: 110,
      render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD") : "-"),
    },
    {
      title: "KPI数",
      dataIndex: ["_count", "kpis"],
      width: 70,
    },
    {
      title: "评估数",
      dataIndex: ["_count", "reviews"],
      width: 70,
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 90,
      render: (v: string) => (
        <Tag color={cycleStatusMap[v]?.color}>
          {cycleStatusMap[v]?.label || v}
        </Tag>
      ),
    },
    {
      title: "操作",
      width: 220,
      fixed: "right",
      render: (_: any, record: PerformanceCycle) => (
        <Space size="small">
          {record.status === "DRAFT" && (
            <Button
              size="small"
              type="link"
              style={{ color: "#52c41a" }}
              icon={<PlayCircleOutlined />}
              onClick={() => handleStatusChange(record.id, "ACTIVE")}
            >
              启动
            </Button>
          )}
          {record.status === "ACTIVE" && (
            <Button
              size="small"
              type="link"
              style={{ color: "#1677ff" }}
              icon={<CheckCircleOutlined />}
              onClick={() => handleStatusChange(record.id, "CLOSED")}
            >
              结束
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
          考核周期
        </Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建考核
          </Button>
        </Space>
      </div>

      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Select
                placeholder="状态筛选"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v)}
                onClear={() => setStatusFilter(undefined)}
                allowClear
                style={{ width: 120 }}
                options={Object.entries(cycleStatusMap).map(([k, v]) => ({
                  label: v.label,
                  value: k,
                }))}
              />
              <Button onClick={fetchData} type="primary">
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
          scroll={{ x: 900 }}
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
        title={editingItem ? "编辑考核周期" : "新建考核周期"}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSave}
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="考核名称"
            rules={[{ required: true, message: "请输入" }]}
          >
            <Input placeholder="如：2024年度Q4绩效考核" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="startDate"
                label="开始日期"
                rules={[{ required: true, message: "请选择" }]}
              >
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="endDate"
                label="结束日期"
                rules={[{ required: true, message: "请选择" }]}
              >
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Tab 2: Reviews ───
function Reviews() {
  const [data, setData] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [cycles, setCycles] = useState<PerformanceCycle[]>([]);
  const [cycleFilter, setCycleFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [scoringReview, setScoringReview] = useState<Review | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cycleFilter) params.set("cycleId", cycleFilter);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/reviews?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      message.error("获取数据失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchCycles = async () => {
    const res = await fetch("/api/performance-cycles?pageSize=999");
    if (res.ok) {
      const json = await res.json();
      setCycles(json.data);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  useEffect(() => {
    fetchData();
  }, [cycleFilter, statusFilter]);

  const handleScore = (record: Review, type: "self" | "manager") => {
    setScoringReview(record);
    form.resetFields();
    if (type === "self") {
      form.setFieldsValue({ selfScore: record.selfScore, selfComment: record.selfComment });
    } else {
      form.setFieldsValue({ mgrScore: record.mgrScore, mgrComment: record.mgrComment });
    }
    form.setFieldsValue({ scoreType: type });
    setScoreModalOpen(true);
  };

  const handleScoreSubmit = async () => {
    try {
      const values = await form.validateFields();
      const type = values.scoreType;
      const body: any = {};
      if (type === "self") {
        body.selfScore = values.selfScore;
        body.selfComment = values.selfComment;
        body.status = "SELF_DONE";
      } else {
        body.mgrScore = values.mgrScore;
        body.mgrComment = values.mgrComment;
        body.status = "MANAGER_DONE";
      }

      await fetch(`/api/reviews/${scoringReview!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      message.success("评分已提交");
      setScoreModalOpen(false);
      fetchData();
    } catch {
      // validation error
    }
  };

  const handleComplete = async (id: string) => {
    await fetch(`/api/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    message.success("评估已完成");
    fetchData();
  };

  const columns: ColumnsType<Review> = [
    {
      title: "员工",
      dataIndex: ["employee", "name"],
      width: 100,
    },
    {
      title: "工号",
      dataIndex: ["employee", "employeeNo"],
      width: 100,
    },
    {
      title: "考核周期",
      dataIndex: ["cycle", "name"],
      width: 180,
    },
    {
      title: "自评分数",
      dataIndex: "selfScore",
      width: 100,
      align: "center",
      render: (v: number | null) =>
        v !== null ? (
          <Text strong style={{ color: "#1677ff" }}>
            {String(v)}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "经理评分",
      dataIndex: "mgrScore",
      width: 100,
      align: "center",
      render: (v: number | null) =>
        v !== null ? (
          <Text strong style={{ color: "#52c41a" }}>
            {String(v)}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "综合",
      width: 150,
      render: (_: any, r: Review) => {
        const s = r.mgrScore ?? r.selfScore;
        return s !== null ? (
          <Progress percent={Number(s)} size="small" />
        ) : (
          <Text type="secondary">未评分</Text>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (v: string) => (
        <Tag color={reviewStatusMap[v]?.color}>
          {reviewStatusMap[v]?.label || v}
        </Tag>
      ),
    },
    {
      title: "操作",
      width: 200,
      fixed: "right",
      render: (_: any, record: Review) => (
        <Space size="small">
          {record.status === "PENDING" && (
            <Button
              size="small"
              type="link"
              onClick={() => handleScore(record, "self")}
            >
              自评
            </Button>
          )}
          {(record.status === "PENDING" || record.status === "SELF_DONE") && (
            <Button
              size="small"
              type="link"
              style={{ color: "#52c41a" }}
              onClick={() => handleScore(record, "manager")}
            >
              经理评分
            </Button>
          )}
          {record.status === "MANAGER_DONE" && (
            <Button
              size="small"
              type="link"
              style={{ color: "#1677ff" }}
              onClick={() => handleComplete(record.id)}
            >
              完成
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={4} className="mb-4">
        绩效评估
      </Title>

      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Select
                placeholder="选择考核周期"
                value={cycleFilter}
                onChange={(v) => setCycleFilter(v)}
                onClear={() => setCycleFilter(undefined)}
                allowClear
                style={{ width: 220 }}
                options={cycles.map((c) => ({ label: c.name, value: c.id }))}
              />
              <Select
                placeholder="状态筛选"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v)}
                onClear={() => setStatusFilter(undefined)}
                allowClear
                style={{ width: 120 }}
                options={Object.entries(reviewStatusMap).map(([k, v]) => ({
                  label: v.label,
                  value: k,
                }))}
              />
              <Button onClick={fetchData} type="primary">
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
          scroll={{ x: 900 }}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>

      <Modal
        title={scoringReview?.status === "PENDING" ? "员工自评" : "经理评分"}
        open={scoreModalOpen}
        onCancel={() => setScoreModalOpen(false)}
        onOk={handleScoreSubmit}
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="scoreType" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="selfScore" label="评分 (0-100)">
            <InputNumber min={0} max={100} className="w-full" />
          </Form.Item>
          <Form.Item name="selfComment" label="评语">
            <TextArea rows={3} placeholder="请输入自评意见" />
          </Form.Item>
          <Form.Item name="mgrScore" label="评分 (0-100)">
            <InputNumber min={0} max={100} className="w-full" />
          </Form.Item>
          <Form.Item name="mgrComment" label="评语">
            <TextArea rows={3} placeholder="请输入评估意见" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Tab 3: KPIs ───
function KPIs() {
  const [data, setData] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [cycles, setCycles] = useState<PerformanceCycle[]>([]);
  const [cycleFilter, setCycleFilter] = useState<string | undefined>();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KPI | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (cycleFilter) params.set("cycleId", cycleFilter);

      const res = await fetch(`/api/kpis?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      message.error("获取数据失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchCycles = async () => {
    const res = await fetch("/api/performance-cycles?pageSize=999");
    if (res.ok) {
      const json = await res.json();
      setCycles(json.data);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  useEffect(() => {
    fetchData();
  }, [cycleFilter]);

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    if (cycleFilter) form.setFieldsValue({ cycleId: cycleFilter });
    setEditModalOpen(true);
  };

  const handleEdit = (record: KPI) => {
    setEditingItem(record);
    form.setFieldsValue(record);
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const url = editingItem
        ? `/api/kpis/${editingItem.id}`
        : "/api/kpis";
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
    await fetch(`/api/kpis/${id}`, { method: "DELETE" });
    message.success("删除成功");
    fetchData();
  };

  const columns: ColumnsType<KPI> = [
    {
      title: "KPI 名称",
      dataIndex: "name",
      width: 200,
    },
    {
      title: "员工",
      dataIndex: ["employee", "name"],
      width: 100,
    },
    {
      title: "目标值",
      dataIndex: "target",
      width: 150,
      render: (v: string | null) => v || "-",
    },
    {
      title: "权重 (%)",
      dataIndex: "weight",
      width: 100,
      render: (v: number) => `${v}%`,
    },
    {
      title: "得分",
      dataIndex: "score",
      width: 100,
      render: (v: number | null) =>
        v !== null ? (
          <Text strong style={{ color: "#1677ff" }}>
            {String(v)}
          </Text>
        ) : (
          <Text type="secondary">未评分</Text>
        ),
    },
    {
      title: "操作",
      width: 140,
      render: (_: any, record: KPI) => (
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
          KPI 指标
        </Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新建 KPI
          </Button>
        </Space>
      </div>

      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Select
                placeholder="选择考核周期"
                value={cycleFilter}
                onChange={(v) => setCycleFilter(v)}
                onClear={() => setCycleFilter(undefined)}
                allowClear
                style={{ width: 220 }}
                options={cycles.map((c) => ({ label: c.name, value: c.id }))}
              />
              <Button onClick={fetchData} type="primary">
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
          scroll={{ x: 800 }}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        />
      </Card>

      <Modal
        title={editingItem ? "编辑 KPI" : "新建 KPI"}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSave}
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="cycleId"
            label="考核周期"
            rules={[{ required: true, message: "请选择" }]}
          >
            <Select
              options={cycles.map((c) => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>
          <Form.Item
            name="employeeId"
            label="员工 ID"
            rules={[{ required: true, message: "请输入员工ID" }]}
          >
            <Input placeholder="输入员工ID" />
          </Form.Item>
          <Form.Item
            name="name"
            label="KPI 名称"
            rules={[{ required: true, message: "请输入" }]}
          >
            <Input placeholder="如：销售额达成率" />
          </Form.Item>
          <Form.Item name="target" label="目标值">
            <Input placeholder="如：≥100万" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="weight"
                label="权重 (%)"
                rules={[{ required: true, message: "请输入" }]}
              >
                <InputNumber min={0} max={100} precision={2} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="score" label="得分">
                <InputNumber min={0} max={100} precision={2} className="w-full" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Main Page ───
export default function PerformancePage() {
  const [activeTab, setActiveTab] = useState("cycles");

  return (
    <div>
      <Title level={4} className="mb-4">
        绩效管理
      </Title>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "cycles",
            label: "考核周期",
            children: <PerformanceCycles />,
          },
          {
            key: "reviews",
            label: "绩效评估",
            children: <Reviews />,
          },
          {
            key: "kpis",
            label: "KPI 指标",
            children: <KPIs />,
          },
        ]}
      />
    </div>
  );
}
