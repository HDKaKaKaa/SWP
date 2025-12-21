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
import { getAdminUserDetail } from '../services/adminService';
import { useAuth } from '../context/AuthContext';
import {
    listIssues,
    getIssueDetail,
    adminCreditDecision,
    replyAction,
} from '../services/issueService';
import '../css/AdminIssuesPage.css';

const { Title, Text } = Typography;

const STATUS_META = {
    OPEN: { color: 'default', label: 'Mới tạo' },
    NEED_ADMIN_ACTION: { color: 'orange', label: 'Cần Admin xử lý' },
    NEED_OWNER_ACTION: { color: 'blue', label: 'Cần Chủ quán xử lý' },
    NEED_SHIPPER_RESPONSE: { color: 'blue', label: 'Chờ Shipper phản hồi' },
    RESOLVED: { color: 'green', label: 'Đã giải quyết' },
    REJECTED: { color: 'red', label: 'Từ chối' },
    CLOSED: { color: 'default', label: 'Đã đóng' },
    IN_PROGRESS: { color: 'blue', label: 'Đang xử lý' },
};

const TARGET_LABEL = {
    SYSTEM: 'Hệ thống',
    RESTAURANT: 'Quán ăn',
    SHIPPER: 'Shipper',
    ORDER: 'Đơn hàng',
    OTHER: 'Khác',
};

// label cho nhóm DB (issue.category)
const BASE_CATEGORY_LABEL = {
    DELIVERY: 'Vấn đề giao hàng',
    SHIPPER_BEHAVIOR: 'Thái độ shipper',
    SAFETY: 'An toàn',
    SYSTEM: 'Hệ thống',
    OTHER: 'Khác',
};

// label cho sub-code (issue.otherCategory) mà CustomerIssueCreate sẽ lưu
const SUBCATEGORY_LABEL = {
    ACCOUNT_PROBLEM: 'Vấn đề tài khoản',
    PAYMENT_PROBLEM: 'Vấn đề thanh toán',
    APP_BUG: 'Lỗi website',

    FOOD_QUALITY: 'Chất lượng món ăn',
    MISSING_ITEM: 'Thiếu món',
    WRONG_ITEM: 'Sai món',
    DAMAGED: 'Hư hỏng hoặc đổ vỡ',

    LATE_DELIVERY: 'Giao trễ',
    SHIPPER_BEHAVIOR: 'Thái độ shipper',

    ORDER_STATUS_WRONG: 'Trạng thái đơn không đúng',
    CANNOT_CONTACT: 'Không liên hệ được',
    DELIVERY_PROBLEM: 'Vấn đề giao nhận khác',
};


const CREATED_BY_ROLE_LABEL = {
    CUSTOMER: 'Customer',
    SHIPPER: 'Shipper',
    OWNER: 'Owner',
    ADMIN: 'Admin',
};

const DECISION_OPTIONS = [
    { value: 'APPROVED', label: 'Duyệt hoàn / Credit (giả lập DB)' },
    { value: 'REJECTED', label: 'Từ chối hoàn' },
];

const isAdminHandledIssue = (it) => {
    if (!it) return false;
    if (it.assignedOwnerId != null) return false;
    const cat = String(it.category || '').toUpperCase();
    if (['FOOD', 'ITEM', 'RESTAURANT', 'MIXED'].includes(cat)) return false;
    return true;
};

const fmtMoney = (n) => {
    if (n == null || n === '') return '—';
    const num = Number(n);
    if (Number.isNaN(num)) return '—';
    return `${num.toLocaleString('vi-VN')}đ`;
};

const toStatusTag = (status) => {
    const meta = STATUS_META[status] || { color: 'default', label: status || '—' };
    return <Tag color={meta.color}>{meta.label}</Tag>;
};

const toCategoryText = (cat, otherCategory) => {
    const c = String(cat || '').toUpperCase();
    const oc = String(otherCategory || '').trim();

    // 1) Nếu otherCategory là sub-code => ưu tiên hiển thị label chi tiết
    if (oc && SUBCATEGORY_LABEL[oc]) return SUBCATEGORY_LABEL[oc];

    // 2) Nếu category=OTHER và user nhập text => hiển thị "Khác: ..."
    if (c === 'OTHER' && oc) return `Khác: ${oc}`;

    // 3) Fallback theo nhóm DB
    return BASE_CATEGORY_LABEL[c] || cat || '—';
};

const getOrderNumber = (it, orderSummary) => {
    // Ưu tiên orderSummary (khi mở chi tiết)
    const n1 = orderSummary?.orderNumber;
    if (n1) return n1;

    // Ưu tiên field có sẵn trong issue/list
    const n2 = it?.orderNumber;
    if (n2) return n2;

    // fallback (nếu backend chưa trả orderNumber)
    const id = it?.orderId;
    return id ? `#${id}` : null;
};

const getCreatedByName = (it, nameMap) => {
    const direct =
        it?.createdByName ||
        it?.createdByFullName ||
        it?.createdByUsername ||
        it?.createdByEmail;

    if (direct) return direct;

    const id =
        it?.createdById ??
        it?.createdByAccountId ??
        it?.actorId ??
        null;

    if (id != null && nameMap && nameMap[id]) return nameMap[id];

    return null;
};

const AdminIssuesPage = () => {
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [issues, setIssues] = useState([]);

    const [createdByNameMap, setCreatedByNameMap] = useState({});

    const pickDisplayName = (d) => {
        return (
            d?.fullName ||
            d?.ownerFullName ||   // phòng khi backend trả kiểu owner
            d?.username ||
            d?.phone ||
            d?.email ||
            null
        );
    };

    const getCreatorId = (it) => {
        return it?.createdById ?? it?.createdByAccountId ?? null;
    };

    const loadMissingCreatorNames = async (list) => {
        const ids = Array.from(
            new Set((list || []).map(getCreatorId).filter((v) => v != null))
        );

        const toFetch = ids.filter((id) => !createdByNameMap[id]);
        if (toFetch.length === 0) return;

        const results = await Promise.allSettled(
            toFetch.map((id) => getAdminUserDetail(id))
        );

        setCreatedByNameMap((prev) => {
            const next = { ...prev };
            results.forEach((r, idx) => {
                if (r.status === 'fulfilled') {
                    const name = pickDisplayName(r.value);
                    if (name) next[toFetch[idx]] = name;
                }
            });
            return next;
        });
    };

    useEffect(() => {
        if (!issues || issues.length === 0) return;
        loadMissingCreatorNames(issues);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [issues]);

    // filters
    const [q, setQ] = useState('');
    const [status, setStatus] = useState('ALL');
    const [targetType, setTargetType] = useState('ALL');

    // detail modal
    const [open, setOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detail, setDetail] = useState(null); // { issue, events, orderSummary? }

    const issue = detail?.issue || null;
    const isClosed = useMemo(() => {
        return String(issue?.status || '').toUpperCase() === 'CLOSED';
    }, [issue?.status]);
    const events = detail?.events || [];
    const orderSummary = detail?.orderSummary || null;

    const orderTotal = orderSummary?.totalAmount != null ? Number(orderSummary.totalAmount) : null;
    const orderShip = orderSummary?.shippingFee != null ? Number(orderSummary.shippingFee) : null;

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
            const data = await listIssues(user.id, 'ALL');
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
            if (!isAdminHandledIssue(it)) return false;

            const okStatus = status === 'ALL' ? true : String(it.status || '') === status;
            const okTarget = targetType === 'ALL' ? true : String(it.targetType || '') === targetType;

            const hay = [
                it.code,
                it.title,
                it.category,
                it.otherCategory,
                it.targetType,
                it.createdByRole,
                String(it.orderNumber || it.orderId || ''),
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            const okQ = kw ? hay.includes(kw) : true;
            return okStatus && okTarget && okQ;
        });
    }, [issues, q, status, targetType]);

    // chỉ allow credit với case giao hàng/shipper (tuỳ business bạn muốn)
    const isAdminCreditAllowed = (it) => {
        if (!it) return false;
        const cat = String(it.category || '').toUpperCase();
        const tt = String(it.targetType || '').toUpperCase();
        return tt === 'SHIPPER' || cat === 'DELIVERY' || cat === 'SHIPPER_BEHAVIOR' || cat === 'SAFETY';
    };

    // allow reply cho: SYSTEM/OTHER + delivery/shipper
    const isAdminReplyAllowed = (it) => {
        if (!it) return false;
        const cat = String(it.category || '').toUpperCase();
        const tt = String(it.targetType || '').toUpperCase();

        if (tt === 'SYSTEM' || tt === 'OTHER') return true;
        if (tt === 'SHIPPER') return true;
        if (cat === 'DELIVERY' || cat === 'SHIPPER_BEHAVIOR' || cat === 'SAFETY') return true;

        return false;
    };

    const attachments = useMemo(() => {
        return (events || [])
            .filter((e) => (String(e.eventType || '').toUpperCase() === 'ATTACHMENT') && e.attachmentUrl)
            .map((e) => ({
                id: e.id,
                url: e.attachmentUrl,
                caption: e.content,
                createdAt: e.createdAt,
            }));
    }, [events]);

    const shouldShowOrderSummary = useMemo(() => {
        if (!issue) return false;
        const tt = String(issue.targetType || '').toUpperCase();
        // SYSTEM/OTHER thì ẩn
        if (tt === 'SYSTEM' || tt === 'OTHER') return false;
        // không có orderId thì ẩn
        if (!issue.orderId) return false;
        // có thể backend không trả orderSummary => vẫn ẩn cho chắc
        if (!orderSummary) return false;
        return true;
    }, [issue, orderSummary]);

    const openDetail = async (row) => {
        if (!user?.id) return;
        setOpen(true);
        setDetail(null);
        setReplyText('');
        creditForm.resetFields();

        try {
            setDetailLoading(true);
            const data = await getIssueDetail(row.id, user.id);
            setDetail(data);

            const i = data?.issue;
            const presetDecision =
                i?.adminCreditStatus && i.adminCreditStatus !== 'NONE'
                    ? i.adminCreditStatus
                    : 'APPROVED';

            creditForm.setFieldsValue({
                decision: presetDecision,
                amount: i?.adminCreditAmount != null ? Number(i.adminCreditAmount) : null,
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
        const data = await getIssueDetail(issue.id, user.id);
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

            await replyAction(issue.id, {
                accountId: user.id,
                message: content,
                newStatus: 'RESOLVED',
                statusReason: 'Admin đã phản hồi và chốt xử lý',
            });

            message.success('Đã gửi phản hồi và cập nhật trạng thái.');
            setReplyText('');

            await refreshDetail();
            await fetchIssues();
        } catch (err) {
            console.error(err);
            const data = err?.response?.data;
            const msg =
                (typeof data === 'string' && data) ||
                data?.message ||
                data?.error ||
                'Gửi phản hồi thất bại.';
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
                if (values.amount == null || Number(values.amount) < 0) {
                    message.error('Số tiền hoàn phải >= 0.');
                    return;
                }
            }

            if (values.decision === 'APPROVED' && orderTotal != null && Number(values.amount) > orderTotal) {
                message.error(`Số tiền hoàn không được vượt quá tổng thanh toán (${fmtMoney(orderTotal)}).`);
                return;
            }

            const hadDecision = issue?.adminCreditStatus && issue.adminCreditStatus !== 'NONE';

            Modal.confirm({
                title: hadDecision ? 'Ghi đè quyết định credit?' : 'Xác nhận quyết định refund/credit',
                okText: 'Xác nhận',
                cancelText: 'Huỷ',
                content: (
                    <div className="admin-credit-confirm">
                        <div><b>Mã:</b> {issue.code}</div>
                        <div><b>Quyết định:</b> {values.decision === 'APPROVED' ? 'Duyệt hoàn/Credit' : 'Từ chối hoàn'}</div>
                        <div><b>Số tiền:</b> {values.decision === 'APPROVED' ? fmtMoney(values.amount) : '—'}</div>
                        {hadDecision && (
                            <div style={{ marginTop: 8 }}>
                                <Text type="secondary">
                                    Issue này đã có quyết định trước đó ({issue.adminCreditStatus}). Thao tác này sẽ ghi đè và tạo log event mới.
                                </Text>
                            </div>
                        )}
                    </div>
                ),
                onOk: async () => {
                    try {
                        setCrediting(true);

                        await adminCreditDecision(issue.id, {
                            accountId: user.id,
                            decision: values.decision,
                            amount: values.decision === 'APPROVED' ? values.amount : null,
                            note: (values.note || '').trim() || null,
                        });

                        message.success('Đã cập nhật admin credit (giả lập DB).');
                        await refreshDetail();
                        await fetchIssues();
                    } catch (err) {
                        console.error(err);
                        const data = err?.response?.data;
                        const msg =
                            (typeof data === 'string' && data) ||
                            data?.message ||
                            data?.error ||
                            'Thao tác admin credit thất bại.';
                        message.error(msg);
                    } finally {
                        setCrediting(false);
                    }
                },
            });
        } catch {
            // validateFields already shows errors
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
            width: 190,
            render: (_, row) => <Text>{toCategoryText(row.category, row.otherCategory)}</Text>,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 170,
            render: (v) => toStatusTag(v),
        },
        {
            title: 'Tạo bởi',
            key: 'createdBy',
            width: 200,
            render: (_, row) => {
                const name = getCreatedByName(row, createdByNameMap);
                const role = CREATED_BY_ROLE_LABEL[row.createdByRole] || row.createdByRole;
                return (
                    <div>
                        <Text>{name || '—'}</Text>
                        {role ? (
                            <div>
                                <Text type="secondary" style={{ fontSize: 12 }}>{role}</Text>
                            </div>
                        ) : null}
                    </div>
                );
            },
        },
        {
            title: '',
            key: 'action',
            width: 90,
            render: (_, row) => (
                <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(row)}>
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
                        <Title level={3} className="admin-issues-title">Quản lý Khiếu nại (Admin)</Title>
                        <Text type="secondary">
                            Admin tiếp nhận, phản hồi và xử lý credit/refund (giả lập DB).
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
                            { value: 'OPEN', label: 'Mới tạo' },
                            { value: 'NEED_ADMIN_ACTION', label: 'Cần Admin xử lý' },
                            { value: 'NEED_OWNER_ACTION', label: 'Cần Chủ quán xử lý' },
                            { value: 'NEED_SHIPPER_RESPONSE', label: 'Chờ Shipper phản hồi' },
                            { value: 'IN_PROGRESS', label: 'Đang xử lý' },
                            { value: 'RESOLVED', label: 'Đã giải quyết' },
                            { value: 'REJECTED', label: 'Từ chối' },
                            { value: 'CLOSED', label: 'Đã đóng' },
                        ]}
                    />

                    <Select
                        value={targetType}
                        onChange={setTargetType}
                        className="admin-issues-filter"
                        options={[
                            { value: 'ALL', label: 'Tất cả đối tượng' },
                            { value: 'SYSTEM', label: 'Hệ thống' },
                            { value: 'SHIPPER', label: 'Shipper và giao hàng' },
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
                                    {toCategoryText(issue.category, issue.otherCategory)}
                                </Descriptions.Item>

                                <Descriptions.Item label="Order">
                                    {getOrderNumber(issue, orderSummary) || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Tạo bởi">
                                    <>
                                        <Text>{getCreatedByName(issue, createdByNameMap) || '—'}</Text>
                                        <Text type="secondary">
                                            {' '}
                                            ({CREATED_BY_ROLE_LABEL[issue.createdByRole] || issue.createdByRole || '—'})
                                        </Text>
                                    </>
                                </Descriptions.Item>

                                <Descriptions.Item label="Trạng thái">
                                    {toStatusTag(issue.status)}
                                </Descriptions.Item>
                                <Descriptions.Item label="Tạo lúc">
                                    {issue.createdAt || '—'}
                                </Descriptions.Item>

                                <Descriptions.Item label="Mô tả" span={2}>
                                    <div style={{ whiteSpace: 'pre-wrap' }}>{issue.description || '—'}</div>
                                </Descriptions.Item>
                            </Descriptions>

                            {/* ORDER SUMMARY: chỉ hiện khi có orderSummary + không phải SYSTEM/OTHER */}
                            {shouldShowOrderSummary && (
                                <>
                                    <Divider />
                                    <Text strong>Thông tin đơn hàng</Text>

                                    <Descriptions bordered size="small" column={2} style={{ marginTop: 8 }}>
                                        <Descriptions.Item label="Mã đơn">
                                            {orderSummary?.orderNumber || (issue.orderId ? `#${issue.orderId}` : '—')}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Trạng thái đơn">
                                            {orderSummary?.status || '—'}
                                        </Descriptions.Item>

                                        <Descriptions.Item label="Tổng món (subtotal)">
                                            {orderSummary?.subtotal != null ? fmtMoney(orderSummary.subtotal) : '—'}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Phí ship">
                                            {orderSummary?.shippingFee != null ? fmtMoney(orderSummary.shippingFee) : '—'}
                                        </Descriptions.Item>

                                        <Descriptions.Item label="Tổng thanh toán" span={2}>
                                            <Text strong>{orderTotal != null ? fmtMoney(orderTotal) : '—'}</Text>
                                        </Descriptions.Item>
                                    </Descriptions>
                                    {isClosed && (
                                        <div style={{ marginTop: 12 }}>
                                            <Tag color="default">Issue đã đóng</Tag>
                                            <Text type="secondary" style={{ marginLeft: 8 }}>
                                                Không thể chỉnh sửa / phản hồi / refund sau khi đã CLOSED.
                                            </Text>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ẢNH: lấy từ events */}
                            {attachments.length > 0 && (
                                <>
                                    <Divider />
                                    <div className="admin-issue-attachments">
                                        <Text strong>Ảnh minh chứng</Text>
                                        <div className="admin-issue-attachments-grid">
                                            {attachments.map((a) => (
                                                <div key={a.id} className="admin-issue-attachment-item">
                                                    <img src={a.url} alt="attachment" />
                                                    <div className="admin-issue-attachment-caption">
                                                        <Text type="secondary">{a.caption || 'Bằng chứng'}</Text>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ADMIN CREDIT */}
                            {!isClosed && isAdminCreditAllowed(issue) && (
                                <>
                                    <Divider />
                                    <div className="admin-issue-action">
                                        <div className="admin-issue-action-head">
                                            <Text strong>Admin refund/credit (giả lập DB)</Text>
                                            {issue.adminCreditStatus && issue.adminCreditStatus !== 'NONE' ? (
                                                <Tag color="green">Đã có quyết định</Tag>
                                            ) : (
                                                <Tag color="orange">Chưa quyết định</Tag>
                                            )}
                                        </div>

                                        {issue.adminCreditStatus && issue.adminCreditStatus !== 'NONE' && (
                                            <div className="admin-issue-action-summary">
                                                <Text type="secondary">
                                                    Hiện tại: <b>{issue.adminCreditStatus}</b>
                                                    {issue.adminCreditAmount != null ? ` • ${fmtMoney(issue.adminCreditAmount)}` : ''}
                                                </Text>
                                            </div>
                                        )}

                                        <Form form={creditForm} layout="vertical" className="admin-issue-action-form">
                                            <Form.Item
                                                label="Quyết định"
                                                name="decision"
                                                rules={[{ required: true, message: 'Chọn quyết định' }]}
                                            >
                                                <Radio.Group
                                                    options={DECISION_OPTIONS}
                                                    optionType="button"
                                                    buttonStyle="solid"
                                                    disabled={crediting || detailLoading}
                                                />
                                            </Form.Item>

                                            <div style={{ marginBottom: 10 }}>
                                                <Space wrap>
                                                    <Button
                                                        size="small"
                                                        onClick={() => {
                                                            if (orderTotal == null) return message.warning('Chưa có tổng tiền đơn để tính %.');
                                                            creditForm.setFieldsValue({ amount: Math.round(orderTotal * 0.1) });
                                                        }}
                                                    >
                                                        10%
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        onClick={() => {
                                                            if (orderTotal == null) return message.warning('Chưa có tổng tiền đơn để tính %.');
                                                            creditForm.setFieldsValue({ amount: Math.round(orderTotal * 0.2) });
                                                        }}
                                                    >
                                                        20%
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        onClick={() => {
                                                            if (orderTotal == null) return message.warning('Chưa có tổng tiền đơn để tính %.');
                                                            creditForm.setFieldsValue({ amount: Math.round(orderTotal * 0.3) });
                                                        }}
                                                    >
                                                        30%
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        onClick={() => {
                                                            if (orderTotal == null) return message.warning('Chưa có tổng tiền đơn để tính %.');
                                                            creditForm.setFieldsValue({ amount: Math.round(orderTotal * 0.5) });
                                                        }}
                                                    >
                                                        50%
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        onClick={() => {
                                                            if (orderTotal == null) return message.warning('Chưa có tổng tiền đơn để tính %.');
                                                            creditForm.setFieldsValue({ amount: Math.round(orderTotal) });
                                                        }}
                                                    >
                                                        100%
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        onClick={() => {
                                                            if (orderShip == null) return message.warning('Chưa có phí ship.');
                                                            creditForm.setFieldsValue({ amount: Math.round(orderShip) });
                                                        }}
                                                    >
                                                        Hoàn phí ship
                                                    </Button>
                                                </Space>
                                                <div style={{ marginTop: 6 }}>
                                                    <Text type="secondary">
                                                        Gợi ý: hoàn theo % dựa trên <b>tổng thanh toán</b> hoặc hoàn <b>phí ship</b>.
                                                    </Text>
                                                </div>
                                            </div>

                                            <Form.Item noStyle shouldUpdate={(prev, next) => prev.decision !== next.decision}>
                                                {({ getFieldValue }) => {
                                                    const decision = getFieldValue('decision');
                                                    if (decision !== 'APPROVED') return null;

                                                    return (
                                                        <Form.Item
                                                            label="Số tiền hoàn (giả lập)"
                                                            name="amount"
                                                            rules={[{ required: true, message: 'Nhập số tiền hoàn' }]}
                                                        >
                                                            <InputNumber
                                                                style={{ width: '100%' }}
                                                                min={0}
                                                                max={orderTotal ?? undefined}
                                                                placeholder={orderTotal != null ? `Tối đa ${fmtMoney(orderTotal)}` : 'Ví dụ: 15000'}
                                                                disabled={crediting || detailLoading}
                                                                formatter={(v) => (v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
                                                                parser={(v) => (v ? v.replace(/,/g, '') : '')}
                                                            />
                                                        </Form.Item>
                                                    );
                                                }}
                                            </Form.Item>

                                            <Form.Item label="Ghi chú (optional)" name="note">
                                                <Input.TextArea
                                                    rows={3}
                                                    maxLength={500}
                                                    showCount
                                                    disabled={crediting || detailLoading}
                                                />
                                            </Form.Item>
                                        </Form>

                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button
                                                icon={<DollarOutlined />}
                                                loading={crediting}
                                                disabled={detailLoading || replying}
                                                onClick={handleAdminCredit}
                                            >
                                                Refund/Credit
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ADMIN REPLY */}
                            {!isClosed && isAdminReplyAllowed(issue) && (
                                <>
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
                                        <Divider />
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                                            <Button
                                                type="primary"
                                                icon={<SendOutlined />}
                                                loading={replying}
                                                disabled={detailLoading || crediting || !isAdminReplyAllowed(issue)}
                                                onClick={handleReply}
                                            >
                                                Gửi phản hồi
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Timeline */}
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
                                                        {events.map((ev) => {
                                                            const type = (ev.eventType || '').toUpperCase();
                                                            const lineRight = (() => {
                                                                if (type === 'ATTACHMENT') return ev.attachmentUrl ? 'Đính kèm ảnh' : '';
                                                                if (type === 'MESSAGE') return ev.content || '';
                                                                if (type === 'STATUS_CHANGE') return `${ev.oldValue || ''} → ${ev.newValue || ''}`;
                                                                if (type === 'ADMIN_CREDIT' || type === 'OWNER_REFUND') {
                                                                    const amt = ev.amount != null ? ` • ${fmtMoney(ev.amount)}` : '';
                                                                    return `${ev.oldValue || ''} → ${ev.newValue || ''}${amt}${ev.content ? ` • ${ev.content}` : ''}`;
                                                                }
                                                                return ev.content || `${ev.oldValue || ''} → ${ev.newValue || ''}`.trim();
                                                            })();

                                                            return (
                                                                <div key={ev.id} className="admin-issue-event-row">
                                                                    <Text>{ev.createdAt || ''}</Text>
                                                                    <Text type="secondary">{type || 'EVENT'}</Text>
                                                                    <Text>{lineRight || ''}</Text>
                                                                </div>
                                                            );
                                                        })}
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