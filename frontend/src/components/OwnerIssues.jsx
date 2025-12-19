/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useContext } from "react";
import axios from "axios";
import {
    Table, Space, Select, Input, Button as AntButton, Modal, Tag,
    notification, Drawer, Timeline, Typography, Card,
    Divider, message, Image
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

    // Filter states
    const [restaurants, setRestaurants] = useState([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [statusFilter, setStatusFilter] = useState(null);
    const [search, setSearch] = useState("");

    // Drawer states
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [issueEvents, setIssueEvents] = useState([]);

    // Form states
    const [replyContent, setReplyContent] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });

    // 1. Khởi tạo ID người dùng
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

    // 2. Tải danh sách Nhà hàng của Owner
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

    // 3. Tải danh sách Khiếu nại (Issues)
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

    // 4. Mở Drawer chi tiết
    const handleViewDetail = async (issue) => {
        setSelectedIssue(issue);
        setDrawerOpen(true);
        setReplyContent("");
        try {
            const res = await axios.get(`${API_URL}/${issue.id}/events`);
            setIssueEvents(res.data);
        } catch (err) {
            message.error("Không thể tải lịch sử xử lý");
        }
    };

    // 5. Gửi sự kiện (Nhắn tin / Hoàn tiền / Từ chối)
    const handleAddEvent = async (type, amount = null) => {
        if ((type === 'MESSAGE' || type === 'REJECT') && !replyContent.trim()) {
            return message.warning("Vui lòng nhập nội dung phản hồi.");
        }

        setSubmitting(true);
        try {
            await axios.post(`${API_URL}/${selectedIssue.id}/events`, {
                accountId,
                eventType: type,
                content: replyContent,
                amount: amount
            });

            message.success(type === 'OWNER_REFUND' ? "Đã phê duyệt hoàn tiền & Đóng khiếu nại" : "Đã cập nhật khiếu nại");
            setReplyContent("");
            setDrawerOpen(false);
            fetchIssues(); // Refresh danh sách
        } catch (err) {
            message.error("Thao tác thất bại. Vui lòng kiểm tra lại.");
        } finally {
            setSubmitting(false);
        }
    };

    // --- Modal xác nhận Hoàn tiền ---
    const confirmRefund = () => {
        Modal.confirm({
            title: 'Xác nhận hoàn tiền?',
            icon: <DollarOutlined style={{ color: '#ff4d4f' }} />,
            content: `Hệ thống sẽ hoàn ${selectedIssue?.ownerRefundAmount?.toLocaleString()}đ cho khách và đóng khiếu nại này.`,
            okText: 'Xác nhận',
            cancelText: 'Hủy',
            onOk: () => handleAddEvent('OWNER_REFUND', selectedIssue.ownerRefundAmount)
        });
    };

    // --- Modal xác nhận Từ chối ---
    const confirmReject = () => {
        Modal.confirm({
            title: 'Từ chối khiếu nại?',
            icon: <StopOutlined style={{ color: '#faad14' }} />,
            content: 'Bạn chắc chắn muốn từ chối? Khiếu nại sẽ được đóng lại mà không hoàn tiền.',
            okText: 'Xác nhận từ chối',
            okType: 'danger',
            onOk: () => handleAddEvent('REJECT')
        });
    };

    const columns = [
        {
            title: 'Mã Issue',
            dataIndex: 'code',
            render: (text) => <Text strong style={{ color: '#1890ff' }}>{text}</Text>,
            width: 100,
        },
        {
            title: 'Thông tin khiếu nại',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{record.title}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{record.category}</Text>
                </Space>
            ),
        },
        { title: 'Đơn hàng', dataIndex: 'orderId', render: (id) => `#${id}`, align: 'center' },
        { title: 'Trạng thái', dataIndex: 'status', render: (status) => <IssueStatusTag status={status} />, align: 'center' },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <AntButton type="primary"  icon={<MessageOutlined />} onClick={() => handleViewDetail(record)}> Xử lý </AntButton>
            ),
            align: 'center',
        },
    ];

    return (
        <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
            <Card bordered={false}>
                <Title level={3}>Quản Lý Khiếu Nại</Title>

                <Space size="middle" style={{ marginBottom: 20 }} wrap>
                    <Select style={{ width: 220 }} placeholder="Chọn nhà hàng" value={selectedRestaurant} allowClear onChange={val => setSelectedRestaurant(val)}>
                        {restaurants.map(r => <Option key={r.id} value={r.id}>{r.name}</Option>)}
                    </Select>
                    <Select style={{ width: 160 }} placeholder="Trạng thái" value={statusFilter} allowClear onChange={val => setStatusFilter(val)}>
                        <Option value="OPEN">Mới</Option>
                        <Option value="NEED_OWNER_ACTION">Cần xử lý</Option>
                        <Option value="CLOSED">Đã đóng</Option>
                    </Select>
                    <Input placeholder="Tìm mã khiếu nại..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} suffix={<SearchOutlined />} />
                    <AntButton icon={<ReloadOutlined />} onClick={() => { setSearch(""); setStatusFilter(null); setSelectedRestaurant(null); }}>Làm mới</AntButton>
                </Space>

                <Table
                    columns={columns}
                    dataSource={issues}
                    rowKey="id"
                    loading={loading}
                    pagination={{ ...pagination, showSizeChanger: false }}
                    onChange={(p) => setPagination(prev => ({ ...prev, current: p.current }))}
                />
            </Card>

            <Drawer
                title={<Space><HistoryOutlined /> Chi tiết xử lý: {selectedIssue?.code}</Space>}
                width={600}
                onClose={() => setDrawerOpen(false)}
                open={drawerOpen}
                footer={
                    selectedIssue?.status !== 'CLOSED' && (
                        <div style={{ padding: '10px 0' }}>
                            <TextArea 
                                rows={3} 
                                placeholder="Nhập tin nhắn phản hồi hoặc lý do..." 
                                value={replyContent} 
                                onChange={e => setReplyContent(e.target.value)} 
                            />
                            <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between' }}>
                                <Space>
                                    <AntButton danger type="primary" icon={<CheckCircleOutlined />} onClick={confirmRefund} loading={submitting}>Hoàn tiền</AntButton>
                                    <AntButton danger icon={<StopOutlined />} onClick={confirmReject} loading={submitting}>Từ chối</AntButton>
                                </Space>
                                <AntButton type="primary" icon={<SendOutlined />} onClick={() => handleAddEvent('MESSAGE')} loading={submitting}>Gửi phản hồi</AntButton>
                            </div>
                        </div>
                    )
                }
            >
                {selectedIssue && (
                    <>
                        <Card size="small" style={{ backgroundColor: '#fffbe6', border: '1px solid #ffe58f', marginBottom: 20 }}>
                            <Title level={5}><InfoCircleOutlined /> {selectedIssue.title}</Title>
                            <Text>{selectedIssue.description}</Text>
                            <Divider style={{ margin: '12px 0' }} />
                            <Space split={<Divider type="vertical" />}>
                                <Text>Đơn: <b>#{selectedIssue.orderId}</b></Text>
                                <Text>Hoàn tiền: <b style={{ color: '#f5222d' }}>{selectedIssue.ownerRefundAmount?.toLocaleString()}đ</b></Text>
                                <IssueStatusTag status={selectedIssue.status} />
                            </Space>
                        </Card>

                        <Timeline mode="left">
                            {issueEvents.map((ev) => (
                                <Timeline.Item 
                                    key={ev.id} 
                                    color={ev.accountRole === 'OWNER' ? 'green' : (ev.accountRole === 'ADMIN' ? 'red' : 'blue')}
                                    label={dayjs(ev.createdAt).format('HH:mm DD/MM')}
                                >
                                    <Text strong>{ev.accountRole === 'OWNER' ? 'Bạn' : (ev.accountRole === 'ADMIN' ? 'CSKH' : 'Khách hàng')}</Text>
                                    <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '8px', marginTop: 5 }}>
                                        {ev.content}
                                        {ev.attachmentUrl && (
                                            <div style={{ marginTop: 8 }}>
                                                <Image width={120} src={ev.attachmentUrl} style={{ borderRadius: 4 }} />
                                            </div>
                                        )}
                                        {ev.eventType === 'OWNER_REFUND' && <Tag color="volcano" style={{marginTop: 5}}>Đã xác nhận hoàn tiền</Tag>}
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