/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useContext } from "react";
import axios from "axios";
import {
    Table, Space, Select, Input, Button as AntButton, Modal, Tag,
    notification, Drawer, Timeline, Typography, Card,
    Divider, message, Image, InputNumber
} from 'antd';
import {
    MessageOutlined, ReloadOutlined, SearchOutlined,
    DollarOutlined, HistoryOutlined, SendOutlined,
    StopOutlined, CheckCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { AuthContext } from "../context/AuthContext";

const { Option } = Select;
const { Text, Title } = Typography;
const { TextArea } = Input;

// label thống nhất theo CustomerIssueCreate (KHÔNG có ngoặc)
const TARGET_LABEL = {
    SYSTEM: 'Hệ thống',
    RESTAURANT: 'Quán ăn',
    SHIPPER: 'Shipper',
    ORDER: 'Đơn hàng',
    OTHER: 'Khác',
};

// Nhóm DB (issue.category) - fallback khi không có otherCategory
const BASE_CATEGORY_LABEL = {
    FOOD: 'Chất lượng món ăn',
    ITEM: 'Vấn đề món ăn',
    RESTAURANT: 'Vấn đề quán',
    MIXED: 'Nhiều vấn đề',
    OTHER: 'Khác',
};

// Sub-code (issue.otherCategory) - hiển thị “đúng label”
const SUBCATEGORY_LABEL = {
    // SYSTEM
    ACCOUNT_PROBLEM: 'Vấn đề tài khoản',
    PAYMENT_PROBLEM: 'Vấn đề thanh toán',
    APP_BUG: 'Lỗi website',

    // RESTAURANT
    FOOD_QUALITY: 'Chất lượng món ăn',
    MISSING_ITEM: 'Thiếu món',
    WRONG_ITEM: 'Sai món',
    DAMAGED: 'Hư hỏng hoặc đổ vỡ',

    // SHIPPER / ORDER (nếu có)
    LATE_DELIVERY: 'Giao trễ',
    SHIPPER_BEHAVIOR: 'Thái độ shipper',
    ORDER_STATUS_WRONG: 'Trạng thái đơn không đúng',
    CANNOT_CONTACT: 'Không liên hệ được',
    DELIVERY_PROBLEM: 'Vấn đề giao nhận khác',
};

const toCategoryText = (cat, otherCategory) => {
    const c = String(cat || '').toUpperCase();
    const oc = String(otherCategory || '').trim();

    // ưu tiên sub-code
    if (oc && SUBCATEGORY_LABEL[oc]) return SUBCATEGORY_LABEL[oc];

    // nếu OTHER và user nhập text
    if (c === 'OTHER' && oc) return `Khác: ${oc}`;

    // fallback theo nhóm DB
    return BASE_CATEGORY_LABEL[c] || cat || '—';
};

// --- Component hiển thị trạng thái Issue ---
const IssueStatusTag = ({ status }) => {
    let color = 'blue';
    let text = status;
    switch (status) {
        case 'NEED_OWNER_ACTION': color = 'orange'; text = 'Cần xử lý'; break;
        case 'RESOLVED': color = 'success'; text = 'Đã giải quyết'; break;
        case 'REFUNDED': color = 'volcano'; text = 'Đã hoàn tiền'; break;
        case 'IN_PROGRESS': color = 'processing'; text = 'Đang xử lý'; break;
        case 'OPEN': color = 'blue'; text = 'Mới'; break;
        case 'CLOSED': color = 'default'; text = 'Đã đóng'; break;
        default: color = 'default'; break;
    }
    return <Tag color={color} style={{ minWidth: 100, textAlign: 'center', fontWeight: 'bold' }}>{text}</Tag>;
};

const OwnerIssues = () => {
    const API_URL = "http://localhost:8080/api/owner/issues";
    const { user } = useContext(AuthContext);

    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ownerId, setOwnerId] = useState(null);
    const [accountId, setAccountId] = useState(null);

    const [restaurants, setRestaurants] = useState([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [statusFilter, setStatusFilter] = useState(null);
    const [search, setSearch] = useState("");

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [issueEvents, setIssueEvents] = useState([]);
    const [customRefundAmount, setCustomRefundAmount] = useState(0);

    const [replyContent, setReplyContent] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });

    const maxAmount = selectedIssue?.order?.totalAmount || 0;
    const isAmountInvalid = customRefundAmount < 0 || customRefundAmount > maxAmount;

    useEffect(() => {
        if (user) {
            setAccountId(user.id);
            fetchOwnerId(user.id);
        }
    }, [user]);

    const fetchOwnerId = async (uid) => {
        try {
            const res = await axios.get(`http://localhost:8080/api/owner/byAccount/${uid}`);
            setOwnerId(res.data);
        } catch (err) {
            console.error("Lỗi lấy Owner ID:", err);
        }
    };

    useEffect(() => {
        if (!accountId) return;
        const loadRestaurants = async () => {
            try {
                const res = await axios.get("http://localhost:8080/api/owner/restaurants", {
                    params: { accountId },
                });
                setRestaurants(res.data);
            } catch (err) {
                console.error("Lỗi tải nhà hàng:", err);
            }
        };
        loadRestaurants();
    }, [accountId]);

    const fetchIssues = useCallback(async () => {
        if (!ownerId) return;
        setLoading(true);
        try {
            const response = await axios.get(API_URL, {
                params: {
                    ownerId,
                    restaurantId: selectedRestaurant || null,
                    status: statusFilter || null,
                    search: search || null,
                    page: pagination.current - 1,
                    size: pagination.pageSize,
                }
            });
            setIssues(response.data.content);
            setPagination(prev => ({ ...prev, total: response.data.totalElements }));
        } catch (error) {
            notification.error({ message: 'Lỗi', description: 'Không thể tải danh sách khiếu nại.' });
        } finally {
            setLoading(false);
        }
    }, [ownerId, selectedRestaurant, statusFilter, search, pagination.current, pagination.pageSize]);

    useEffect(() => { fetchIssues(); }, [fetchIssues]);

    const handleViewDetail = async (issue) => {
        setSelectedIssue(issue);
        setDrawerOpen(true);
        setReplyContent("");
        const defaultAmount = issue.ownerRefundAmount > 0
            ? issue.ownerRefundAmount
            : (issue.order?.totalAmount || 0);

        setCustomRefundAmount(defaultAmount);

        try {
            const res = await axios.get(`${API_URL}/${issue.id}/events`);
            setIssueEvents(res.data);
        } catch (err) {
            message.error("Không thể tải lịch sử xử lý");
        }
    };

    // --- 1. Gửi tin nhắn trao đổi ---
    const handleAddEvent = async (type) => {
        if (!replyContent.trim()) return message.warning("Vui lòng nhập nội dung tin nhắn.");

        setSubmitting(true);
        try {
            await axios.post(`${API_URL}/${selectedIssue.id}/events`, {
                accountId,
                eventType: "MESSAGE",
                content: replyContent
            });

            message.success("Đã gửi tin nhắn đến khách hàng");
            setReplyContent("");

            // Load lại timeline để thấy tin nhắn mới
            const res = await axios.get(`${API_URL}/${selectedIssue.id}/events`);
            setIssueEvents(res.data);
        } catch (err) {
            message.error("Không thể gửi tin nhắn.");
        } finally {
            setSubmitting(false);
        }
    };

    // --- 2. Chốt quyết định (Hoàn tiền / Từ chối - Có resolvedReason) ---
    const handleDecision = async (type, amount = null) => {
        if (type === 'REJECTED' && !replyContent.trim()) {
            return message.warning("Vui lòng nhập lý do từ chối để khách hàng được biết.");
        }

        if (type === 'APPROVED' && (!amount || amount <= 0)) {
            return message.warning("Vui lòng nhập số tiền hoàn hợp lệ.");
        }

        setSubmitting(true);
        try {
            const payload = {
                accountId: accountId,
                decision: type, // 'APPROVED' hoặc 'REJECTED'
                amount: amount,
                resolvedReason: replyContent
            };
            await axios.post(`${API_URL}/${selectedIssue.id}/decision`, payload);

            message.success(type === 'APPROVED' ? "Đã xác nhận hoàn tiền" : "Đã từ chối khiếu nại");
            setReplyContent("");
            setDrawerOpen(false);
            fetchIssues();
        } catch (err) {
            message.error(err.response?.data?.message || "Lỗi khi xử lý quyết định.");
        } finally {
            setSubmitting(false);
        }
    };

    const confirmRefund = () => {
        Modal.confirm({
            title: 'Xác nhận hoàn tiền?',
            icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
            content: `Hệ thống sẽ hoàn ${customRefundAmount?.toLocaleString()}đ cho khách. Lý do: ${replyContent}`,
            okText: 'Xác nhận',
            onOk: () => handleDecision('APPROVED', customRefundAmount)
        });
    };

    const confirmReject = () => {
        Modal.confirm({
            title: 'Từ chối khiếu nại?',
            icon: <StopOutlined style={{ color: '#ff4d4f' }} />,
            content: `Khiếu nại sẽ được đóng và không hoàn tiền. Lý do: ${replyContent}`,
            okText: 'Xác nhận từ chối',
            okType: 'danger',
            onOk: () => handleDecision('REJECTED', 0)
        });
    };

    const columns = [
        { title: 'Mã Issue', dataIndex: 'code', render: (text) => <Text strong color="blue">{text}</Text>, width: 100 },
        {
            title: 'Đơn hàng',
            render: (_, r) => <Text copyable>{r.order?.orderNumber || `#${r.orderId}`}</Text>,
            align: 'center'
        },
        {
            title: 'Khách hàng',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{record.order?.customerName?.fullName || 'N/A'}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{record.order?.customer?.phone}</Text>
                </Space>
            ),
        },
        {
            title: 'Nội dung',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{record.title}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        {toCategoryText(record.category, record.otherCategory)}
                    </Text>
                </Space>
            ),
        },
        { title: 'Trạng thái', dataIndex: 'status', render: (status) => <IssueStatusTag status={status} />, align: 'center' },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <AntButton type="primary" icon={<MessageOutlined />} onClick={() => handleViewDetail(record)}> Xử lý </AntButton>
            ),
            align: 'center',
        },
    ];

    return (
        <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
            <Card bordered={false}>
                <Title level={3}>Quản Lý Khiếu Nại</Title>
                <Space size="middle" style={{ marginBottom: 20 }} wrap>
                    <Select style={{ width: 220 }} placeholder="Chọn nhà hàng" value={selectedRestaurant} allowClear onChange={setSelectedRestaurant}>
                        {restaurants.map(r => <Option key={r.id} value={r.id}>{r.name}</Option>)}
                    </Select>
                    <Select style={{ width: 160 }} placeholder="Trạng thái" value={statusFilter} allowClear onChange={setStatusFilter}>
                        <Option value="OPEN">Mới</Option>
                        <Option value="NEED_OWNER_ACTION">Cần xử lý</Option>
                        <Option value="CLOSED">Đã đóng</Option>
                    </Select>
                    <Input placeholder="Tìm mã..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200, height: 32 }} suffix={<SearchOutlined />} />
                    <AntButton icon={<ReloadOutlined />} onClick={() => { setSearch(""); setStatusFilter(null); setSelectedRestaurant(null); }}>Làm mới</AntButton>
                </Space>

                <Table
                    columns={columns}
                    dataSource={issues}
                    rowKey="id"
                    loading={loading}
                    pagination={pagination}
                    onChange={(p) => setPagination(prev => ({ ...prev, current: p.current }))}
                />
            </Card>

            <Drawer
                title={<Space><HistoryOutlined /> Chi tiết: {selectedIssue?.code}</Space>}
                width={650}
                onClose={() => setDrawerOpen(false)}
                open={drawerOpen}
                footer={
                    selectedIssue?.status !== 'CLOSED' && selectedIssue?.status !== 'REFUNDED' && (
                        <div style={{ padding: '10px 0' }}>
                            <div style={{ marginBottom: 15 }}>
                                <Text strong>Nội dung phản hồi / Lý do (Bắt buộc):</Text>
                                <TextArea
                                    rows={3}
                                    value={replyContent}
                                    onChange={e => setReplyContent(e.target.value)}
                                    placeholder="Nhập tin nhắn trao đổi hoặc lý do chốt khiếu nại..."
                                    style={{ marginTop: 8 }}
                                />
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <Text strong>Số tiền hoàn trả (VNĐ):</Text>
                                <InputNumber
                                    style={{ width: '100%', marginTop: 8 }}
                                    value={customRefundAmount}
                                    onChange={setCustomRefundAmount}
                                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                    status={isAmountInvalid ? "error" : ""}
                                />
                                {isAmountInvalid && <Text type="danger" style={{ fontSize: 12 }}>* Số tiền không hợp lệ (Tối đa: {maxAmount.toLocaleString()}đ)</Text>}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Space>
                                    <AntButton type="primary" success="true" style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                                        icon={<CheckCircleOutlined />} onClick={confirmRefund} disabled={isAmountInvalid} loading={submitting}>
                                        Hoàn tiền & Đóng
                                    </AntButton>
                                    <AntButton danger icon={<StopOutlined />} onClick={confirmReject} disabled={!replyContent.trim()} loading={submitting}>
                                        Từ chối
                                    </AntButton>
                                </Space>
                                <AntButton type="default" icon={<SendOutlined />} onClick={() => handleAddEvent('MESSAGE')} disabled={!replyContent.trim()} loading={submitting}>
                                    Chỉ gửi tin nhắn
                                </AntButton>
                            </div>
                        </div>
                    )
                }
            >
                {selectedIssue && (
                    <>
                        <Card size="small" style={{ backgroundColor: '#fffbe6', marginBottom: 20 }}>
                            <div style={{ marginBottom: 20, padding: '0 10px' }}>
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <div><Text type="secondary">Khách hàng: </Text><Text strong>{selectedIssue.order?.customerName?.fullName || 'N/A'}</Text></div>
                                    <div><Text type="secondary">Số điện thoại: </Text><Text strong style={{ color: '#1890ff' }}>{selectedIssue.order?.customer?.phone || 'N/A'}</Text></div>
                                    <div><Text type="secondary">Mã đơn hàng: </Text><Text strong>#{selectedIssue.order?.orderNumber}</Text></div>
                                    <div><Text type="secondary">Tổng đơn: </Text><Text strong style={{ color: '#f5222d' }}>{selectedIssue.order?.totalAmount?.toLocaleString()}đ</Text></div>
                                    <div><Text type="secondary">Trạng thái hiện tại: </Text><IssueStatusTag status={selectedIssue.status} /></div>
                                </Space>
                            </div>
                        </Card>

                        <Timeline mode="left">
                            {issueEvents.map((ev) => (
                                <Timeline.Item
                                    key={ev.id}
                                    color={ev.accountRole === 'OWNER' ? 'green' : 'blue'}
                                    label={dayjs(ev.createdAt).format('HH:mm DD/MM')}
                                >
                                    <Text strong>{ev.accountRole === 'OWNER' ? 'Bạn' : 'Khách hàng'}</Text>
                                    <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '8px', marginTop: 5 }}>
                                        {ev.content}
                                        {ev.attachmentUrl && <div style={{ marginTop: 8 }}><Image width={100} src={ev.attachmentUrl} /></div>}
                                    </div>
                                </Timeline.Item>
                            ))}
                        </Timeline>
                    </>
                )}
            </Drawer>
        </div>
    );
};

export default OwnerIssues;