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
  Descriptions,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  DollarOutlined,
  CalculatorOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

const { Title, Text } = Typography;

interface SalaryRecord {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  baseSalary: number;
  overtimePay: number;
  bonus: number;
  deduction: number;
  socialIns: number;
  housingFund: number;
  tax: number;
  netSalary: number;
  isIssued: boolean;
  issuedAt: string | null;
  employee: { id: string; name: string; employeeNo: string };
}

const months = Array.from({ length: 12 }, (_, i) => ({
  label: `${i + 1} 月`,
  value: i + 1,
}));

const currentYear = dayjs().year();
const years = Array.from({ length: 5 }, (_, i) => ({
  label: `${currentYear - i} 年`,
  value: currentYear - i,
}));

function formatMoney(v: number): string {
  return `¥${v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PayrollPage() {
  const [data, setData] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [keyword, setKeyword] = useState("");
  const [yearFilter, setYearFilter] = useState<number>(currentYear);
  const [monthFilter, setMonthFilter] = useState<number>(dayjs().month() + 1);
  const [isIssuedFilter, setIsIssuedFilter] = useState<string | undefined>();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalaryRecord | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<SalaryRecord | null>(null);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [generateForm] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (keyword) params.set("keyword", keyword);
      if (yearFilter) params.set("year", String(yearFilter));
      if (monthFilter) params.set("month", String(monthFilter));
      if (isIssuedFilter) params.set("isIssued", isIssuedFilter);

      const res = await fetch(`/api/payroll?${params}`);
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
  }, [page, pageSize, yearFilter, monthFilter, isIssuedFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const handleView = (record: SalaryRecord) => {
    setDetailRecord(record);
    setDetailModalOpen(true);
  };

  const handleEdit = (record: SalaryRecord) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const res = await fetch(`/api/payroll/${editingRecord!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success("更新成功");
        setEditModalOpen(false);
        fetchData();
      } else {
        message.error("保存失败");
      }
    } catch {
      // validation error
    }
  };

  const handleIssue = async (id: string) => {
    await fetch(`/api/payroll/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isIssued: true, issuedAt: new Date().toISOString() }),
    });
    message.success("发放成功");
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/payroll/${id}`, { method: "DELETE" });
    message.success("删除成功");
    fetchData();
  };

  const handleGenerate = async () => {
    try {
      const values = await generateForm.validateFields();
      const { year, month } = values;

      // Get all active employees
      const res = await fetch(`/api/employees?pageSize=999&status=ACTIVE`);
      const json = await res.json();
      const employeeIds = json.data.map((e: any) => e.id);

      if (employeeIds.length === 0) {
        message.warning("没有在职员工");
        return;
      }

      const genRes = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch: true,
          employeeIds,
          year,
          month,
        }),
      });

      if (genRes.ok) {
        const records = await genRes.json();
        message.success(`已为 ${records.length} 名员工生成 ${year}年${month}月 工资条`);
        setGenerateModalOpen(false);
        setYearFilter(year);
        setMonthFilter(month);
        fetchData();
      } else {
        message.error("生成失败");
      }
    } catch {
      // validation error
    }
  };

  const columns: ColumnsType<SalaryRecord> = [
    {
      title: "员工",
      dataIndex: ["employee", "name"],
      width: 100,
      fixed: "left",
    },
    {
      title: "工号",
      dataIndex: ["employee", "employeeNo"],
      width: 100,
    },
    {
      title: "年",
      dataIndex: "year",
      width: 60,
    },
    {
      title: "月",
      dataIndex: "month",
      width: 50,
    },
    {
      title: "基本工资",
      dataIndex: "baseSalary",
      width: 110,
      align: "right",
      render: (v: number) => formatMoney(v),
    },
    {
      title: "加班费",
      dataIndex: "overtimePay",
      width: 100,
      align: "right",
      render: (v: number) => (v > 0 ? formatMoney(v) : "-"),
    },
    {
      title: "奖金",
      dataIndex: "bonus",
      width: 100,
      align: "right",
      render: (v: number) => (v > 0 ? formatMoney(v) : "-"),
    },
    {
      title: "扣款",
      dataIndex: "deduction",
      width: 100,
      align: "right",
      render: (v: number) => (v > 0 ? <Text type="danger">{formatMoney(v)}</Text> : "-"),
    },
    {
      title: "社保",
      dataIndex: "socialIns",
      width: 100,
      align: "right",
      render: (v: number) => formatMoney(v),
    },
    {
      title: "公积金",
      dataIndex: "housingFund",
      width: 100,
      align: "right",
      render: (v: number) => formatMoney(v),
    },
    {
      title: "个税",
      dataIndex: "tax",
      width: 100,
      align: "right",
      render: (v: number) => formatMoney(v),
    },
    {
      title: "实发工资",
      dataIndex: "netSalary",
      width: 120,
      align: "right",
      render: (v: number) => (
        <Text strong style={{ color: "#1677ff", fontSize: 15 }}>
          {formatMoney(v)}
        </Text>
      ),
    },
    {
      title: "状态",
      dataIndex: "isIssued",
      width: 80,
      render: (v: boolean) => (
        <Tag color={v ? "green" : "orange"}>{v ? "已发放" : "待发放"}</Tag>
      ),
    },
    {
      title: "操作",
      width: 200,
      fixed: "right",
      render: (_: any, record: SalaryRecord) => (
        <Space size="small">
          <Button size="small" type="link" onClick={() => handleView(record)}>
            详情
          </Button>
          <Button size="small" type="link" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {!record.isIssued && (
            <Popconfirm title="确认发放?" onConfirm={() => handleIssue(record.id)}>
              <Button size="small" type="link" style={{ color: "#52c41a" }}>
                发放
              </Button>
            </Popconfirm>
          )}
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
          薪酬管理
        </Title>
        <Space>
          <Button
            type="primary"
            icon={<CalculatorOutlined />}
            onClick={() => setGenerateModalOpen(true)}
          >
            生成工资条
          </Button>
        </Space>
      </div>

      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Select
                value={yearFilter}
                onChange={(v) => setYearFilter(v)}
                style={{ width: 100 }}
                options={years}
              />
              <Select
                value={monthFilter}
                onChange={(v) => setMonthFilter(v)}
                style={{ width: 90 }}
                options={months}
              />
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
                placeholder="发放状态"
                value={isIssuedFilter}
                onChange={(v) => setIsIssuedFilter(v)}
                onClear={() => setIsIssuedFilter(undefined)}
                allowClear
                style={{ width: 120 }}
                options={[
                  { label: "已发放", value: "true" },
                  { label: "待发放", value: "false" },
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
          scroll={{ x: 1600 }}
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

      {/* Detail Modal */}
      <Modal
        title="工资明细"
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={600}
      >
        {detailRecord && (
          <Descriptions bordered column={2} className="mt-4">
            <Descriptions.Item label="员工">
              {detailRecord.employee.name}
            </Descriptions.Item>
            <Descriptions.Item label="工号">
              {detailRecord.employee.employeeNo}
            </Descriptions.Item>
            <Descriptions.Item label="年">{detailRecord.year}</Descriptions.Item>
            <Descriptions.Item label="月">{detailRecord.month}</Descriptions.Item>
            <Descriptions.Item label="基本工资">
              {formatMoney(detailRecord.baseSalary)}
            </Descriptions.Item>
            <Descriptions.Item label="加班费">
              {formatMoney(detailRecord.overtimePay)}
            </Descriptions.Item>
            <Descriptions.Item label="奖金">
              {formatMoney(detailRecord.bonus)}
            </Descriptions.Item>
            <Descriptions.Item label="扣款">
              <Text type="danger">{formatMoney(detailRecord.deduction)}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="社保">
              {formatMoney(detailRecord.socialIns)}
            </Descriptions.Item>
            <Descriptions.Item label="公积金">
              {formatMoney(detailRecord.housingFund)}
            </Descriptions.Item>
            <Descriptions.Item label="个税">
              {formatMoney(detailRecord.tax)}
            </Descriptions.Item>
            <Descriptions.Item label="实发工资">
              <Text strong style={{ color: "#1677ff", fontSize: 16 }}>
                {formatMoney(detailRecord.netSalary)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={detailRecord.isIssued ? "green" : "orange"}>
                {detailRecord.isIssued ? "已发放" : "待发放"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="发放时间">
              {detailRecord.issuedAt
                ? dayjs(detailRecord.issuedAt).format("YYYY-MM-DD HH:mm")
                : "-"}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="编辑工资条"
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleSave}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="baseSalary" label="基本工资">
                <InputNumber className="w-full" min={0} precision={2} addonBefore="¥" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="overtimePay" label="加班费">
                <InputNumber className="w-full" min={0} precision={2} addonBefore="¥" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bonus" label="奖金">
                <InputNumber className="w-full" min={0} precision={2} addonBefore="¥" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deduction" label="扣款">
                <InputNumber className="w-full" min={0} precision={2} addonBefore="¥" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="socialIns" label="社保">
                <InputNumber className="w-full" min={0} precision={2} addonBefore="¥" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="housingFund" label="公积金">
                <InputNumber className="w-full" min={0} precision={2} addonBefore="¥" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="tax" label="个税">
                <InputNumber className="w-full" min={0} precision={2} addonBefore="¥" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="netSalary" label="实发工资">
                <InputNumber className="w-full" min={0} precision={2} addonBefore="¥" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Generate Modal */}
      <Modal
        title="批量生成工资条"
        open={generateModalOpen}
        onCancel={() => setGenerateModalOpen(false)}
        onOk={handleGenerate}
        okText="生成"
      >
        <Form form={generateForm} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="year"
                label="年份"
                rules={[{ required: true, message: "请选择" }]}
                initialValue={currentYear}
              >
                <Select options={years} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="month"
                label="月份"
                rules={[{ required: true, message: "请选择" }]}
                initialValue={dayjs().month() + 1}
              >
                <Select options={months} />
              </Form.Item>
            </Col>
          </Row>
          <Text type="secondary">
            将为所有在职员工自动生成工资条，基本工资取自员工档案，社保/公积金/个税按默认规则计算。
          </Text>
        </Form>
      </Modal>
    </div>
  );
}
