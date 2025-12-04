import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, message, Spin, Space, Rate, Input, DatePicker, Select, Button, Row, Col } from 'antd';
import {
    HistoryOutlined,
    SearchOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    getMyOrders,
    editOrder,
    deleteOrder
} from '../services/shipperService';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const ShipperHistory = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [shipperId, setShipperId] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [dateRange, setDateRange] = useState(null);
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        if (user && user.id) {
            setShipperId(user.shipperId || user.id);
        }
    }, [user]);

    useEffect(() => {
        if (shipperId) {
            fetchOrders();
        }
    }, [shipperId]);

    useEffect(() => {
        applyFilters();
    }, [orders, searchText, dateRange, statusFilter]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await getMyOrders(shipperId);
            // Lấy đơn hàng đã hoàn thành hoặc đã hủy
            const historyOrders = data.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED');
            setOrders(historyOrders);
        } catch (error) {
            message.error('Không thể tải lịch sử đơn hàng!');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...orders];

        // Lọc theo trạng thái
        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(order => order.status === statusFilter);
        }

        // Lọc theo từ khóa tìm kiếm
        if (searchText) {
            filtered = filtered.filter(order =>
                order.restaurantName?.toLowerCase().includes(searchText.toLowerCase()) ||
                order.shippingAddress?.toLowerCase().includes(searchText.toLowerCase()) ||
                order.id?.toString().includes(searchText)
            );
        }

        // Lọc theo khoảng thời gian
        if (dateRange && dateRange.length === 2) {
            const startDate = dateRange[0].startOf('day');
            const endDate = dateRange[1].endOf('day');
            filtered = filtered.filter(order => {
                const orderDate = dayjs(order.completedAt || order.createdAt);
                return orderDate.isAfter(startDate) && orderDate.isBefore(endDate);
            });
        }

        setFilteredOrders(filtered);
    };

    // Tính thời gian giao hàng (từ shippedAt đến completedAt)
    const calculateDeliveryTime = (order) => {
        if (order.shippedAt && order.completedAt) {
            const startTime = dayjs(order.shippedAt);
            const endTime = dayjs(order.completedAt);
            const diffMinutes = endTime.diff(startTime, 'minute');
            
            if (diffMinutes < 60) {
                return `${diffMinutes} phút`;
            } else {
                const hours = Math.floor(diffMinutes / 60);
                const minutes = diffMinutes % 60;
                return `${hours}h ${minutes}m`;
            }
        }
        return 'N/A';
    };

    // Format số tiền
    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    // Format ngày tháng
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return dayjs(dateString).format('DD/MM/YYYY HH:mm');
    };

    // Tính tổng doanh thu (chỉ tính đơn COMPLETED)
    const totalRevenue = filteredOrders
        .filter(order => order.status === 'COMPLETED')
        .reduce((sum, order) => {
            return sum + (parseFloat(order.totalAmount) || 0);
        }, 0);
    
    // Đếm số đơn theo trạng thái
    const completedCount = filteredOrders.filter(o => o.status === 'COMPLETED').length;
    const cancelledCount = filteredOrders.filter(o => o.status === 'CANCELLED').length;

    // Định nghĩa cột cho bảng
    const columns = [
        {
            title: 'Mã đơn',
            dataIndex: 'id',
            key: 'id',
            width: 80,
        },
        {
            title: 'Nhà hàng',
            dataIndex: 'restaurantName',
            key: 'restaurantName',
        },
        {
            title: 'Địa chỉ giao hàng',
            dataIndex: 'shippingAddress',
            key: 'shippingAddress',
            ellipsis: true,
        },
        {
            title: 'Khoảng cách',
            key: 'distance',
            render: () => 'N/A', // Không tính khoảng cách trong lịch sử
            width: 120,
        },
        {
            title: 'Thời gian giao',
            key: 'deliveryTime',
            render: (_, record) => calculateDeliveryTime(record),
            width: 120,
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (amount) => formatMoney(amount),
        },
        {
            title: 'Thanh toán',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            render: (method) => <Tag>{method}</Tag>,
        },
        {
            title: 'Đánh giá',
            key: 'rating',
            render: () => <Rate disabled defaultValue={5} style={{ fontSize: 14 }} />,
            width: 150,
        },
        {
            title: 'Thời gian hoàn thành',
            dataIndex: 'completedAt',
            key: 'completedAt',
            render: (date) => formatDate(date),
            width: 180,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const colorMap = {
                    'COMPLETED': 'green',
                    'CANCELLED': 'red',
                };
                const iconMap = {
                    'COMPLETED': <CheckCircleOutlined />,
                    'CANCELLED': <CloseCircleOutlined />,
                };
                return (
                    <Tag color={colorMap[status]} icon={iconMap[status]}>
                        {status}
                    </Tag>
                );
            },
            width: 120,
        },
        {
            title: 'Thao tác',
            key: 'action',
            fixed: 'right',
            width: 120,
            render: (_, record) => (
                <Button
                    type="primary"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/shipper/history/${record.id}`)}
                >
                    Xem chi tiết
                </Button>
            ),
        },
    ];

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: 50 }}><Spin size="large" /></div>;
    }

    return (
        <div style={{ padding: 0, margin: 0, width: '100%' }}>
            <Card style={{ margin: 0 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                        <h2 style={{ marginBottom: 20 }}>
                            <HistoryOutlined /> Lịch sử đơn hàng
                        </h2>
                        <Space style={{ marginBottom: 16 }} wrap>
                            <Input
                                placeholder="Tìm kiếm theo tên nhà hàng, địa chỉ, mã đơn..."
                                prefix={<SearchOutlined />}
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                style={{ width: 300 }}
                                allowClear
                            />
                            <Select
                                value={statusFilter}
                                onChange={setStatusFilter}
                                style={{ width: 180 }}
                            >
                                <Option value="ALL">Tất cả trạng thái</Option>
                                <Option value="COMPLETED">Đã hoàn thành</Option>
                                <Option value="CANCELLED">Đã hủy</Option>
                            </Select>
                            <RangePicker
                                format="DD/MM/YYYY"
                                onChange={(dates) => setDateRange(dates)}
                                placeholder={['Từ ngày', 'Đến ngày']}
                            />
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={fetchOrders}
                                loading={loading}
                            >
                                Làm mới
                            </Button>
                        </Space>
                        <Card size="small" style={{ marginBottom: 16, background: '#f0f2f5' }}>
                            <Row gutter={16}>
                                <Col>
                                    <strong>Tổng số đơn:</strong> {filteredOrders.length}
                                </Col>
                                <Col>
                                    <Tag color="green">COMPLETED: {completedCount}</Tag>
                                </Col>
                                <Col>
                                    <Tag color="red">CANCELLED: {cancelledCount}</Tag>
                                </Col>
                                <Col>
                                    <strong style={{ marginLeft: 20 }}>Tổng doanh thu:</strong>
                                    <span style={{ color: '#52c41a', fontSize: '16px', fontWeight: 'bold', marginLeft: 8 }}>
                                        {formatMoney(totalRevenue)}
                                    </span>
                                </Col>
                            </Row>
                        </Card>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <Table
                            columns={columns}
                            dataSource={filteredOrders}
                            rowKey="id"
                            loading={loading}
                            scroll={{ x: 1200 }}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                showTotal: (total) => `Tổng ${total} đơn hàng`,
                            }}
                        />
                    </div>
                </Space>
            </Card>
        </div>
    );
};

export default ShipperHistory;


