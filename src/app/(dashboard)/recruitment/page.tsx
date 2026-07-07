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
  DatePicker,
  message,
  Card,
  Row,
  Col,
  Typography,
  Popconfirm,
  Tabs,
  Rate,
  Descriptions,
  Spin,
  Result,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;
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

interface Interview {
  id: string;
  candidateId: string;
  employeeId: string;
  scheduledAt: string;
  result: string;
  feedback: string | null;
  candidate: { id: string; name: string; jobPosting: { title: string } };
  interviewer: { id: string; name: string };
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

interface MatchResult {
  method: string;
  score: number;
  summary: string;
  details: {
    skills: string;
    experience: string;
    fit: string;
    recommendation: string;
  };
  hint?: string;
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

const interviewResultMap: Record<string, { color: string; label: string }> = {
  PASS: { color: "green", label: "通过" },
  FAIL: { color: "red", label: "不通过" },
  PENDING: { color: "orange", label: "待定" },
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
    const [deptRes, posRes] = await Promise.all([fetch("/api/departments"), fetch("/api/positions")]);
    if (deptRes.ok) setDepartments(await deptRes.json());
    if (posRes.ok) setPositions(await posRes.json());
  };

  useEffect(() => { fetchData(); }, [page, pageSize, statusFilter]);
  useEffect(() => { fetchOptions(); }, []);

  const handleSearch = () => { setPage(1); fetchData(); };
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
      const url = editingItem ? `/api/job-postings/${editingItem.id}` : "/api/job-postings";
      const method = editingItem ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      if (res.ok) { message.success(editingItem ? "更新成功" : "创建成功"); setEditModalOpen(false); fetchData(); }
      else message.error("保存失败");
    } catch { /* validation */ }
  };
  const handleClose = async (id: string) => {
    await fetch(`/api/job-postings/${id}`, { method: "DELETE" });
    message.success("已关闭"); fetchData();
  };

  const columns: ColumnsType<JobPosting> = [
    { title: "职位", dataIndex: "title", width: 200 },
    { title: "部门", dataIndex: ["department", "name"], width: 120 },
    { title: "岗位", dataIndex: ["position", "name"], width: 120 },
    { title: "薪资范围", width: 150, render: (_: any, r: JobPosting) => r.salaryMin && r.salaryMax ? `${r.salaryMin / 1000}k - ${r.salaryMax / 1000}k` : "-" },
    { title: "招聘人数", dataIndex: "headcount", width: 80 },
    { title: "候选人", dataIndex: ["_count", "candidates"], width: 80 },
    { title: "状态", dataIndex: "status", width: 90, render: (v: string) => <Tag color={jobStatusMap[v]?.color}>{jobStatusMap[v]?.label || v}</Tag> },
    { title: "操作", width: 180, fixed: "right", render: (_: any, record: JobPosting) => (
      <Space size="small">
        <Button size="small" type="link" onClick={() => handleEdit(record)}>编辑</Button>
        {record.status === "OPEN" && (
          <Popconfirm title="确认关闭?" onConfirm={() => handleClose(record.id)}>
            <Button size="small" type="link" danger>关闭</Button>
          </Popconfirm>
        )}
      </Space>
    )},
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Title level={4} className="!mb-0">职位管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>发布职位</Button>
      </div>
      <Card className="mb-4">
        <Space wrap>
          <Input placeholder="搜索职位名称" prefix={<SearchOutlined />} value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} style={{ width: 200 }} allowClear />
          <Select placeholder="状态筛选" value={statusFilter} onChange={(v) => setStatusFilter(v)} onClear={() => setStatusFilter(undefined)} allowClear style={{ width: 120 }} options={Object.entries(jobStatusMap).map(([k, v]) => ({ label: v.label, value: k }))} />
          <Button onClick={handleSearch} type="primary">搜索</Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
        </Space>
      </Card>
      <Card>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 1000 }}
          pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: (t) => `共 ${t} 条`, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }} />
      </Card>
      <Modal title={editingItem ? "编辑职位" : "发布职位"} open={editModalOpen} onCancel={() => setEditModalOpen(false)} onOk={handleSave} width={640} destroyOnClose>
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="title" label="职位名称" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="headcount" label="招聘人数" rules={[{ required: true }]}><InputNumber min={1} className="w-full" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="deptId" label="部门" rules={[{ required: true }]}><Select options={departments.map((d) => ({ label: d.name, value: d.id }))} onChange={() => form.setFieldValue("positionId", undefined)} /></Form.Item></Col>
            <Col span={12}><Form.Item name="positionId" label="岗位" rules={[{ required: true }]}><Select options={positions.map((p) => ({ label: p.name, value: p.id }))} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="salaryMin" label="最低薪资 (元)"><InputNumber min={0} className="w-full" addonBefore="¥" /></Form.Item></Col>
            <Col span={12}><Form.Item name="salaryMax" label="最高薪资 (元)"><InputNumber min={0} className="w-full" addonBefore="¥" /></Form.Item></Col>
          </Row>
          <Form.Item name="requirements" label="任职要求"><TextArea rows={3} /></Form.Item>
          <Form.Item name="description" label="职位描述"><TextArea rows={3} /></Form.Item>
          <Form.Item name="status" label="状态"><Select options={Object.entries(jobStatusMap).map(([k, v]) => ({ label: v.label, value: k }))} /></Form.Item>
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
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchCandidate, setMatchCandidate] = useState<Candidate | null>(null);
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
    } catch { message.error("获取数据失败"); }
    finally { setLoading(false); }
  };

  const fetchJobs = async () => {
    const res = await fetch("/api/job-postings?pageSize=999&status=OPEN");
    if (res.ok) { const json = await res.json(); setJobPostings(json.data); }
  };

  useEffect(() => { fetchData(); }, [page, pageSize, statusFilter]);
  useEffect(() => { fetchJobs(); }, []);

  const handleSearch = () => { setPage(1); fetchData(); };
  const handleCreate = () => { setEditingItem(null); form.resetFields(); form.setFieldsValue({ status: "NEW" }); setEditModalOpen(true); };
  const handleEdit = (record: Candidate) => { setEditingItem(record); form.setFieldsValue(record); setEditModalOpen(true); };
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const url = editingItem ? `/api/candidates/${editingItem.id}` : "/api/candidates";
      const method = editingItem ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      if (res.ok) { message.success(editingItem ? "更新成功" : "创建成功"); setEditModalOpen(false); fetchData(); }
      else message.error("保存失败");
    } catch { /* validation */ }
  };
  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/candidates/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    message.success("状态已更新"); fetchData();
  };
  const handleDelete = async (id: string) => {
    await fetch(`/api/candidates/${id}`, { method: "DELETE" });
    message.success("删除成功"); fetchData();
  };

  const handleAiMatch = async (record: Candidate) => {
    setMatchCandidate(record);
    setMatchResult(null);
    setMatchLoading(true);
    setMatchModalOpen(true);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId: record.id }),
      });
      if (res.ok) setMatchResult(await res.json());
      else message.error("匹配分析失败");
    } catch { message.error("匹配分析失败"); }
    finally { setMatchLoading(false); }
  };

  const columns: ColumnsType<Candidate> = [
    { title: "姓名", dataIndex: "name", width: 100, fixed: "left" },
    { title: "应聘职位", dataIndex: ["jobPosting", "title"], width: 150 },
    { title: "手机号", dataIndex: "phone", width: 130, render: (v: string | null) => v || "-" },
    { title: "邮箱", dataIndex: "email", width: 180, render: (v: string | null) => v || "-" },
    { title: "来源", dataIndex: "source", width: 100, render: (v: string | null) => sourceMap[v || ""] || v || "-" },
    { title: "评分", dataIndex: "rating", width: 150, render: (v: number | null) => v ? <Rate disabled value={v} style={{ fontSize: 14 }} /> : "-" },
    { title: "状态", dataIndex: "status", width: 100, render: (v: string) => <Tag color={candidateStatusMap[v]?.color}>{candidateStatusMap[v]?.label || v}</Tag> },
    { title: "投递时间", dataIndex: "createdAt", width: 110, render: (v: string) => v ? dayjs(v).format("YYYY-MM-DD") : "-" },
    {
      title: "操作", width: 320, fixed: "right",
      render: (_: any, record: Candidate) => (
        <Space size="small">
          <Tooltip title="AI 匹配分析">
            <Button size="small" type="link" icon={<ThunderboltOutlined />} style={{ color: "#722ed1" }} onClick={() => handleAiMatch(record)}>匹配</Button>
          </Tooltip>
          {record.status === "NEW" && <Button size="small" type="link" onClick={() => handleStatusChange(record.id, "SCREENING")}>筛选</Button>}
          {(record.status === "NEW" || record.status === "SCREENING") && <Button size="small" type="link" style={{ color: "#faad14" }} onClick={() => handleStatusChange(record.id, "INTERVIEWING")}>面试</Button>}
          {record.status === "INTERVIEWING" && <Button size="small" type="link" style={{ color: "#722ed1" }} onClick={() => handleStatusChange(record.id, "OFFERED")}>Offer</Button>}
          {record.status === "OFFERED" && <Button size="small" type="link" style={{ color: "#52c41a" }} onClick={() => handleStatusChange(record.id, "HIRED")}>入职</Button>}
          <Button size="small" type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}><Button size="small" type="link" danger>删除</Button></Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Title level={4} className="!mb-0">候选人管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>添加候选人</Button>
      </div>
      <Card className="mb-4">
        <Space wrap>
          <Input placeholder="搜索姓名/手机/邮箱" prefix={<SearchOutlined />} value={keyword} onChange={(e) => setKeyword(e.target.value)} onPressEnter={handleSearch} style={{ width: 220 }} allowClear />
          <Select placeholder="状态筛选" value={statusFilter} onChange={(v) => setStatusFilter(v)} onClear={() => setStatusFilter(undefined)} allowClear style={{ width: 130 }} options={Object.entries(candidateStatusMap).map(([k, v]) => ({ label: v.label, value: k }))} />
          <Button onClick={handleSearch} type="primary">搜索</Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
        </Space>
      </Card>
      <Card>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 1300 }}
          pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: (t) => `共 ${t} 条`, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }} />
      </Card>
      <Modal title={editingItem ? "编辑候选人" : "添加候选人"} open={editModalOpen} onCancel={() => setEditModalOpen(false)} onOk={handleSave} width={560} destroyOnClose>
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="jobId" label="应聘职位" rules={[{ required: true }]}><Select options={jobPostings.map((j) => ({ label: j.title, value: j.id }))} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="phone" label="手机号"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="邮箱"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="source" label="来源渠道"><Select options={Object.entries(sourceMap).map(([k, v]) => ({ label: v, value: k }))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="rating" label="评分"><InputNumber min={1} max={5} className="w-full" /></Form.Item></Col>
          </Row>
          <Form.Item name="resumeUrl" label="简历链接"><Input placeholder="https://..." /></Form.Item>
          <Form.Item name="notes" label="备注"><TextArea rows={3} /></Form.Item>
          <Form.Item name="status" label="状态"><Select options={Object.entries(candidateStatusMap).map(([k, v]) => ({ label: v.label, value: k }))} /></Form.Item>
        </Form>
      </Modal>
      {/* AI Match Result Modal */}
      <Modal title={`AI 匹配分析 - ${matchCandidate?.name || ""}`} open={matchModalOpen} onCancel={() => setMatchModalOpen(false)} footer={null} width={600}>
        {matchLoading ? (
          <div className="text-center py-12"><Spin size="large" tip="AI 分析中..." /></div>
        ) : matchResult ? (
          <div>
            <div className="text-center mb-6">
              <Text type="secondary">{matchResult.method === "ai" ? "🤖 AI 智能匹配" : "📊 规则匹配"}</Text>
              <div className="text-6xl font-bold my-2" style={{ color: matchResult.score >= 80 ? "#52c41a" : matchResult.score >= 60 ? "#1677ff" : matchResult.score >= 40 ? "#faad14" : "#ff4d4f" }}>{matchResult.score}</div>
              <Text type="secondary">/ 100 分</Text>
              <Paragraph className="mt-2"><Text strong>{matchResult.summary}</Text></Paragraph>
            </div>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="技能匹配">{matchResult.details.skills}</Descriptions.Item>
              <Descriptions.Item label="经验匹配">{matchResult.details.experience}</Descriptions.Item>
              <Descriptions.Item label="综合评估">{matchResult.details.fit}</Descriptions.Item>
              <Descriptions.Item label="建议"><Text strong>{matchResult.details.recommendation}</Text></Descriptions.Item>
            </Descriptions>
            {matchResult.hint && <Text type="secondary" className="block mt-3">{matchResult.hint}</Text>}
          </div>
        ) : <Result status="error" title="分析失败" />}
      </Modal>
    </div>
  );
}

// ─── Tab 3: Interviews ───
function Interviews() {
  const [data, setData] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Interview | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Interview | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/interviews");
      if (res.ok) setData(await res.json());
    } catch { message.error("获取数据失败"); }
    finally { setLoading(false); }
  };

  const fetchOptions = async () => {
    const [candRes, empRes] = await Promise.all([
      fetch("/api/candidates?pageSize=999"),
      fetch("/api/employees?pageSize=999"),
    ]);
    if (candRes.ok) setCandidates((await candRes.json()).data);
    if (empRes.ok) setEmployees((await empRes.json()).data.map((e: any) => ({ id: e.id, name: e.name })));
  };

  useEffect(() => { fetchData(); fetchOptions(); }, []);

  const handleCreate = () => { setEditingItem(null); form.resetFields(); setEditModalOpen(true); };
  const handleEdit = (record: Interview) => { setEditingItem(record); form.setFieldsValue({ ...record, scheduledAt: record.scheduledAt ? dayjs(record.scheduledAt) : undefined }); setEditModalOpen(true); };
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const body = { ...values, scheduledAt: values.scheduledAt?.toISOString() };
      const url = editingItem ? `/api/interviews/${editingItem.id}` : "/api/interviews";
      const method = editingItem ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { message.success(editingItem ? "更新成功" : "创建成功"); setEditModalOpen(false); fetchData(); }
      else message.error("保存失败");
    } catch { /* validation */ }
  };
  const handleDelete = async (id: string) => { await fetch(`/api/interviews/${id}`, { method: "DELETE" }); message.success("删除成功"); fetchData(); };

  const columns: ColumnsType<Interview> = [
    { title: "候选人", dataIndex: ["candidate", "name"], width: 100 },
    { title: "应聘职位", dataIndex: ["candidate", "jobPosting", "title"], width: 150 },
    { title: "面试官", dataIndex: ["interviewer", "name"], width: 100 },
    { title: "面试时间", dataIndex: "scheduledAt", width: 170, render: (v: string) => v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-" },
    { title: "结果", dataIndex: "result", width: 90, render: (v: string) => <Tag color={interviewResultMap[v]?.color}>{interviewResultMap[v]?.label || v}</Tag> },
    { title: "反馈", dataIndex: "feedback", width: 200, render: (v: string | null) => v ? <Text ellipsis style={{ maxWidth: 180 }}>{v}</Text> : <Text type="secondary">暂无</Text> },
    {
      title: "操作", width: 200,
      render: (_: any, record: Interview) => (
        <Space size="small">
          <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => { setDetailItem(record); setDetailModalOpen(true); }}>详情</Button>
          <Button size="small" type="link" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}><Button size="small" type="link" danger>删除</Button></Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Title level={4} className="!mb-0">面试管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>安排面试</Button>
      </div>
      <Card>
        <Space wrap className="mb-4">
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
        </Space>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 1000 }}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }} />
      </Card>
      <Modal title={editingItem ? "编辑面试" : "安排面试"} open={editModalOpen} onCancel={() => setEditModalOpen(false)} onOk={handleSave} width={560} destroyOnClose>
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="candidateId" label="候选人" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={candidates.map((c) => ({ label: `${c.name} - ${c.jobPosting?.title || ""}`, value: c.id }))} />
          </Form.Item>
          <Form.Item name="employeeId" label="面试官" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={employees.map((e) => ({ label: e.name, value: e.id }))} />
          </Form.Item>
          <Form.Item name="scheduledAt" label="面试时间" rules={[{ required: true }]}>
            <DatePicker showTime className="w-full" />
          </Form.Item>
          <Form.Item name="result" label="面试结果">
            <Select options={Object.entries(interviewResultMap).map(([k, v]) => ({ label: v.label, value: k }))} />
          </Form.Item>
          <Form.Item name="feedback" label="面试反馈">
            <TextArea rows={4} placeholder="记录面试评价和反馈..." />
          </Form.Item>
        </Form>
      </Modal>
      <Modal title="面试详情" open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null} width={560}>
        {detailItem && (
          <Descriptions bordered column={1} className="mt-4">
            <Descriptions.Item label="候选人">{detailItem.candidate.name}</Descriptions.Item>
            <Descriptions.Item label="应聘职位">{detailItem.candidate.jobPosting?.title}</Descriptions.Item>
            <Descriptions.Item label="面试官">{detailItem.interviewer.name}</Descriptions.Item>
            <Descriptions.Item label="面试时间">{dayjs(detailItem.scheduledAt).format("YYYY-MM-DD HH:mm")}</Descriptions.Item>
            <Descriptions.Item label="结果"><Tag color={interviewResultMap[detailItem.result]?.color}>{interviewResultMap[detailItem.result]?.label}</Tag></Descriptions.Item>
            <Descriptions.Item label="反馈">{detailItem.feedback || "暂无反馈"}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

// ─── Main Page ───
export default function RecruitmentPage() {
  const [activeTab, setActiveTab] = useState("jobs");
  return (
    <div>
      <Title level={4} className="mb-4">招聘管理</Title>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        { key: "jobs", label: "职位管理", children: <JobPostings /> },
        { key: "candidates", label: "候选人管理", children: <Candidates /> },
        { key: "interviews", label: "面试跟进", children: <Interviews /> },
      ]} />
    </div>
  );
}
