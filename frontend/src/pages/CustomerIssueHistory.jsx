import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    Table,
    Button,
    Typography,
    Space,
    Tag,
    Modal,
    Descriptions,
    Divider,
    Timeline,
    Image,
    message,
    Input,
} from 'antd';
import { EyeOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

import { useAuth } from '../context/AuthContext';
import { listIssues, getIssueDetail } from '../services/issueService';

import '../css/CustomerIssueHistory.css';

const { Title, Text } = Typography;

const TARGET_LABEL = {
    SYSTEM: 'Hệ thống',
    RESTAURANT: 'Quán ăn',
    SHIPPER: 'Shipper',
    ORDER: 'Đơn hàng',
    OTHER: 'Khác',
};

// DB group fallback
const BASE_CATEGORY_LABEL = {
    SYSTEM: 'Hệ thống',
    DELIVERY: 'Giao hàng',
    SHIPPER_BEHAVIOR: 'Thái độ shipper',
    FOOD: 'Chất lượng món ăn',
    ITEM: 'Vấn đề món ăn',
    RESTAURANT: 'Vấn đề quán',
    MIXED: 'Nhiều vấn đề',
    OTHER: 'Khác',
};

// sub-code (otherCategory)
const SUBCATEGORY_LABEL = {
    // SYSTEM
    ACCOUNT_PROBLEM: 'Vấn đề tài khoản',
    PAYMENT_PROBLEM: 'Vấn đề thanh toán',
    APP_BUG: 'Lỗi ứng dụng hoặc website',
    PROMOTION_PROBLEM: 'Khuyến mãi và ưu đãi',

    // RESTAURANT
    FOOD_QUALITY: 'Chất lượng món ăn',
    MISSING_ITEM: 'Thiếu món',
    WRONG_ITEM: 'Sai món',
    DAMAGED: 'Hư hỏng hoặc đổ vỡ',

    // SHIPPER / ORDER
    LATE_DELIVERY: 'Giao trễ',
    SHIPPER_BEHAVIOR: 'Thái độ shipper',
    ORDER_STATUS_WRONG: 'Trạng thái đơn không đúng',
    CANNOT_CONTACT: 'Không liên hệ được',
    DELIVERY_PROBLEM: 'Vấn đề giao nhận khác',
};

const toCategoryText = (cat, otherCategory) => {
    const c = String(cat || '').toUpperCase();
    const oc = String(otherCategory || '').trim();

    if (oc && SUBCATEGORY_LABEL[oc]) return SUBCATEGORY_LABEL[oc];
    if (c === 'OTHER' && oc) return `Khác: ${oc}`;
    return BASE_CATEGORY_LABEL[c] || cat || '—';
};

const toTargetText = (t) => TARGET_LABEL[String(t || '').toUpperCase()] || t || '—';

const STATUS_LABEL = {
    OPEN: 'Mới tạo',
    NEED_ADMIN_ACTION: 'Cần Admin',
    NEED_OWNER_ACTION: 'Cần Owner',
    NEED_SHIPPER_RESPONSE: 'Chờ Shipper',
    IN_PROGRESS: 'Đang xử lý',
    RESOLVED: 'Đã giải quyết',
    CLOSED: 'Đã đóng',
    REJECTED: 'Từ chối',
};

const eventTypeLabel = (t) => {
    const s = String(t || '').toUpperCase();
    if (s === 'NOTE') return 'Ghi chú';
    if (s === 'MESSAGE') return 'Tin nhắn';
    if (s === 'ATTACHMENT') return 'Đính kèm';
    if (s === 'STATUS_CHANGE') return 'Cập nhật trạng thái';
    if (s === 'ADMIN_CREDIT') return 'Admin hoàn tiền';
    if (s === 'OWNER_REFUND') return 'Owner hoàn tiền';
    return s || 'EVENT';
};

const statusTag = (st) => {
    const s = (st || '').toUpperCase();
    if (s === 'OPEN') return <Tag color="processing">Đang xử lý</Tag>;
    if (s === 'NEED_ADMIN_ACTION') return <Tag color="warning">Cần Admin</Tag>;
    if (s === 'NEED_OWNER_ACTION') return <Tag color="warning">Cần Owner</Tag>;
    if (s === 'RESOLVED') return <Tag color="success">Đã giải quyết</Tag>;
    if (s === 'CLOSED') return <Tag color="default">Đã đóng</Tag>;
    return <Tag>{st || '—'}</Tag>;
};

const targetTag = (t) => {
    const s = (t || '').toUpperCase();
    if (s === 'SYSTEM') return <Tag color="red">{toTargetText(s)}</Tag>;
    if (s === 'SHIPPER') return <Tag color="blue">{toTargetText(s)}</Tag>;
    if (s === 'RESTAURANT') return <Tag color="geekblue">{toTargetText(s)}</Tag>;
    if (s === 'ORDER') return <Tag color="purple">{toTargetText(s)}</Tag>;
    if (s === 'OTHER') return <Tag color="default">{toTargetText(s)}</Tag>;
    return <Tag>{toTargetText(t)}</Tag>;
};

const fmtDate = (d) => (d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—');

const CustomerIssuesHistory = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [issues, setIssues] = useState([]);
    const [q, setQ] = useState('');

    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailIssue, setDetailIssue] = useState(null);
    const [detailEvents, setDetailEvents] = useState([]);
    const [detailOrderSummary, setDetailOrderSummary] = useState(null);

    const fetchIssues = async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const data = await listIssues(user.id, 'MY');
            setIssues(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            message.error('Không thể tải lịch sử yêu cầu hỗ trợ.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user?.id) return;
        fetchIssues();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const filtered = useMemo(() => {
        if (!q.trim()) return issues;
        const s = q.trim().toLowerCase();
        return (issues || []).filter((it) => {
            const code = (it.code || '').toLowerCase();
            const title = (it.title || '').toLowerCase();
            const category = (it.category || '').toLowerCase();
            const orderNumber = (it.orderNumber || '').toLowerCase();
            const orderId = (it.orderId != null ? String(it.orderId) : '').toLowerCase();
            return code.includes(s) || title.includes(s) || category.includes(s) || orderNumber.includes(s) || orderId.includes(s);
        });
    }, [issues, q]);

    const openDetail = async (issue) => {
        if (!user?.id) return;

        try {
            setDetailOpen(true);
            setDetailLoading(true);

            const data = await getIssueDetail(issue.id, user.id);

            // Backend returns { issue, events, orderSummary }
            const issueObj = data?.issue || data?.data?.issue || data;
            const eventsArr = data?.events || data?.issueEvents || data?.data?.events || [];

            // SYSTEM/OTHER sẽ là null, vẫn OK
            const os = data?.orderSummary || data?.data?.orderSummary || null;

            setDetailIssue(issueObj);
            setDetailEvents(Array.isArray(eventsArr) ? eventsArr : []);
            setDetailOrderSummary(os);
        } catch (e) {
            console.error(e);
            message.error('Không thể tải chi tiết yêu cầu.');
            setDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const columns = [
        {
            title: 'Mã',
            dataIndex: 'code',
            key: 'code',
            width: 160,
            render: (v, r) => (
                <Button type="link" className="issue-link" onClick={() => openDetail(r)}>
                    {v || `#${r.id}`}
                </Button>
            ),
        },
        {
            title: 'Đối tượng',
            dataIndex: 'targetType',
            key: 'targetType',
            width: 120,
            render: (v) => targetTag(v),
        },
        {
            title: 'Danh mục',
            dataIndex: 'category',
            key: 'category',
            width: 220,
            render: (_, r) => (
                <div className="issue-category-cell">
                    <Text>{toCategoryText(r.category, r.otherCategory)}</Text>
                </div>
            ),
        },
        {
            title: 'Tiêu đề',
            dataIndex: 'title',
            key: 'title',
            ellipsis: true,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 140,
            render: (v) => statusTag(v),
        },
        {
            title: 'Tạo lúc',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 160,
            render: (v) => <Text type="secondary">{fmtDate(v)}</Text>,
        },
        {
            title: '',
            key: 'action',
            width: 80,
            align: 'center',
            render: (_, r) => (
                <Button icon={<EyeOutlined />} onClick={() => openDetail(r)} />
            ),
        },
    ];

    const attachments = useMemo(() => {
        const urls = [];
        for (const ev of detailEvents || []) {
            if ((ev.eventType || '').toUpperCase() === 'ATTACHMENT') {
                if (ev.attachmentUrl) urls.push(ev.attachmentUrl);
                else if (ev.content && /^https?:\/\//.test(ev.content)) urls.push(ev.content);
            }
        }
        return urls;
    }, [detailEvents]);

    return (
        <div className="issue-history-page">
            <Card className="issue-history-card">
                <div className="issue-history-header">
                    <div>
                        <Title level={3} className="issue-history-title">Lịch sử yêu cầu hỗ trợ</Title>
                        <Text type="secondary">Xem các yêu cầu bạn đã gửi và trạng thái xử lý.</Text>
                    </div>
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchIssues} loading={loading} />
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/support/new')}>
                            Tạo yêu cầu
                        </Button>
                    </Space>
                </div>

                <Divider />

                <div className="issue-history-toolbar">
                    <Input
                        allowClear
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        prefix={<SearchOutlined />}
                        placeholder="Tìm theo mã, tiêu đề, danh mục, orderId..."
                    />
                </div>

                <Table
                    rowKey={(r) => r.id}
                    loading={loading}
                    columns={columns}
                    dataSource={filtered}
                    pagination={{ pageSize: 8 }}
                    scroll={{ x: 980 }}
                />
            </Card>

            <Modal
                open={detailOpen}
                className="issue-detail-modal"
                title={detailIssue?.code || (detailIssue ? `Issue #${detailIssue.id}` : 'Chi tiết yêu cầu')}
                onCancel={() => setDetailOpen(false)}
                footer={null}
                width={920}
            >
                <div className="issue-detail-body">
                    {detailLoading ? (
                        <Text>Đang tải...</Text>
                    ) : (
                        <>
                            <Descriptions bordered size="small" column={2}>
                                <Descriptions.Item label="Trạng thái">{statusTag(detailIssue?.status)}</Descriptions.Item>
                                <Descriptions.Item label="Đối tượng">{targetTag(detailIssue?.targetType)}</Descriptions.Item>
                                <Descriptions.Item label="Đơn hàng">
                                    {detailOrderSummary?.orderNumber
                                        ? detailOrderSummary.orderNumber
                                        : (detailIssue?.orderNumber || (detailIssue?.orderId ? `#${detailIssue.orderId}` : '—'))}
                                </Descriptions.Item>
                                <Descriptions.Item label="Danh mục">
                                    {detailIssue?.category === 'OTHER'
                                        ? (detailIssue?.otherCategory || 'OTHER')
                                        : (detailIssue?.category || '—')}
                                </Descriptions.Item>
                                <Descriptions.Item label="Tiêu đề" span={2}>{detailIssue?.title || '—'}</Descriptions.Item>
                                <Descriptions.Item label="Mô tả" span={2}>{detailIssue?.description || '—'}</Descriptions.Item>
                                <Descriptions.Item label="Tạo lúc">{fmtDate(detailIssue?.createdAt)}</Descriptions.Item>
                                <Descriptions.Item label="Kết thúc">{fmtDate(detailIssue?.resolvedAt)}</Descriptions.Item>
                            </Descriptions>

                            {attachments.length > 0 && (
                                <>
                                    <Divider orientation="left">Ảnh minh chứng</Divider>
                                    <div className="issue-attachments">
                                        {attachments.map((u) => (
                                            <Image key={u} src={u} width={140} height={140} style={{ objectFit: 'cover', borderRadius: 10 }} />
                                        ))}
                                    </div>
                                </>
                            )}

                            <Divider orientation="left">Lịch sử xử lý</Divider>
                            <Timeline
                                className="issue-timeline"
                                items={(detailEvents || []).map((ev) => ({
                                    children: (
                                        <div className="issue-timeline-item">
                                            <div className="issue-timeline-top">
                                                <Text strong>{eventTypeLabel(ev.eventType)}</Text>
                                                <Text type="secondary">{fmtDate(ev.createdAt)}</Text>
                                            </div>
                                            <Text>{ev.content || ''}</Text>
                                            {(ev.oldValue || ev.newValue) && (
                                                <div className="issue-timeline-change">
                                                    <Tag>
                                                        old: {STATUS_LABEL[ev.oldValue] || toCategoryText(ev.oldValue, null) || ev.oldValue || '—'}
                                                    </Tag>
                                                    <Tag>
                                                        new: {STATUS_LABEL[ev.newValue] || toCategoryText(ev.newValue, null) || ev.newValue || '—'}
                                                    </Tag>
                                                </div>
                                            )}
                                        </div>
                                    ),
                                }))}
                            />
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default CustomerIssuesHistory;