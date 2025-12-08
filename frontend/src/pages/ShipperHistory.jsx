import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, message, Spin, Space, Rate, Input, DatePicker, Select, Button, Row, Col, Modal } from 'antd';
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
    getMyOrders
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
    const [overdueFilter, setOverdueFilter] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

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
    }, [orders, searchText, dateRange, statusFilter, overdueFilter]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await getMyOrders(shipperId);
            // Lấy đơn hàng đã hoàn thành hoặc đã hủy
            const historyOrders = data.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED');
            // Sắp xếp theo thời gian tạo mới nhất lên đầu
            const sortedHistoryOrders = [...historyOrders].sort((a, b) => {
                const dateA = new Date(a.createdAt);
                const dateB = new Date(b.createdAt);
                return dateB - dateA; // Mới nhất lên đầu
            });
            setOrders(sortedHistoryOrders);
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

        // Lọc đơn hàng quá hạn
        if (overdueFilter) {
            filtered = filtered.filter(order => order.isOverdue === true);
        }

        // Sắp xếp theo thời gian tạo mới nhất lên đầu
        filtered.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateB - dateA; // Mới nhất lên đầu
        });

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
            title: 'STT',
            key: 'stt',
            width: 60,
            fixed: 'left',
            align: 'center',
            render: (_, __, index) => {
                // Tính STT dựa trên trang hiện tại và index
                return (currentPage - 1) * 5 + index + 1;
            },
        },
        {
            title: 'Mã đơn',
            dataIndex: 'id',
            key: 'id',
            width: 90,
            fixed: 'left',
            align: 'center',
        },
        {
            title: 'Nhà hàng',
            dataIndex: 'restaurantName',
            key: 'restaurantName',
            width: 180,
            ellipsis: {
                showTitle: true,
            },
        },
        {
            title: 'Địa chỉ giao hàng',
            dataIndex: 'shippingAddress',
            key: 'shippingAddress',
            width: 250,
            ellipsis: {
                showTitle: true,
            },
        },
        {
            title: 'Khoảng cách',
            key: 'distance',
            render: () => <span style={{ whiteSpace: 'nowrap' }}>N/A</span>,
            width: 110,
            align: 'center',
        },
        {
            title: 'Thời gian giao',
            key: 'deliveryTime',
            render: (_, record) => <span style={{ whiteSpace: 'nowrap' }}>{calculateDeliveryTime(record)}</span>,
            width: 130,
            align: 'center',
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (amount) => <span style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>{formatMoney(amount)}</span>,
            width: 140,
            align: 'right',
            sorter: (a, b) => {
                const amountA = parseFloat(a.totalAmount) || 0;
                const amountB = parseFloat(b.totalAmount) || 0;
                return amountA - amountB;
            },
        },
        {
            title: 'Thanh toán',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            render: (method) => <Tag style={{ whiteSpace: 'nowrap' }}>{method}</Tag>,
            width: 120,
            align: 'center',
        },
        {
            title: 'Đánh giá',
            key: 'rating',
            render: () => <Rate disabled defaultValue={5} style={{ fontSize: 14 }} />,
            width: 130,
            align: 'center',
        },
        {
            title: 'Thời gian tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => <span style={{ whiteSpace: 'nowrap' }}>{formatDate(date)}</span>,
            width: 180,
            align: 'center',
            sorter: (a, b) => {
                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return dateA - dateB;
            },
        },
        {
            title: 'Thời gian hoàn thành',
            dataIndex: 'completedAt',
            key: 'completedAt',
            render: (date) => <span style={{ whiteSpace: 'nowrap' }}>{formatDate(date)}</span>,
            width: 180,
            align: 'center',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status, record) => {
                const colorMap = {
                    'COMPLETED': 'green',
                    'CANCELLED': 'red',
                };
                const iconMap = {
                    'COMPLETED': <CheckCircleOutlined />,
                    'CANCELLED': <CloseCircleOutlined />,
                };
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                        <Tag color={colorMap[status]} icon={iconMap[status]} style={{ whiteSpace: 'nowrap', margin: 0 }}>
                            {status}
                        </Tag>
                        {record.isOverdue && (
                            <Tag color="red" style={{ fontWeight: 'bold', margin: 0 }}>
                                ⚠️ QUÁ HẠN
                            </Tag>
                        )}
                    </div>
                );
            },
            width: 140,
            align: 'center',
        },
        {
            title: 'Thao tác',
            key: 'action',
            fixed: 'right',
            width: 120,
            align: 'center',
            render: (_, record) => (
                <Button
                    type="primary"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => navigate(`/shipper/history/${record.id}`)}
                >
                    Chi tiết
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
                            <Button
                                type={overdueFilter ? "primary" : "default"}
                                danger={overdueFilter}
                                onClick={() => setOverdueFilter(!overdueFilter)}
                            >
                                {overdueFilter ? '⚠️ Đơn quá hạn' : 'Đơn quá hạn'}
                            </Button>
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
                                    <Tag color="red" style={{ fontWeight: 'bold' }}>
                                        ⚠️ QUÁ HẠN: {filteredOrders.filter(o => o.isOverdue === true).length}
                                    </Tag>
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
                            scroll={{ x: 1600 }}
                            size="middle"
                            pagination={{
                                pageSize: 5,
                                showSizeChanger: false,
                                showTotal: (total) => `Tổng ${total} đơn hàng`,
                                current: currentPage,
                                onChange: (page) => setCurrentPage(page),
                            }}
                        />
                    </div>
                </Space>
            </Card>
        </div>
    );
};

export default ShipperHistory;


