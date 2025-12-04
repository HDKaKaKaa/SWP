import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Tag, message, Space, Modal, Spin, Rate, Input, Select, DatePicker, Row, Col, Form } from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    CarOutlined,
    SearchOutlined,
    FilterOutlined,
    ReloadOutlined,
    EditOutlined,
    DeleteOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import {
    getMyOrders,
    updateOrderStatus,
    editOrder,
    deleteOrder
} from '../services/shipperService';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const ShipperOrders = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [shipperId, setShipperId] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [dateRange, setDateRange] = useState(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingOrder, setEditingOrder] = useState(null);
    const [form] = Form.useForm();

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

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await getMyOrders(shipperId);
            setOrders(data);
            setFilteredOrders(data);
        } catch (error) {
            message.error('Không thể tải danh sách đơn hàng!');
        } finally {
            setLoading(false);
        }
    };

    // Áp dụng filter và search
    useEffect(() => {
        applyFilters();
    }, [orders, searchText, statusFilter, dateRange]);

    const applyFilters = () => {
        let filtered = [...orders];

        // Lọc theo từ khóa tìm kiếm
        if (searchText) {
            filtered = filtered.filter(order =>
                order.restaurantName?.toLowerCase().includes(searchText.toLowerCase()) ||
                order.shippingAddress?.toLowerCase().includes(searchText.toLowerCase()) ||
                order.id?.toString().includes(searchText) ||
                order.paymentMethod?.toLowerCase().includes(searchText.toLowerCase())
            );
        }

        // Lọc theo trạng thái
        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(order => order.status === statusFilter);
        }

        // Lọc theo khoảng thời gian
        if (dateRange && dateRange.length === 2) {
            const startDate = dateRange[0].startOf('day');
            const endDate = dateRange[1].endOf('day');
            filtered = filtered.filter(order => {
                const orderDate = dayjs(order.createdAt);
                return orderDate.isAfter(startDate) && orderDate.isBefore(endDate);
            });
        }

        setFilteredOrders(filtered);
    };

    const handleResetFilters = () => {
        setSearchText('');
        setStatusFilter('ALL');
        setDateRange(null);
    };

    // Cập nhật trạng thái đơn hàng
    const handleUpdateStatus = async (orderId, newStatus) => {
        try {
            await updateOrderStatus(orderId, newStatus);
            message.success('Cập nhật trạng thái đơn hàng thành công!');
            fetchOrders();
        } catch (error) {
            message.error(error.response?.data || 'Không thể cập nhật trạng thái!');
        }
    };

    // Xác nhận hoàn thành đơn hàng
    const handleCompleteOrder = (orderId) => {
        Modal.confirm({
            title: 'Xác nhận hoàn thành đơn hàng',
            content: 'Bạn có chắc chắn đã giao hàng thành công?',
            onOk: () => handleUpdateStatus(orderId, 'COMPLETED'),
        });
    };

    // Hủy đơn hàng
    const handleCancelOrder = (orderId) => {
        Modal.confirm({
            title: 'Xác nhận hủy đơn hàng',
            content: 'Bạn có chắc chắn muốn hủy đơn hàng này?',
            okText: 'Hủy đơn',
            okType: 'danger',
            onOk: () => handleUpdateStatus(orderId, 'CANCELLED'),
        });
    };

    // Sửa đơn hàng
    const handleEditOrder = (order) => {
        setEditingOrder(order);
        form.setFieldsValue({
            note: order.note || '',
            shippingAddress: order.shippingAddress || ''
        });
        setEditModalVisible(true);
    };

    // Xử lý lưu khi sửa đơn hàng
    const handleSaveEdit = async () => {
        try {
            const values = await form.validateFields();
            await editOrder(editingOrder.id, shipperId, values);
            message.success('Sửa đơn hàng thành công!');
            setEditModalVisible(false);
            setEditingOrder(null);
            form.resetFields();
            fetchOrders();
        } catch (error) {
            if (error.errorFields) {
                // Validation error
                return;
            }
            message.error(error.response?.data || 'Không thể sửa đơn hàng!');
        }
    };

    // Xóa đơn hàng
    const handleDeleteOrder = (orderId) => {
        Modal.confirm({
            title: 'Xác nhận xóa đơn hàng',
            content: 'Bạn có chắc chắn muốn xóa đơn hàng này? Hành động này không thể hoàn tác!',
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await deleteOrder(orderId, shipperId);
                    message.success('Xóa đơn hàng thành công!');
                    fetchOrders();
                } catch (error) {
                    message.error(error.response?.data || 'Không thể xóa đơn hàng!');
                }
            },
        });
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

    // Tính khoảng cách (giả lập)
    const calculateDistance = (order) => {
        if (order.shippingLat && order.shippingLong) {
            return (Math.random() * 10 + 2).toFixed(1) + ' km';
        }
        return 'N/A';
    };

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
            width: 150,
        },
        {
            title: 'Địa chỉ giao hàng',
            dataIndex: 'shippingAddress',
            key: 'shippingAddress',
            ellipsis: {
                showTitle: true,
            },
            width: 200,
        },
        {
            title: 'Khoảng cách',
            key: 'distance',
            render: (_, record) => (
                <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                    {calculateDistance(record)}
                </span>
            ),
            width: 120,
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (amount) => formatMoney(amount),
            width: 120,
            align: 'right',
        },
        {
            title: 'Thanh toán',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            render: (method) => <Tag>{method}</Tag>,
            width: 100,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const colorMap = {
                    'SHIPPING': 'blue',
                    'COMPLETED': 'green',
                    'CANCELLED': 'red',
                };
                return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
            },
            width: 120,
        },
        {
            title: 'Thời gian tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => formatDate(date),
            width: 160,
        },
        {
            title: 'Đánh giá',
            key: 'rating',
            render: (_, record) => {
                // Giả lập đánh giá dựa trên trạng thái
                const rating = record.status === 'COMPLETED' ? 5 : 
                              record.status === 'SHIPPING' ? 0 : 0;
                return <Rate disabled defaultValue={rating} style={{ fontSize: 14 }} />;
            },
            width: 150,
        },
        {
            title: 'Thao tác',
            key: 'action',
            fixed: 'right',
            width: 200,
            render: (_, record) => (
                <Space size="small" wrap>
                    {record.status === 'SHIPPING' && (
                        <>
                            <Button
                                type="primary"
                                size="small"
                                icon={<CheckCircleOutlined />}
                                onClick={() => handleCompleteOrder(record.id)}
                            >
                                Hoàn thành
                            </Button>
                            <Button
                                danger
                                size="small"
                                icon={<CloseCircleOutlined />}
                                onClick={() => handleCancelOrder(record.id)}
                            >
                                Hủy
                            </Button>
                        </>
                    )}
                    {(record.status === 'COMPLETED' || record.status === 'CANCELLED') && (
                        <>
                            <Button
                                type="default"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleEditOrder(record)}
                            >
                                Sửa
                            </Button>
                            <Button
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={() => handleDeleteOrder(record.id)}
                            >
                                Xóa
                            </Button>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: 50 }}><Spin size="large" /></div>;
    }

    return (
        <div style={{ padding: 0, margin: 0, width: '100%', overflow: 'hidden' }}>
            <Card 
                style={{ 
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    margin: 0
                }}
            >
                {/* Header với tiêu đề và nút refresh */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 24,
                    flexWrap: 'wrap',
                    gap: 16
                }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CarOutlined style={{ fontSize: '24px', color: '#1890ff' }} /> 
                        Quản lý đơn hàng
                    </h2>
                    <Button
                        icon={<ReloadOutlined />}
                        onClick={fetchOrders}
                        loading={loading}
                    >
                        Làm mới
                    </Button>
                </div>

                {/* Filter và Search Bar */}
                <Card 
                    size="small" 
                    style={{ 
                        marginBottom: 16, 
                        background: '#fafafa',
                        border: '1px solid #e8e8e8'
                    }}
                >
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} sm={24} md={8} lg={8}>
                            <Input
                                placeholder="Tìm kiếm theo mã đơn, nhà hàng, địa chỉ..."
                                prefix={<SearchOutlined />}
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                allowClear
                                style={{ width: '100%' }}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={6} lg={5}>
                            <Select
                                placeholder="Lọc theo trạng thái"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                style={{ width: '100%' }}
                                suffixIcon={<FilterOutlined />}
                            >
                                <Option value="ALL">Tất cả trạng thái</Option>
                                <Option value="SHIPPING">SHIPPING</Option>
                                <Option value="COMPLETED">COMPLETED</Option>
                                <Option value="CANCELLED">CANCELLED</Option>
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={8} lg={8}>
                            <RangePicker
                                format="DD/MM/YYYY"
                                onChange={(dates) => setDateRange(dates)}
                                placeholder={['Từ ngày', 'Đến ngày']}
                                style={{ width: '100%' }}
                                allowClear
                            />
                        </Col>
                        <Col xs={24} sm={24} md={2} lg={3}>
                            <Button
                                onClick={handleResetFilters}
                                style={{ width: '100%' }}
                            >
                                Xóa bộ lọc
                            </Button>
                        </Col>
                    </Row>
                </Card>

                {/* Thống kê nhanh */}
                <div style={{ marginBottom: 16 }}>
                    <Space size="large" wrap>
                        <Tag color="blue" style={{ padding: '4px 12px', fontSize: '14px' }}>
                            Tổng: {filteredOrders.length} đơn
                        </Tag>
                        <Tag color="blue" style={{ padding: '4px 12px', fontSize: '14px' }}>
                            SHIPPING: {filteredOrders.filter(o => o.status === 'SHIPPING').length}
                        </Tag>
                        <Tag color="green" style={{ padding: '4px 12px', fontSize: '14px' }}>
                            COMPLETED: {filteredOrders.filter(o => o.status === 'COMPLETED').length}
                        </Tag>
                        <Tag color="red" style={{ padding: '4px 12px', fontSize: '14px' }}>
                            CANCELLED: {filteredOrders.filter(o => o.status === 'CANCELLED').length}
                        </Tag>
                    </Space>
                </div>

                {/* Bảng đơn hàng */}
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
                            pageSizeOptions: ['5', '10', '20', '50'],
                            style: { marginTop: 16 }
                        }}
                        style={{ 
                            width: '100%',
                            overflow: 'hidden'
                        }}
                    />
                </div>

                {/* Modal sửa đơn hàng */}
                <Modal
                    title={`Sửa đơn hàng #${editingOrder?.id}`}
                    open={editModalVisible}
                    onOk={handleSaveEdit}
                    onCancel={() => {
                        setEditModalVisible(false);
                        setEditingOrder(null);
                        form.resetFields();
                    }}
                    okText="Lưu"
                    cancelText="Hủy"
                    width={600}
                >
                    {editingOrder && (
                        <div>
                            <div style={{ marginBottom: 16, padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}>
                                <p style={{ margin: 0 }}><strong>Nhà hàng:</strong> {editingOrder.restaurantName}</p>
                                <p style={{ margin: '8px 0 0 0' }}><strong>Tổng tiền:</strong> {formatMoney(editingOrder.totalAmount)}</p>
                                <p style={{ margin: '8px 0 0 0' }}><strong>Trạng thái:</strong> <Tag color={editingOrder.status === 'COMPLETED' ? 'green' : 'red'}>{editingOrder.status}</Tag></p>
                            </div>
                            <Form form={form} layout="vertical">
                                <Form.Item
                                    label="Ghi chú"
                                    name="note"
                                >
                                    <Input.TextArea
                                        rows={4}
                                        placeholder="Nhập ghi chú..."
                                    />
                                </Form.Item>
                                <Form.Item
                                    label="Địa chỉ giao hàng"
                                    name="shippingAddress"
                                    rules={[{ required: true, message: 'Vui lòng nhập địa chỉ giao hàng!' }]}
                                >
                                    <Input placeholder="Nhập địa chỉ giao hàng..." />
                                </Form.Item>
                            </Form>
                        </div>
                    )}
                </Modal>
            </Card>
        </div>
    );
};

export default ShipperOrders;


