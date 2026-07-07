"use client";

import { useEffect, useState } from "react";
import {
  Table, Button, Space, Input, Select, Tag, Modal, Form, InputNumber, DatePicker,
  message, Card, Row, Col, Typography, Popconfirm, Tabs, Rate, Descriptions, Spin, Result, Tooltip, Progress, Badge, List,
} from "antd";
import {
  PlusOutlined, SearchOutlined, ReloadOutlined, ThunderboltOutlined, CalendarOutlined,
  CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, ExperimentOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// ─── Types ───
interface JobPosting {
  id: string; title: string; deptId: string; positionId: string; description: string | null;
  requirements: string | null; salaryMin: number | null; salaryMax: number | null; headcount: number;
  status: string; department: { id: string; name: string }; position: { id: string; name: string }; _count: { candidates: number };
}

interface Candidate {
  id: string; jobId: string; name: string; phone: string | null; email: string | null; resumeUrl: string | null;
  source: string | null; status: string; rating: number | null; notes: string | null; createdAt: string;
  jobPosting: { id: string; title: string };
}

interface Interview {
  id: string; candidateId: string; employeeId: string; scheduledAt: string; result: string; feedback: string | null;
  candidate: { id: string; name: string; jobPosting: { title: string } }; interviewer: { id: string; name: string };
}

interface MatchResult {
  method: string; score: number; summary: string;
  details: { skills: string; experience: string; fit: string; recommendation: string };
  hint?: string; candidateName?: string; jobTitle?: string;
}

interface BatchResult {
  mode: string; total: number; jobTitle?: string;
  results: { candidateId: string; candidateName: string; jobTitle?: string; method: string; score: number; summary: string; details: any; hint?: string }[];
}

// ─── Maps ───
const jobStatusMap: Record<string, { color: string; label: string }> = { OPEN: { color: "green", label: "招聘中" }, CLOSED: { color: "default", label: "已关闭" }, DRAFT: { color: "blue", label: "草稿" } };
const candidateStatusMap: Record<string, { color: string; label: string }> = { NEW: { color: "blue", label: "新候选人" }, SCREENING: { color: "cyan", label: "筛选中" }, INTERVIEWING: { color: "orange", label: "面试中" }, OFFERED: { color: "purple", label: "已发Offer" }, HIRED: { color: "green", label: "已入职" }, REJECTED: { color: "red", label: "已拒绝" } };
const interviewResultMap: Record<string, { color: string; label: string }> = { PASS: { color: "green", label: "通过" }, FAIL: { color: "red", label: "不通过" }, PENDING: { color: "orange", label: "待定" } };
const sourceMap: Record<string, string> = { BOSS: "BOSS直聘", ZHIPIN: "智联招聘", LIEPA: "猎聘", NEITUI: "内推", OTHER: "其他" };

function scoreColor(s: number) { return s >= 80 ? "#52c41a" : s >= 60 ? "#1677ff" : s >= 40 ? "#faad14" : "#ff4d4f"; }
function scoreLevel(s: number) { return s >= 80 ? "优秀" : s >= 60 ? "良好" : s >= 40 ? "一般" : "较低"; }

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
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [positions, setPositions] = useState<{ id: string; name: string; deptId: string }[]>([]);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page)); params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/job-postings?${params}`);
      const json = await res.json(); setData(json.data); setTotal(json.total);
    } catch { message.error("获取数据失败"); } finally { setLoading(false); }
  };
  const fetchOptions = async () => {
    const [d, p] = await Promise.all([fetch("/api/departments"), fetch("/api/positions")]);
    if (d.ok) setDepartments(await d.json());
    if (p.ok) setPositions(await p.json());
  };
  useEffect(() => { fetchData(); }, [page, pageSize, statusFilter]);
  useEffect(() => { fetchOptions(); }, []);

  const handleSearch = () => { setPage(1); fetchData(); };
  const handleCreate = () => { setEditingItem(null); form.resetFields(); form.setFieldsValue({ headcount: 1, status: "OPEN" }); setEditModalOpen(true); };
  const handleEdit = (r: JobPosting) => { setEditingItem(r); form.setFieldsValue(r); setEditModalOpen(true); };
  const handleSave = async () => {
    try {
      const v = await form.validateFields();
      const url = editingItem ? `/api/job-postings/${editingItem.id}` : "/api/job-postings";
      const res = await fetch(url, { method: editingItem ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      if (res.ok) { message.success(editingItem ? "更新成功" : "创建成功"); setEditModalOpen(false); fetchData(); } else message.error("保存失败");
    } catch { /* */ }
  };
  const handleClose = async (id: string) => { await fetch(`/api/job-postings/${id}`, { method: "DELETE" }); message.success("已关闭"); fetchData(); };
  const handleBatchScreen = async (record: JobPosting) => {
    setBatchModalOpen(true); setBatchResult(null); setBatchLoading(true);
    try {
      const res = await fetch("/api/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "batch-job", jobId: record.id }) });
      if (res.ok) setBatchResult(await res.json());
      else message.error("筛选失败");
    } catch { message.error("筛选失败"); } finally { setBatchLoading(false); }
  };

  const columns: ColumnsType<JobPosting> = [
    { title: "职位", dataIndex: "title", width: 180 },
    { title: "部门", dataIndex: ["department", "name"], width: 110 },
    { title: "岗位", dataIndex: ["position", "name"], width: 110 },
    { title: "薪资", width: 130, render: (_: any, r: JobPosting) => r.salaryMin && r.salaryMax ? `${r.salaryMin / 1000}k-${r.salaryMax / 1000}k` : "-" },
    { title: "编制", dataIndex: "headcount", width: 60 },
    { title: "候选人", dataIndex: ["_count", "candidates"], width: 70 },
    { title: "状态", dataIndex: "status", width: 80, render: (v: string) => <Tag color={jobStatusMap[v]?.color}>{jobStatusMap[v]?.label}</Tag> },
    { title: "操作", width: 280, fixed: "right", render: (_: any, r: JobPosting) => (
      <Space size="small">
        {r._count.candidates > 0 && (
          <Tooltip title="AI 批量筛选候选人">
            <Button size="small" icon={<ExperimentOutlined />} style={{ color: "#722ed1" }} onClick={() => handleBatchScreen(r)}>AI 筛选</Button>
          </Tooltip>
        )}
        <Button size="small" type="link" onClick={() => handleEdit(r)}>编辑</Button>
        {r.status === "OPEN" && <Popconfirm title="确认关闭?" onConfirm={() => handleClose(r.id)}><Button size="small" type="link" danger>关闭</Button></Popconfirm>}
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
          <Input placeholder="搜索职位" prefix={<SearchOutlined />} value={keyword} onChange={e => setKeyword(e.target.value)} onPressEnter={handleSearch} style={{ width: 180 }} allowClear />
          <Select placeholder="状态" value={statusFilter} onChange={v => setStatusFilter(v)} onClear={() => setStatusFilter(undefined)} allowClear style={{ width: 110 }} options={Object.entries(jobStatusMap).map(([k, v]) => ({ label: v.label, value: k }))} />
          <Button onClick={handleSearch} type="primary">搜索</Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
        </Space>
      </Card>
      <Card>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 1000 }}
          pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: t => `共 ${t} 条`, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }} />
      </Card>

      <Modal title={editingItem ? "编辑职位" : "发布职位"} open={editModalOpen} onCancel={() => setEditModalOpen(false)} onOk={handleSave} width={640} destroyOnClose>
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}><Col span={12}><Form.Item name="title" label="职位名称" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="headcount" label="招聘人数" rules={[{ required: true }]}><InputNumber min={1} className="w-full" /></Form.Item></Col></Row>
          <Row gutter={16}><Col span={12}><Form.Item name="deptId" label="部门" rules={[{ required: true }]}><Select options={departments.map(d => ({ label: d.name, value: d.id }))} onChange={() => form.setFieldValue("positionId", undefined)} /></Form.Item></Col>
            <Col span={12}><Form.Item name="positionId" label="岗位" rules={[{ required: true }]}><Select options={positions.map(p => ({ label: p.name, value: p.id }))} /></Form.Item></Col></Row>
          <Row gutter={16}><Col span={12}><Form.Item name="salaryMin" label="最低薪资 (元)"><InputNumber min={0} className="w-full" addonBefore="¥" /></Form.Item></Col>
            <Col span={12}><Form.Item name="salaryMax" label="最高薪资 (元)"><InputNumber min={0} className="w-full" addonBefore="¥" /></Form.Item></Col></Row>
          <Form.Item name="requirements" label="任职要求"><TextArea rows={3} placeholder="输入技能关键词，AI会用这些匹配..." /></Form.Item>
          <Form.Item name="description" label="职位描述"><TextArea rows={3} /></Form.Item>
          <Form.Item name="status" label="状态"><Select options={Object.entries(jobStatusMap).map(([k, v]) => ({ label: v.label, value: k }))} /></Form.Item>
        </Form>
      </Modal>

      {/* Batch Screening Result */}
      <Modal title={batchResult ? `AI 批量筛选 - ${batchResult.jobTitle} (${batchResult.total}人)` : "AI 批量筛选中"} open={batchModalOpen} onCancel={() => setBatchModalOpen(false)} footer={null} width={750}>
        {batchLoading ? <div className="text-center py-12"><Spin size="large" tip="AI 分析中..." /></div> :
          batchResult ? (
            <List dataSource={batchResult.results} renderItem={(item: any, idx: number) => (
              <List.Item extra={<Tag color={scoreColor(item.score)} style={{ fontSize: 16, padding: "2px 12px" }}>{item.score}分</Tag>}>
                <List.Item.Meta
                  avatar={<Badge count={idx + 1} style={{ backgroundColor: idx < 3 ? "#faad14" : "#d9d9d9" }} />}
                  title={<Text strong>{item.candidateName}</Text>}
                  description={<Text type="secondary">{item.summary} · {item.details.recommendation}</Text>}
                />
              </List.Item>
            )} />
          ) : <Result status="error" title="筛选失败" />}
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
  const [matchName, setMatchName] = useState("");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page)); params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/candidates?${params}`);
      const json = await res.json(); setData(json.data); setTotal(json.total);
    } catch { message.error("获取数据失败"); } finally { setLoading(false); }
  };
  const fetchJobs = async () => {
    const res = await fetch("/api/job-postings?pageSize=999&status=OPEN");
    if (res.ok) setJobPostings((await res.json()).data);
  };
  useEffect(() => { fetchData(); }, [page, pageSize, statusFilter]);
  useEffect(() => { fetchJobs(); }, []);

  const handleSearch = () => { setPage(1); fetchData(); };
  const handleCreate = () => { setEditingItem(null); form.resetFields(); form.setFieldsValue({ status: "NEW" }); setEditModalOpen(true); };
  const handleEdit = (r: Candidate) => { setEditingItem(r); form.setFieldsValue(r); setEditModalOpen(true); };
  const handleSave = async () => {
    try {
      const v = await form.validateFields();
      const url = editingItem ? `/api/candidates/${editingItem.id}` : "/api/candidates";
      const res = await fetch(url, { method: editingItem ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      if (res.ok) { message.success(editingItem ? "更新成功" : "创建成功"); setEditModalOpen(false); fetchData(); } else message.error("保存失败");
    } catch { /* */ }
  };
  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/candidates/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    message.success("状态已更新"); fetchData();
  };
  const handleDelete = async (id: string) => { await fetch(`/api/candidates/${id}`, { method: "DELETE" }); message.success("删除成功"); fetchData(); };
  const handleAiMatch = async (r: Candidate) => {
    setMatchName(r.name); setMatchResult(null); setMatchLoading(true); setMatchModalOpen(true);
    try {
      const res = await fetch("/api/match", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "single", candidateId: r.id }) });
      if (res.ok) {
        const json = await res.json();
        setMatchResult(json);
        setScores(prev => ({ ...prev, [r.id]: json.score }));
      } else message.error("分析失败");
    } catch { message.error("分析失败"); } finally { setMatchLoading(false); }
  };

  const columns: ColumnsType<Candidate> = [
    { title: "姓名", dataIndex: "name", width: 90, fixed: "left" },
    { title: "应聘职位", dataIndex: ["jobPosting", "title"], width: 140 },
    { title: "手机", dataIndex: "phone", width: 120, render: (v: string | null) => v || "-" },
    { title: "邮箱", dataIndex: "email", width: 160, render: (v: string | null) => v || "-" },
    { title: "来源", dataIndex: "source", width: 90, render: (v: string | null) => sourceMap[v || ""] || v || "-" },
    { title: "匹配分", width: 100, render: (_: any, r: Candidate) => scores[r.id] ? <Progress percent={scores[r.id]} size="small" strokeColor={scoreColor(scores[r.id])} /> : <Button size="small" type="link" icon={<ThunderboltOutlined />} onClick={() => handleAiMatch(r)}>AI评分</Button> },
    { title: "状态", dataIndex: "status", width: 90, render: (v: string) => <Tag color={candidateStatusMap[v]?.color}>{candidateStatusMap[v]?.label}</Tag> },
    { title: "投递", dataIndex: "createdAt", width: 100, render: (v: string) => dayjs(v).format("MM-DD") },
    { title: "操作", width: 280, fixed: "right", render: (_: any, r: Candidate) => (
      <Space size="small">
        <Button size="small" type="link" icon={<ThunderboltOutlined />} style={{ color: "#722ed1" }} onClick={() => handleAiMatch(r)}>匹配</Button>
        {r.status === "NEW" && <Button size="small" type="link" onClick={() => handleStatusChange(r.id, "SCREENING")}>筛选</Button>}
        {(r.status === "NEW" || r.status === "SCREENING") && <Button size="small" type="link" style={{ color: "#faad14" }} onClick={() => handleStatusChange(r.id, "INTERVIEWING")}>面试</Button>}
        {r.status === "INTERVIEWING" && <Button size="small" type="link" style={{ color: "#722ed1" }} onClick={() => handleStatusChange(r.id, "OFFERED")}>Offer</Button>}
        {r.status === "OFFERED" && <Button size="small" type="link" style={{ color: "#52c41a" }} onClick={() => handleStatusChange(r.id, "HIRED")}>入职</Button>}
        <Button size="small" type="link" onClick={() => handleEdit(r)}>编辑</Button>
        <Popconfirm title="确认删除?" onConfirm={() => handleDelete(r.id)}><Button size="small" type="link" danger>删除</Button></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Title level={4} className="!mb-0">候选人管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>添加候选人</Button>
      </div>
      <Card className="mb-4">
        <Space wrap>
          <Input placeholder="搜索" prefix={<SearchOutlined />} value={keyword} onChange={e => setKeyword(e.target.value)} onPressEnter={handleSearch} style={{ width: 200 }} allowClear />
          <Select placeholder="状态" value={statusFilter} onChange={v => setStatusFilter(v)} onClear={() => setStatusFilter(undefined)} allowClear style={{ width: 120 }} options={Object.entries(candidateStatusMap).map(([k, v]) => ({ label: v.label, value: k }))} />
          <Button onClick={handleSearch} type="primary">搜索</Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
        </Space>
      </Card>
      <Card>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 1200 }}
          pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: t => `共 ${t} 条`, onChange: (p, ps) => { setPage(p); setPageSize(ps); } }} />
      </Card>

      <Modal title={editingItem ? "编辑候选人" : "添加候选人"} open={editModalOpen} onCancel={() => setEditModalOpen(false)} onOk={handleSave} width={560} destroyOnClose>
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}><Col span={12}><Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="jobId" label="应聘职位" rules={[{ required: true }]}><Select options={jobPostings.map(j => ({ label: j.title, value: j.id }))} /></Form.Item></Col></Row>
          <Row gutter={16}><Col span={12}><Form.Item name="phone" label="手机号"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="邮箱"><Input /></Form.Item></Col></Row>
          <Row gutter={16}><Col span={12}><Form.Item name="source" label="来源渠道"><Select options={Object.entries(sourceMap).map(([k, v]) => ({ label: v, value: k }))} /></Form.Item></Col>
            <Col span={12}><Form.Item name="rating" label="评分"><InputNumber min={1} max={5} className="w-full" /></Form.Item></Col></Row>
          <Form.Item name="resumeUrl" label="简历链接"><Input placeholder="https://..." /></Form.Item>
          <Form.Item name="notes" label="备注（技能、经验等，AI用此内容匹配）"><TextArea rows={3} placeholder="如：3年Java开发，熟悉Spring Boot、MySQL..." /></Form.Item>
          <Form.Item name="status" label="状态"><Select options={Object.entries(candidateStatusMap).map(([k, v]) => ({ label: v.label, value: k }))} /></Form.Item>
        </Form>
      </Modal>

      {/* AI Match Modal */}
      <Modal title={`AI 匹配分析 - ${matchName}`} open={matchModalOpen} onCancel={() => setMatchModalOpen(false)} footer={null} width={600}>
        {matchLoading ? <div className="text-center py-12"><Spin size="large" tip="AI 分析中..." /></div> : matchResult ? (
          <div>
            <div className="text-center mb-6">
              <Text type="secondary">{matchResult.method === "ai" ? "🤖 AI 智能匹配" : "📊 规则匹配"}</Text>
              <div className="text-6xl font-bold my-3" style={{ color: scoreColor(matchResult.score) }}>{matchResult.score}</div>
              <Progress percent={matchResult.score} strokeColor={scoreColor(matchResult.score)} />
              <Paragraph className="mt-3"><Text strong>{matchResult.summary}</Text></Paragraph>
            </div>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="技能匹配">{matchResult.details.skills}</Descriptions.Item>
              <Descriptions.Item label="经验匹配">{matchResult.details.experience}</Descriptions.Item>
              <Descriptions.Item label="综合评估">{matchResult.details.fit}</Descriptions.Item>
              <Descriptions.Item label={<Text strong>建议</Text>}>
                <Text strong style={{ color: scoreColor(matchResult.score) }}>{matchResult.details.recommendation}</Text>
              </Descriptions.Item>
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
    try { const res = await fetch("/api/interviews"); if (res.ok) setData(await res.json()); } catch { message.error("获取数据失败"); } finally { setLoading(false); }
  };
  const fetchOptions = async () => {
    const [c, e] = await Promise.all([fetch("/api/candidates?pageSize=999"), fetch("/api/employees?pageSize=999")]);
    if (c.ok) setCandidates((await c.json()).data);
    if (e.ok) setEmployees((await e.json()).data.map((em: any) => ({ id: em.id, name: em.name })));
  };
  useEffect(() => { fetchData(); fetchOptions(); }, []);

  const handleCreate = () => { setEditingItem(null); form.resetFields(); setEditModalOpen(true); };
  const handleEdit = (r: Interview) => { setEditingItem(r); form.setFieldsValue({ ...r, scheduledAt: r.scheduledAt ? dayjs(r.scheduledAt) : undefined }); setEditModalOpen(true); };
  const handleSave = async () => {
    try {
      const v = await form.validateFields();
      const body = { ...v, scheduledAt: v.scheduledAt?.toISOString() };
      const url = editingItem ? `/api/interviews/${editingItem.id}` : "/api/interviews";
      const res = await fetch(url, { method: editingItem ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) { message.success(editingItem ? "更新成功" : "创建成功"); setEditModalOpen(false); fetchData(); } else message.error("保存失败");
    } catch { /* */ }
  };
  const handleDelete = async (id: string) => { await fetch(`/api/interviews/${id}`, { method: "DELETE" }); message.success("删除成功"); fetchData(); };

  const columns: ColumnsType<Interview> = [
    { title: "候选人", dataIndex: ["candidate", "name"], width: 90 },
    { title: "应聘职位", dataIndex: ["candidate", "jobPosting", "title"], width: 140 },
    { title: "面试官", dataIndex: ["interviewer", "name"], width: 90 },
    { title: "时间", dataIndex: "scheduledAt", width: 160, render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm") },
    { title: "结果", dataIndex: "result", width: 80, render: (v: string) => <Tag color={interviewResultMap[v]?.color}>{interviewResultMap[v]?.label}</Tag> },
    { title: "反馈", dataIndex: "feedback", width: 180, render: (v: string | null) => v ? <Text ellipsis style={{ maxWidth: 160 }}>{v}</Text> : <Text type="secondary">暂无</Text> },
    { title: "操作", width: 180, render: (_: any, r: Interview) => (
      <Space size="small">
        <Button size="small" type="link" icon={<EyeOutlined />} onClick={() => { setDetailItem(r); setDetailModalOpen(true); }}>详情</Button>
        <Button size="small" type="link" onClick={() => handleEdit(r)}>编辑</Button>
        <Popconfirm title="确认删除?" onConfirm={() => handleDelete(r.id)}><Button size="small" type="link" danger>删除</Button></Popconfirm>
      </Space>
    )},
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Title level={4} className="!mb-0">面试跟进</Title>
        <Button type="primary" icon={<CalendarOutlined />} onClick={handleCreate}>安排面试</Button>
      </div>
      <Card>
        <Space className="mb-4"><Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button></Space>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 1000 }} pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
      </Card>

      <Modal title={editingItem ? "编辑面试" : "安排面试"} open={editModalOpen} onCancel={() => setEditModalOpen(false)} onOk={handleSave} width={560} destroyOnClose>
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="candidateId" label="候选人" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={candidates.map(c => ({ label: `${c.name} - ${c.jobPosting?.title || ""}`, value: c.id }))} />
          </Form.Item>
          <Form.Item name="employeeId" label="面试官" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={employees.map(e => ({ label: e.name, value: e.id }))} />
          </Form.Item>
          <Form.Item name="scheduledAt" label="面试时间" rules={[{ required: true }]}><DatePicker showTime className="w-full" /></Form.Item>
          <Form.Item name="result" label="面试结果"><Select options={Object.entries(interviewResultMap).map(([k, v]) => ({ label: v.label, value: k }))} /></Form.Item>
          <Form.Item name="feedback" label="面试反馈"><TextArea rows={4} placeholder="记录面试评价..." /></Form.Item>
        </Form>
      </Modal>

      <Modal title="面试详情" open={detailModalOpen} onCancel={() => setDetailModalOpen(false)} footer={null} width={560}>
        {detailItem && (
          <Descriptions bordered column={1} className="mt-4">
            <Descriptions.Item label="候选人">{detailItem.candidate.name}</Descriptions.Item>
            <Descriptions.Item label="应聘职位">{detailItem.candidate.jobPosting?.title}</Descriptions.Item>
            <Descriptions.Item label="面试官">{detailItem.interviewer.name}</Descriptions.Item>
            <Descriptions.Item label="时间">{dayjs(detailItem.scheduledAt).format("YYYY-MM-DD HH:mm")}</Descriptions.Item>
            <Descriptions.Item label="结果"><Tag color={interviewResultMap[detailItem.result]?.color}>{interviewResultMap[detailItem.result]?.label}</Tag></Descriptions.Item>
            <Descriptions.Item label="反馈">{detailItem.feedback || "暂无"}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}

// ─── Main ───
export default function RecruitmentPage() {
  return (
    <div>
      <Title level={4} className="mb-4">招聘管理</Title>
      <Tabs items={[
        { key: "jobs", label: "职位管理", children: <JobPostings /> },
        { key: "candidates", label: "候选人管理", children: <Candidates /> },
        { key: "interviews", label: "面试跟进", children: <Interviews /> },
      ]} />
    </div>
  );
}
