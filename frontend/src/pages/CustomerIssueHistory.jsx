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
    if (s === 'SYSTEM') return <Tag color="red">Hệ thống</Tag>
    if (s === 'SHIPPER') return <Tag color="blue">Shipper</Tag>;
    if (s === 'RESTAURANT') return <Tag color="geekblue">Quán</Tag>;
    if (s === 'ORDER') return <Tag color="purple">Đơn hàng</Tag>;
    if (s === 'OTHER') return <Tag color="default">Other</Tag>;
    return <Tag>{t || '—'}</Tag>;
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
            const orderId = (it.orderId != null ? String(it.orderId) : '').toLowerCase();
            return code.includes(s) || title.includes(s) || category.includes(s) || orderId.includes(s);
        });
    }, [issues, q]);

    const openDetail = async (issue) => {
        if (!user?.id) return;
        try {
            setDetailOpen(true);
            setDetailLoading(true);
            const data = await getIssueDetail(issue.id, user.id);

            // Backend returns { issue, events }
            const issueObj = data?.issue || data?.data?.issue || data;
            const eventsArr = data?.events || data?.issueEvents || data?.data?.events || [];

            setDetailIssue(issueObj);
            setDetailEvents(Array.isArray(eventsArr) ? eventsArr : []);
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
            title: 'Đơn',
            dataIndex: 'orderId',
            key: 'orderId',
            width: 90,
            align: 'center',
            render: (v) => <Text>#{v}</Text>,
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
            width: 170,
            render: (v, r) => (
                <div className="issue-category-cell">
                    <Text>{v === 'OTHER' ? (r.otherCategory || 'OTHER') : (v || '—')}</Text>
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
                bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
                open={detailOpen}
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
                                <Descriptions.Item label="Đơn hàng">#{detailIssue?.orderId}</Descriptions.Item>
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
                                                <Text strong>{(ev.eventType || '').toUpperCase()}</Text>
                                                <Text type="secondary">{fmtDate(ev.createdAt)}</Text>
                                            </div>
                                            <Text>{ev.content || ''}</Text>
                                            {(ev.oldValue || ev.newValue) && (
                                                <div className="issue-timeline-change">
                                                    <Tag>old: {ev.oldValue || '—'}</Tag>
                                                    <Tag>new: {ev.newValue || '—'}</Tag>
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