import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Table, Tag, Space, DatePicker, Select, Button, Typography, Row, Col, message,
    Drawer, Descriptions, Timeline, Divider, Tooltip, Rate
} from 'antd';
import {
    ReloadOutlined, EyeOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
    PhoneOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';
// Đảm bảo đường dẫn import đúng component TimerDisplay bạn đã tạo trước đó
import TimerDisplay from '../components/TimerDisplay';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

const API_URL = 'http://localhost:8080/api/admin/orders';

const OrdersPage = () => {
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState([]);
    const [dateRange, setDateRange] = useState([dayjs().startOf('day'), dayjs().endOf('day')]);
    const [statusFilter, setStatusFilter] = useState('ALL');

    // State cho Drawer chi tiết
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = { status: statusFilter };
            if (dateRange && dateRange[0] && dateRange[1]) {
                params.startDate = dateRange[0].format('YYYY-MM-DD');
                params.endDate = dateRange[1].format('YYYY-MM-DD');
            }
            const response = await axios.get(API_URL, { params });
            setOrders(response.data);
        // eslint-disable-next-line no-unused-vars
        } catch (error) {
            message.error('Không thể tải danh sách đơn hàng!');
        } finally {
            setLoading(false);
        }
    }, [dateRange, statusFilter]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleRefresh = () => {
        fetchOrders();
    };

    const handleOpenDrawer = (order) => {
        setSelectedOrder(order);
        setDrawerVisible(true);
    };

    const handleCloseDrawer = () => {
        setDrawerVisible(false);
        setSelectedOrder(null);
    };

    // Helper render trạng thái
    const renderStatusTag = (status) => {
        let color = 'default';
        let text = status;
        switch (status) {
            case 'PENDING': color = 'gold'; text = 'Chờ duyệt'; break;
            case 'PREPARING': color = 'orange'; text = 'Đang chuẩn bị'; break;
            case 'SHIPPING': color = 'processing'; text = 'Đang giao'; break;
            case 'COMPLETED': color = 'success'; text = 'Hoàn thành'; break;
            case 'CANCELLED': color = 'error'; text = 'Đã hủy'; break;
            default: break;
        }
        return <Tag color={color}>{text}</Tag>;
    };

    // Helper format ngày giờ
    const formatDate = (dateStr) => dateStr ? dayjs(dateStr).format('DD/MM/YYYY HH:mm:ss') : '';
    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    // --- ĐỊNH NGHĨA CỘT CHO BẢNG CHÍNH ---
    const columns = [
        {
            title: 'Mã đơn',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            render: (text, record) => <a onClick={() => handleOpenDrawer(record)}><b>#{text}</b></a>,
        },
        {
            title: 'Thời gian đặt',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 120,
            render: (dateStr) => dayjs(dateStr).format('DD/MM/YY HH:mm'),
        },
        {
            title: 'Khách hàng & Quán',
            key: 'customerRestaurant',
            render: (_, record) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Tên khách hàng (Có thể thêm SĐT khách nếu muốn) */}
                    <div>
                        <Text strong>{record.customerName || 'Khách lẻ'}</Text>
                        {record.customerPhone && (
                            <span style={{ fontSize: 11, color: '#666', marginLeft: 6 }}>
                                <PhoneOutlined /> {record.customerPhone}
                            </span>
                        )}
                    </div>

                    {/* Tên quán (Có thể thêm SĐT quán nếu muốn) */}
                    <div style={{ marginTop: 2, borderTop: '1px dashed #eee', paddingTop: 2 }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            {record.restaurantName}
                        </Text>
                        {record.restaurantPhone && (
                            <span style={{ fontSize: 11, color: '#888', marginLeft: 6 }}>
                                <PhoneOutlined /> {record.restaurantPhone}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        // --- CỘT THÔNG TIN SHIPPER (MỚI) ---
        {
            title: 'Shipper',
            key: 'shipper',
            width: 170, // Set width
            render: (_, record) => record.shipperName ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text strong>{record.shipperName}</Text>
                    {/* Check if shipperPhone exists */}
                    {record.shipperPhone ? (
                        <div style={{ fontSize: '11px', color: '#1677ff' }}>
                            <PhoneOutlined /> {record.shipperPhone}
                        </div>
                    ) : (
                        <Text type="secondary" style={{ fontSize: '11px' }}>{record.shipperEmail}</Text>
                    )}
                </div>
            ) : <Text type="secondary" italic>-</Text>,
        },
        {
            title: 'Đánh giá',
            key: 'rating',
            width: 120,
            align: 'center',
            render: (_, record) => {
                if (record.status !== 'COMPLETED') return <span style={{color: '#ccc'}}>-</span>;
                if (!record.rating) return <span style={{color: '#999', fontSize: 11}}>Chưa đánh giá</span>;

                return (
                    <Tooltip title={record.comment || "Không có lời nhắn"}>
                        <div>
                            <Rate disabled defaultValue={record.rating} style={{ fontSize: 12 }} />
                            <div style={{fontSize: 10, color: '#888'}}>({record.rating} sao)</div>
                        </div>
                    </Tooltip>
                );
            }
        },
        {
            title: 'Thời gian giao',
            key: 'deliveryTime',
            align: 'center',
            width: 110,
            render: (_, record) => (
                <TimerDisplay
                    status={record.status}
                    shippedAt={record.shippedAt}
                    completedAt={record.completedAt}
                />
            ),
        },
        {
            title: 'Tổng tiền',
            key: 'total',
            width: 130,
            render: (_, record) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text strong style={{ color: '#cf1322' }}>
                        {formatCurrency(record.totalAmount)}
                    </Text>
                    <Tag style={{ width: 'fit-content', marginTop: 4, fontSize: 10 }}>
                        {record.paymentMethod}
                    </Tag>
                </div>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            align: 'center',
            render: (status) => renderStatusTag(status),
        },
        {
            title: 'Hành động',
            key: 'action',
            align: 'center',
            width: 80,
            render: (_, record) => (
                <Button
                    type="text"
                    icon={<EyeOutlined />}
                    onClick={() => handleOpenDrawer(record)}
                />
            ),
        },
    ];

    // --- ĐỊNH NGHĨA CỘT CHO BẢNG CHI TIẾT MÓN ĂN ---
    const itemColumns = [
        {
            title: 'Món ăn',
            dataIndex: 'productName',
            key: 'productName',
            render: (text, record) => (
                <div>
                    {/* Tên món chính */}
                    <Text strong>{text}</Text>

                    {/* --- HIỂN THỊ TÙY CHỌN (OPTIONS) --- */}
                    {record.options && record.options.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                            {record.options.map((opt, index) => (
                                <div key={index} style={{ fontSize: '12px', color: '#666' }}>
                                    • {opt}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )
        },
        { title: 'SL', dataIndex: 'quantity', key: 'quantity', align: 'center', width: 60 },
        {
            title: 'Đơn giá',
            dataIndex: 'price',
            key: 'price',
            align: 'right',
            render: (price) => formatCurrency(price)
        },
        {
            title: 'Thành tiền',
            key: 'subtotal',
            align: 'right',
            // Lưu ý: Thành tiền phải tính cả giá món + giá topping (nếu BE chưa cộng sẵn vào price)
            // Nếu BE trả về price là giá gốc, thì logic tính tổng ở đây chỉ là tham khảo
            // Tốt nhất BE nên trả về field `totalPrice` cho từng item thì chính xác hơn.
            render: (_, record) => formatCurrency(record.price * record.quantity)
        }
    ];

    return (
        <div>
            <Card bordered={false} bodyStyle={{ padding: '0 0 20px 0' }}>
                <Title level={3} style={{ margin: 0 }}>QUẢN LÝ ĐƠN HÀNG</Title>
            </Card>

            <Card bordered={false}>
                {/* --- THANH CÔNG CỤ BỘ LỌC --- */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} md={8} lg={8}>
                        <RangePicker
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                            value={dateRange}
                            onChange={(dates) => setDateRange(dates)}
                            allowClear={false}
                            ranges={{
                                'Hôm nay': [dayjs().startOf('day'), dayjs().endOf('day')],
                                'Tuần này': [dayjs().startOf('week'), dayjs().endOf('week')],
                                'Tháng này': [dayjs().startOf('month'), dayjs().endOf('month')],
                            }}
                        />
                    </Col>
                    <Col xs={12} sm={6} md={5} lg={5}>
                        <Select
                            defaultValue="ALL"
                            style={{ width: '100%' }}
                            value={statusFilter}
                            onChange={setStatusFilter}
                        >
                            <Option value="ALL">Tất cả trạng thái</Option>
                            <Option value="PENDING">Chờ duyệt</Option>
                            <Option value="PREPARING">Đang chuẩn bị</Option>
                            <Option value="SHIPPING">Đang giao</Option>
                            <Option value="COMPLETED">Hoàn thành</Option>
                            <Option value="CANCELLED">Đã hủy</Option>
                        </Select>
                    </Col>
                    <Col xs={12} sm={6} md={11} lg={11} style={{ textAlign: 'right' }}>
                        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
                            Làm mới
                        </Button>
                    </Col>
                </Row>

                {/* --- BẢNG DỮ LIỆU CHÍNH --- */}
                <Table
                    columns={columns}
                    dataSource={orders}
                    rowKey="id"
                    loading={loading}
                    pagination={{ 
                        pageSize: 5,
                        showSizeChanger: false,
                        showTotal: (total) => `Tổng ${total} đơn hàng`
                    }}
                    scroll={{ x: 1000 }}
                />
            </Card>

            {/* --- DRAWER CHI TIẾT ĐƠN HÀNG --- */}
            <Drawer
                title={selectedOrder ? `Chi tiết đơn hàng #${selectedOrder.id}` : "Chi tiết"}
                placement="right"
                width={600}
                onClose={handleCloseDrawer}
                open={drawerVisible}
            >
                {selectedOrder && (
                    <>
                        {/* Thông tin chung */}
                        <Descriptions bordered column={1} size="small">
                            <Descriptions.Item label="Khách hàng">
                                <Text strong>{selectedOrder.customerName}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Nhà hàng">
                                {selectedOrder.restaurantName}
                            </Descriptions.Item>
                            <Descriptions.Item label="Shipper">
                                {selectedOrder.shipperName ? `${selectedOrder.shipperName} (${selectedOrder.shipperEmail})` : 'Chưa có'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                {renderStatusTag(selectedOrder.status)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Địa chỉ giao">
                                {selectedOrder.shippingAddress}
                            </Descriptions.Item>
                            {selectedOrder.note && (
                                <Descriptions.Item label="Ghi chú của khách">
                                    <Text mark>{selectedOrder.note}</Text>
                                </Descriptions.Item>
                            )}
                        </Descriptions>

                        {/* Danh sách món ăn */}
                        <Divider orientation="left" style={{marginTop: 30}}>Danh sách món đặt</Divider>
                        <Table
                            dataSource={selectedOrder.items}
                            columns={itemColumns}
                            pagination={false}
                            size="small"
                            bordered
                            summary={() => (
                                <>
                                    {/* Dòng 1: Tiền món (Subtotal) */}
                                    <Table.Summary.Row style={{ background: '#fafafa' }}>
                                        <Table.Summary.Cell index={0} colSpan={3} align="right">
                                            <Text type="secondary">Tiền món:</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} align="right">
                                            <Text>{formatCurrency(selectedOrder.subtotal)}</Text>
                                        </Table.Summary.Cell>
                                    </Table.Summary.Row>

                                    {/* Dòng 2: Phí vận chuyển (Shipping Fee) */}
                                    <Table.Summary.Row style={{ background: '#fafafa' }}>
                                        <Table.Summary.Cell index={0} colSpan={3} align="right">
                                            <Text type="secondary">Phí vận chuyển:</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} align="right">
                                            <Text>{formatCurrency(selectedOrder.shippingFee)}</Text>
                                        </Table.Summary.Cell>
                                    </Table.Summary.Row>

                                    {/* Dòng 3: Tổng thanh toán (Total Amount) */}
                                    <Table.Summary.Row style={{ background: '#fff' }}>
                                        <Table.Summary.Cell index={0} colSpan={3} align="right">
                                            <Text strong>Tổng thanh toán ({selectedOrder.paymentMethod}):</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} align="right">
                                            <Text strong style={{ color: '#cf1322', fontSize: 16 }}>
                                                {formatCurrency(selectedOrder.totalAmount)}
                                            </Text>
                                        </Table.Summary.Cell>
                                    </Table.Summary.Row>
                                </>
                            )}
                        />

                        {/* Lịch sử đơn hàng (Timeline) */}
                        <Divider orientation="left" style={{marginTop: 30}}>Lịch sử đơn hàng</Divider>
                        <Timeline style={{ marginTop: 20, paddingLeft: 20 }}>
                            <Timeline.Item dot={<ClockCircleOutlined style={{fontSize: 16}} />} color="blue">
                                <Text strong>Đặt hàng thành công</Text>
                                <br />
                                <Text type="secondary">{formatDate(selectedOrder.createdAt)}</Text>
                            </Timeline.Item>

                            {selectedOrder.restaurantAcceptedAt && (
                                <Timeline.Item color="orange">
                                    <Text strong>Nhà hàng đã nhận đơn</Text>
                                    <br />
                                    <Text type="secondary">{formatDate(selectedOrder.restaurantAcceptedAt)}</Text>
                                </Timeline.Item>
                            )}

                            {selectedOrder.shippedAt && (
                                <Timeline.Item color="blue">
                                    <Text strong>Shipper đã nhận & bắt đầu giao</Text>
                                    <br />
                                    <Text type="secondary">{formatDate(selectedOrder.shippedAt)}</Text>
                                </Timeline.Item>
                            )}

                            {selectedOrder.status === 'COMPLETED' && selectedOrder.completedAt && (
                                <Timeline.Item dot={<CheckCircleOutlined style={{fontSize: 16}} />} color="green">
                                    <Text strong>Giao hàng thành công</Text>
                                    <br />
                                    <Text type="secondary">{formatDate(selectedOrder.completedAt)}</Text>
                                </Timeline.Item>
                            )}

                            {selectedOrder.status === 'CANCELLED' && selectedOrder.completedAt && (
                                <Timeline.Item dot={<CloseCircleOutlined style={{fontSize: 16}} />} color="red">
                                    <Text strong>Đơn hàng đã bị hủy</Text>
                                    <br />
                                    <Text type="secondary">{formatDate(selectedOrder.completedAt)}</Text>
                                </Timeline.Item>
                            )}
                        </Timeline>
                    </>
                )}
            </Drawer>
        </div>
    );
};

export default OrdersPage;