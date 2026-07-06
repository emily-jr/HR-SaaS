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
  Tabs,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Title } = Typography;
const { RangePicker } = DatePicker;

// ─── Types ───
interface AttendanceRecord {
  id: string;
  employeeId: string;
  type: string;
  time: string;
  location: string | null;
  ipAddress: string | null;
  remark: string | null;
  employee: { id: string; name: string; employeeNo: string };
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  employee: { id: string; name: string; employeeNo: string };
}

// ─── Maps ───
const attendanceTypeMap: Record<string, { color: string; label: string }> = {
  CLOCK_IN: { color: "green", label: "上班打卡" },
  CLOCK_OUT: { color: "blue", label: "下班打卡" },
  OVERTIME_IN: { color: "orange", label: "加班开始" },
  OVERTIME_OUT: { color: "purple", label: "加班结束" },
};

const leaveTypeMap: Record<string, string> = {
  ANNUAL: "年假",
  SICK: "病假",
  PERSONAL: "事假",
  MARRIAGE: "婚假",
  MATERNITY: "产假",
  BEREAVEMENT: "丧假",
  OTHER: "其他",
};

const leaveStatusMap: Record<string, { color: string; label: string }> = {
  PENDING: { color: "orange", label: "待审批" },
  APPROVED: { color: "green", label: "已通过" },
  REJECTED: { color: "red", label: "已拒绝" },
  CANCELLED: { color: "default", label: "已取消" },
};

// ─── Tab 1: Attendance Records ───
function AttendanceRecords() {
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      if (typeFilter) params.set("type", typeFilter);
      if (dateRange) {
        params.set("startDate", dateRange[0]);
        params.set("endDate", dateRange[1]);
      }

      const res = await fetch(`/api/attendance?${params}`);
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
  }, [page, pageSize, typeFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ time: dayjs() });
    setEditModalOpen(true);
  };

  const handleEdit = (record: AttendanceRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      time: record.time ? dayjs(record.time) : undefined,
    });
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const body: any = {
        ...values,
        time: values.time?.toISOString(),
      };

      const url = editingRecord
        ? `/api/attendance/${editingRecord.id}`
        : "/api/attendance";
      const method = editingRecord ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        message.success(editingRecord ? "更新成功" : "创建成功");
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
    await fetch(`/api/attendance/${id}`, { method: "DELETE" });
    message.success("删除成功");
    fetchData();
  };

  const columns: ColumnsType<AttendanceRecord> = [
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
      title: "类型",
      dataIndex: "type",
      width: 100,
      render: (v: string) => (
        <Tag color={attendanceTypeMap[v]?.color}>
          {attendanceTypeMap[v]?.label || v}
        </Tag>
      ),
    },
    {
      title: "时间",
      dataIndex: "time",
      width: 170,
      render: (v: string) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm:ss") : "-"),
    },
    {
      title: "位置",
      dataIndex: "location",
      width: 150,
      render: (v: string | null) => v || "-",
    },
    {
      title: "IP 地址",
      dataIndex: "ipAddress",
      width: 130,
      render: (v: string | null) => v || "-",
    },
    {
      title: "备注",
      dataIndex: "remark",
      width: 120,
      render: (v: string | null) => v || "-",
    },
    {
      title: "操作",
      width: 140,
      fixed: "right",
      render: (_: any, record: AttendanceRecord) => (
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
          打卡记录
        </Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增记录
          </Button>
        </Space>
      </div>

      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Input
                placeholder="搜索员工姓名"
                prefix={<SearchOutlined />}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: 200 }}
                allowClear
              />
              <Select
                placeholder="打卡类型"
                value={typeFilter}
                onChange={(v) => setTypeFilter(v)}
                onClear={() => setTypeFilter(undefined)}
                allowClear
                style={{ width: 130 }}
                options={Object.entries(attendanceTypeMap).map(([k, v]) => ({
                  label: v.label,
                  value: k,
                }))}
              />
              <RangePicker
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([
                      dates[0].format("YYYY-MM-DD"),
                      dates[1].format("YYYY-MM-DD"),
                    ]);
                  } else {
                    setDateRange(null);
                  }
                }}
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
        title={editingRecord ? "编辑打卡记录" : "新增打卡记录"}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSave}
        width={500}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="employeeId"
            label="员工 ID"
            rules={[{ required: true, message: "请输入员工ID" }]}
          >
            <Input placeholder="输入员工ID" />
          </Form.Item>
          <Form.Item
            name="type"
            label="打卡类型"
            rules={[{ required: true, message: "请选择打卡类型" }]}
          >
            <Select
              options={Object.entries(attendanceTypeMap).map(([k, v]) => ({
                label: v.label,
                value: k,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="time"
            label="打卡时间"
            rules={[{ required: true, message: "请选择时间" }]}
          >
            <DatePicker showTime className="w-full" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="location" label="位置">
                <Input placeholder="如：公司大楼" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ipAddress" label="IP 地址">
                <Input placeholder="自动获取" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Tab 2: Leave Requests ───
function LeaveRequests() {
  const [data, setData] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/leave-requests?${params}`);
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
    setEditingRequest(null);
    form.resetFields();
    setEditModalOpen(true);
  };

  const handleEdit = (record: LeaveRequest) => {
    setEditingRequest(record);
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
      const body: any = {
        ...values,
        startDate: values.startDate?.toISOString(),
        endDate: values.endDate?.toISOString(),
        days: Number(values.days),
      };

      const url = editingRequest
        ? `/api/leave-requests/${editingRequest.id}`
        : "/api/leave-requests";
      const method = editingRequest ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        message.success(editingRequest ? "更新成功" : "创建成功");
        setEditModalOpen(false);
        fetchData();
      } else {
        message.error("保存失败");
      }
    } catch {
      // validation error
    }
  };

  const handleApprove = async (id: string) => {
    await fetch(`/api/leave-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "APPROVED" }),
    });
    message.success("已通过");
    fetchData();
  };

  const handleReject = async (id: string) => {
    await fetch(`/api/leave-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED" }),
    });
    message.success("已拒绝");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/leave-requests/${id}`, { method: "DELETE" });
    message.success("删除成功");
    fetchData();
  };

  const columns: ColumnsType<LeaveRequest> = [
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
      title: "类型",
      dataIndex: "type",
      width: 80,
      render: (v: string) => leaveTypeMap[v] || v,
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
      title: "天数",
      dataIndex: "days",
      width: 60,
      render: (v: number) => String(v),
    },
    {
      title: "原因",
      dataIndex: "reason",
      width: 150,
      render: (v: string | null) => v || "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 80,
      render: (v: string) => (
        <Tag color={leaveStatusMap[v]?.color}>
          {leaveStatusMap[v]?.label || v}
        </Tag>
      ),
    },
    {
      title: "操作",
      width: 240,
      fixed: "right",
      render: (_: any, record: LeaveRequest) => (
        <Space size="small">
          {record.status === "PENDING" && (
            <>
              <Button
                size="small"
                type="link"
                style={{ color: "#52c41a" }}
                onClick={() => handleApprove(record.id)}
              >
                通过
              </Button>
              <Button
                size="small"
                type="link"
                danger
                onClick={() => handleReject(record.id)}
              >
                拒绝
              </Button>
            </>
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
          请假管理
        </Title>
        <Space>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            新增请假
          </Button>
        </Space>
      </div>

      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Input
                placeholder="搜索员工姓名"
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
                options={Object.entries(leaveStatusMap).map(([k, v]) => ({
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
        title={editingRequest ? "编辑请假" : "新增请假"}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSave}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="employeeId"
            label="员工 ID"
            rules={[{ required: true, message: "请输入员工ID" }]}
          >
            <Input placeholder="输入员工ID" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="请假类型"
                rules={[{ required: true, message: "请选择" }]}
              >
                <Select
                  options={Object.entries(leaveTypeMap).map(([k, v]) => ({
                    label: v,
                    value: k,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="days"
                label="天数"
                rules={[{ required: true, message: "请输入天数" }]}
              >
                <InputNumber min={0.5} step={0.5} className="w-full" />
              </Form.Item>
            </Col>
          </Row>
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
          <Form.Item name="reason" label="请假原因">
            <Input.TextArea rows={3} placeholder="请输入请假原因" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ─── Main Page ───
export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState("records");

  return (
    <div>
      <Title level={4} className="mb-4">
        考勤管理
      </Title>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "records",
            label: "打卡记录",
            children: <AttendanceRecords />,
          },
          {
            key: "leaves",
            label: "请假管理",
            children: <LeaveRequests />,
          },
        ]}
      />
    </div>
  );
}
