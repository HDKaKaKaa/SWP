import React, { useEffect, useMemo, useState } from 'react';
import {
    Card,
    Table,
    Tag,
    Space,
    Button,
    Input,
    Select,
    Modal,
    Descriptions,
    Divider,
    Typography,
    message,
    Form,
    InputNumber,
    Radio,
    Collapse,
} from 'antd';
import {
    ReloadOutlined,
    EyeOutlined,
    SendOutlined,
    DollarOutlined,
} from '@ant-design/icons';

import { useAuth } from '../context/AuthContext';
import {
    adminGetIssues,
    adminGetIssueDetail,
    adminReplyIssue,
    adminCreditIssue,
} from '../services/issueService';

import '../css/AdminIssuesPage.css';

const { Title, Text } = Typography;

const STATUS_COLORS = {
    NEED_ADMIN_ACTION: 'orange',
    WAITING_OWNER: 'blue',
    RESOLVED: 'green',
    REJECTED: 'red',
    CLOSED: 'default',
};

const TARGET_LABEL = {
    SYSTEM: 'Hệ thống',
    RESTAURANT: 'Quán ăn',
    SHIPPER: 'Shipper',
    ORDER: 'Đơn hàng',
    OTHER: 'Khác',
};

const CREATED_BY_ROLE_LABEL = {
    CUSTOMER: 'Customer',
    SHIPPER: 'Shipper',
    OWNER: 'Owner',
    ADMIN: 'Admin',
};

const DECISION_OPTIONS = [
    { value: 'APPROVED', label: 'Hoàn tiền / Credit (giả lập DB)' },
    { value: 'REJECTED', label: 'Không hoàn' },
];

const AdminIssuesPage = () => {
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [issues, setIssues] = useState([]);

    // filters
    const [q, setQ] = useState('');
    const [status, setStatus] = useState('ALL');
    const [targetType, setTargetType] = useState('ALL');

    // detail modal
    const [open, setOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState(null); // { issue, events }
    const issue = detail?.issue || null;
    const events = detail?.events || [];

    // reply
    const [replyText, setReplyText] = useState('');
    const [replying, setReplying] = useState(false);

    // admin credit
    const [creditForm] = Form.useForm();
    const [crediting, setCrediting] = useState(false);

    const fetchIssues = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const data = await adminGetIssues(user.id); // GET uses actorId
            setIssues(data || []);
        } catch (err) {
            console.error(err);
            message.error('Không thể tải danh sách issue.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIssues();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const filtered = useMemo(() => {
        const kw = (q || '').trim().toLowerCase();
        return (issues || []).filter((it) => {
            const okStatus = status === 'ALL' ? true : (String(it.status || '') === status);
            const okTarget = targetType === 'ALL' ? true : (String(it.targetType || '') === targetType);

            const hay = [
                it.code,
                it.title,
                it.category,
                it.targetType,
                it.createdByRole,
                String(it.orderId || ''),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            const okQ = kw ? hay.includes(kw) : true;

            return okStatus && okTarget && okQ;
        });
    }, [issues, q, status, targetType]);

    const isResolved = (it) => {
        const s = it?.status;
        return s === 'RESOLVED' || s === 'REJECTED' || s === 'CLOSED';
    };

    const isAdminCreditAllowed = (it) => {
        // theo rule bạn chốt: admin xử lý refund cho shipper/delivery
        if (!it) return false;
        if (it.targetType === 'SHIPPER') return true;
        if (it.category === 'DELIVERY' || it.category === 'SHIPPER_BEHAVIOR') return true;
        if (it.targetType === 'ORDER') return true; // nếu bạn muốn admin cũng xử lý order-related
        return false;
    };

    const openDetail = async (row) => {
        if (!user?.id) return;
        setOpen(true);
        setDetail(null);
        setReplyText('');
        creditForm.resetFields();

        try {
            setDetailLoading(true);
            const data = await adminGetIssueDetail(row.id, user.id); // GET uses actorId
            setDetail(data);

            const i = data?.issue;

            creditForm.setFieldsValue({
                decision: i?.adminCreditStatus || 'APPROVED',
                amount: i?.adminCreditAmount ? Number(i.adminCreditAmount) : null,
                note: '',
            });
        } catch (err) {
            console.error(err);
            message.error('Không thể tải chi tiết issue.');
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetail = () => {
        setOpen(false);
        setDetail(null);
        setReplyText('');
        creditForm.resetFields();
    };

    const refreshDetail = async () => {
        if (!user?.id || !issue?.id) return;
        const data = await adminGetIssueDetail(issue.id, user.id);
        setDetail(data);
    };

    const handleReply = async () => {
        if (!user?.id || !issue?.id) return;
        const content = (replyText || '').trim();
        if (!content) {
            message.warning('Vui lòng nhập nội dung phản hồi.');
            return;
        }

        try {
            setReplying(true);
            await adminReplyIssue(issue.id, {
                accountId: user.id, // POST uses accountId
                content,
            });
            message.success('Đã gửi phản hồi.');
            setReplyText('');
            await refreshDetail();
            await fetchIssues();
        } catch (err) {
            console.error(err);
            const msg = err?.response?.data || 'Gửi phản hồi thất bại.';
            message.error(msg);
        } finally {
            setReplying(false);
        }
    };

    const handleAdminCredit = async () => {
        if (!user?.id || !issue?.id) return;

        try {
            const values = await creditForm.validateFields();

            if (values.decision === 'APPROVED') {
                if (values.amount == null || Number(values.amount) <= 0) {
                    message.error('Số tiền hoàn phải > 0.');
                    return;
                }
            }

            Modal.confirm({
                title: 'Xác nhận quyết định refund/credit',
                okText: 'Xác nhận',
                cancelText: 'Huỷ',
                content: (
                    <div className="admin-credit-confirm">
                        <div><b>Mã:</b> {issue.code}</div>
                        <div><b>Quyết định:</b> {values.decision}</div>
                        <div><b>Số tiền:</b> {values.decision === 'APPROVED' ? `${Number(values.amount).toLocaleString('vi-VN')}đ` : '—'}</div>
                    </div>
                ),
                onOk: async () => {
                    try {
                        setCrediting(true);

                        await adminCreditIssue(issue.id, {
                            accountId: user.id,           // POST uses accountId
                            decision: values.decision,    // APPROVED / REJECTED
                            amount: values.decision === 'APPROVED' ? values.amount : null,
                            note: (values.note || '').trim() || null,
                        });

                        message.success('Đã cập nhật admin credit vào DB.');
                        await refreshDetail();
                        await fetchIssues();
                    } catch (err) {
                        console.error(err);
                        const msg = err?.response?.data || 'Thao tác admin credit thất bại.';
                        message.error(msg);
                    } finally {
                        setCrediting(false);
                    }
                },
            });
        } catch {
            // validateFields shows errors
        }
    };

    const columns = [
        {
            title: 'Mã',
            dataIndex: 'code',
            key: 'code',
            width: 170,
            render: (v) => <Text strong>{v || '-'}</Text>,
        },
        {
            title: 'Tiêu đề',
            dataIndex: 'title',
            key: 'title',
            ellipsis: true,
            render: (v) => <Text>{v || '-'}</Text>,
        },
        {
            title: 'Đối tượng',
            dataIndex: 'targetType',
            key: 'targetType',
            width: 130,
            render: (v) => <Tag>{TARGET_LABEL[v] || v || '-'}</Tag>,
        },
        {
            title: 'Danh mục',
            dataIndex: 'category',
            key: 'category',
            width: 140,
            render: (v) => <Text>{v || '-'}</Text>,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 160,
            render: (v) => (
                <Tag color={STATUS_COLORS[v] || 'default'}>
                    {v || '-'}
                </Tag>
            ),
        },
        {
            title: 'Order',
            dataIndex: 'orderId',
            key: 'orderId',
            width: 90,
            render: (v) => (v ? <Text>#{v}</Text> : <Text type="secondary">—</Text>),
        },
        {
            title: 'Tạo bởi',
            dataIndex: 'createdByRole',
            key: 'createdByRole',
            width: 120,
            render: (v) => <Text>{CREATED_BY_ROLE_LABEL[v] || v || '-'}</Text>,
        },
        {
            title: '',
            key: 'action',
            width: 90,
            render: (_, row) => (
                <Button
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => openDetail(row)}
                >
                    Xem
                </Button>
            ),
        },
    ];

    return (
        <div className="admin-issues-page">
            <Card className="admin-issues-card">
                <div className="admin-issues-header">
                    <div>
                        <Title level={3} className="admin-issues-title">Issue (Admin)</Title>
                        <Text type="secondary">
                            Admin tiếp nhận, phản hồi và xử lý refund/credit (giả lập DB) cho case shipper/delivery.
                        </Text>
                    </div>

                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchIssues} loading={loading}>
                            Tải lại
                        </Button>
                    </Space>
                </div>

                <Divider />

                <div className="admin-issues-filters">
                    <Input
                        placeholder="Tìm theo mã / tiêu đề / orderId..."
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        allowClear
                    />

                    <Select
                        value={status}
                        onChange={setStatus}
                        className="admin-issues-filter"
                        options={[
                            { value: 'ALL', label: 'Tất cả trạng thái' },
                            { value: 'NEED_ADMIN_ACTION', label: 'NEED_ADMIN_ACTION' },
                            { value: 'WAITING_OWNER', label: 'WAITING_OWNER' },
                            { value: 'RESOLVED', label: 'RESOLVED' },
                            { value: 'REJECTED', label: 'REJECTED' },
                            { value: 'CLOSED', label: 'CLOSED' },
                        ]}
                    />

                    <Select
                        value={targetType}
                        onChange={setTargetType}
                        className="admin-issues-filter"
                        options={[
                            { value: 'ALL', label: 'Tất cả đối tượng' },
                            { value: 'SYSTEM', label: 'Hệ thống' },
                            { value: 'RESTAURANT', label: 'Quán ăn' },
                            { value: 'SHIPPER', label: 'Shipper' },
                            { value: 'ORDER', label: 'Đơn hàng' },
                            { value: 'OTHER', label: 'Khác' },
                        ]}
                    />
                </div>

                <Table
                    rowKey="id"
                    loading={loading}
                    columns={columns}
                    dataSource={filtered}
                    pagination={{ pageSize: 10 }}
                    className="admin-issues-table"
                />
            </Card>

            <Modal
                open={open}
                onCancel={closeDetail}
                footer={null}
                width={920}
                className="admin-issue-detail-modal"
                title={issue?.code || 'Issue Detail'}
            >
                <Card size="small" className="admin-issue-detail-card" loading={detailLoading}>
                    {issue && (
                        <>
                            <Descriptions bordered size="small" column={2} className="admin-issue-desc">
                                <Descriptions.Item label="Tiêu đề" span={2}>
                                    {issue.title || '—'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Đối tượng">
                                    <Tag>{TARGET_LABEL[issue.targetType] || issue.targetType || '—'}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Danh mục">
                                    {issue.category || '—'}
                                    {issue.otherCategory ? (
                                        <Text type="secondary"> • {issue.otherCategory}</Text>
                                    ) : null}
                                </Descriptions.Item>

                                <Descriptions.Item label="Order">
                                    {issue.orderId ? `#${issue.orderId}` : '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Tạo bởi">
                                    {CREATED_BY_ROLE_LABEL[issue.createdByRole] || issue.createdByRole || '—'} #{issue.createdById || '—'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Trạng thái">
                                    <Tag color={STATUS_COLORS[issue.status] || 'default'}>
                                        {issue.status || '—'}
                                    </Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Tạo lúc">
                                    {issue.createdAt || '—'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Mô tả" span={2}>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{issue.description || '—'}</div>
                                </Descriptions.Item>
                            </Descriptions>

                            {!!(issue.attachments && issue.attachments.length) && (
                                <>
                                    <Divider />
                                    <div className="admin-issue-attachments">
                                        <Text strong>Ảnh minh chứng</Text>
                                        <div className="admin-issue-attachments-grid">
                                            {issue.attachments.map((a) => (
                                                <div key={a.id} className="admin-issue-attachment-item">
                                                    <img src={a.attachmentUrl} alt="attachment" />
                                                    <div className="admin-issue-attachment-caption">
                                                        <Text type="secondary">{a.content || 'Bằng chứng'}</Text>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ADMIN CREDIT ACTION */}
                            {isAdminCreditAllowed(issue) && (
                                <>
                                    <Divider />
                                    <div className="admin-issue-action">
                                        <div className="admin-issue-action-head">
                                            <Text strong>Admin refund/credit (giả lập DB)</Text>
                                            {issue.adminCreditStatus ? (
                                                <Tag color="green">Đã quyết định</Tag>
                                            ) : (
                                                <Tag color="orange">Chưa quyết định</Tag>
                                            )}
                                        </div>

                                        {issue.adminCreditStatus && (
                                            <div className="admin-issue-action-summary">
                                                <Text type="secondary">
                                                    Kết quả: <b>{issue.adminCreditStatus}</b>
                                                    {issue.adminCreditAmount ? ` • ${Number(issue.adminCreditAmount).toLocaleString('vi-VN')}đ` : ''}
                                                </Text>
                                            </div>
                                        )}

                                        <Form
                                            form={creditForm}
                                            layout="vertical"
                                            className="admin-issue-action-form"
                                        >
                                            <Form.Item
                                                label="Quyết định"
                                                name="decision"
                                                rules={[{ required: true, message: 'Chọn quyết định' }]}
                                            >
                                                <Radio.Group
                                                    options={DECISION_OPTIONS}
                                                    optionType="button"
                                                    buttonStyle="solid"
                                                    disabled={!!issue.adminCreditStatus || crediting}
                                                />
                                            </Form.Item>

                                            <Form.Item
                                                noStyle
                                                shouldUpdate={(prev, next) => prev.decision !== next.decision}
                                            >
                                                {({ getFieldValue }) => {
                                                    const decision = getFieldValue('decision');
                                                    if (decision !== 'APPROVED') return null;

                                                    return (
                                                        <Form.Item
                                                            label="Số tiền hoàn"
                                                            name="amount"
                                                            rules={[{ required: true, message: 'Nhập số tiền hoàn' }]}
                                                        >
                                                            <InputNumber
                                                                style={{ width: '100%' }}
                                                                min={0}
                                                                placeholder="Ví dụ: 15000"
                                                                disabled={!!issue.adminCreditStatus || crediting}
                                                                formatter={(v) =>
                                                                    v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
                                                                }
                                                                parser={(v) => (v ? v.replace(/,/g, '') : '')}
                                                            />
                                                        </Form.Item>
                                                    );
                                                }}
                                            </Form.Item>

                                            <Form.Item label="Ghi chú (optional)" name="note">
                                                <Input.TextArea
                                                    rows={3}
                                                    placeholder="Ví dụ: Hoàn phí giao hàng do shipper làm đổ nước"
                                                    maxLength={500}
                                                    showCount
                                                    disabled={!!issue.adminCreditStatus || crediting}
                                                />
                                            </Form.Item>

                                            <div className="admin-issue-action-buttons">
                                                <Button
                                                    type="primary"
                                                    icon={<DollarOutlined />}
                                                    loading={crediting}
                                                    disabled={detailLoading || !!issue.adminCreditStatus}
                                                    onClick={handleAdminCredit}
                                                >
                                                    Xác nhận
                                                </Button>
                                            </div>
                                        </Form>
                                    </div>
                                </>
                            )}

                            {/* ADMIN REPLY */}
                            <Divider />
                            <div className="admin-issue-reply">
                                <Text strong>Phản hồi của Admin</Text>
                                <Input.TextArea
                                    rows={4}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Nhập phản hồi cho người dùng..."
                                    maxLength={800}
                                    showCount
                                    disabled={detailLoading}
                                />
                                <div className="admin-issue-reply-actions">
                                    <Button
                                        type="primary"
                                        icon={<SendOutlined />}
                                        loading={replying}
                                        onClick={handleReply}
                                        disabled={detailLoading}
                                    >
                                        Gửi phản hồi
                                    </Button>
                                </div>
                            </div>

                            {/* Timeline: default ẩn, toggle bằng mũi tên */}
                            {events?.length > 0 && (
                                <>
                                    <Divider />
                                    <Collapse
                                        ghost
                                        items={[
                                            {
                                                key: 'timeline',
                                                label: 'Xem lịch sử xử lý',
                                                children: (
                                                    <div className="admin-issue-events">
                                                        {events.map((ev) => (
                                                            <div key={ev.id} className="admin-issue-event-row">
                                                                <Text>{ev.createdAt || ''}</Text>
                                                                <Text type="secondary">
                                                                    {ev.type || ev.action || 'EVENT'}
                                                                </Text>
                                                                <Text>{ev.note || ''}</Text>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ),
                                            },
                                        ]}
                                    />
                                </>
                            )}
                        </>
                    )}
                </Card>
            </Modal>
        </div>
    );
};

export default AdminIssuesPage;