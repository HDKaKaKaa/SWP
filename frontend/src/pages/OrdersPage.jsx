import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Table, Tag, Space, DatePicker, Select, Button, Typography, Row, Col, message,
    Drawer, Descriptions, Timeline, Divider, Tooltip, Rate, Checkbox
} from 'antd';
import {
    ReloadOutlined, EyeOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
    PhoneOutlined, WarningOutlined
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

    // State cho Checkbox "All"
    const [isAll, setIsAll] = useState(false);

    // State cho Drawer chi tiết
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};

            // Nếu tick "All", status = "ALL", ngày tháng = null (để BE lấy hết)
            if (isAll) {
                params.status = "ALL";
                // Không gửi startDate/endDate để backend hiểu là lấy toàn bộ lịch sử
            } else {
                params.status = statusFilter;
                if (dateRange && dateRange[0] && dateRange[1]) {
                    params.startDate = dateRange[0].format('YYYY-MM-DD');
                    params.endDate = dateRange[1].format('YYYY-MM-DD');
                }
            }
            const response = await axios.get(API_URL, { params });
            setOrders(response.data);
        } catch (error) {
            message.error('Không thể tải danh sách đơn hàng!');
        } finally {
            setLoading(false);
        }
    }, [dateRange, statusFilter, isAll]);
    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);
    const handleRefresh = () => {
        fetchOrders();
    };
    // Handler cho Checkbox
    const handleCheckboxAll = (e) => {
        setIsAll(e.target.checked);
        if (e.target.checked) {
            setStatusFilter('ALL'); // Reset filter status về ALL khi chọn xem tất cả
        }
    };
    const handleOpenDrawer = (order) => {
        setSelectedOrder(order);
        setDrawerVisible(true);
    };
    const handleCloseDrawer = () => {
        setDrawerVisible(false);
        setSelectedOrder(null);
    };
    // --- COMPONENT HIỂN THỊ THỜI GIAN GIAO (Logic 20 Phút) ---
    const DeliveryTimeCell = ({ status, shippedAt, completedAt }) => {
        const [now, setNow] = useState(dayjs());
        useEffect(() => {
            if (status === 'SHIPPING') {
                const interval = setInterval(() => setNow(dayjs()), 30000); // Update mỗi 30s
                return () => clearInterval(interval);
            }
        }, [status]);
        if (status !== 'SHIPPING' && status !== 'COMPLETED') return <span style={{color:'#ccc'}}>-</span>;
        if (!shippedAt) return <span>-</span>;
        const start = dayjs(shippedAt);
        const end = status === 'COMPLETED' ? dayjs(completedAt) : now;
        // Tính khoảng cách phút
        const diffMinutes = end.diff(start, 'minute');
        // Logic cảnh báo 20 phút
        const isOverdue = diffMinutes > 20;
        // Nếu đã hoàn thành thì hiện màu xanh, nếu đang giao mà lố giờ thì hiện màu đỏ
        if (status === 'COMPLETED') {
            return <Tag color="success">{diffMinutes} phút</Tag>;
        }
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                {isOverdue ? (
                    <Tag color="#cf1322" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <WarningOutlined spin /> Quá thời gian ({diffMinutes}p)
                    </Tag>
                ) : (
                    <Tag color="processing">{diffMinutes} / 20 phút</Tag>
                )}
            </div>
        );
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
        return <Tag color={color} style={{minWidth: 90, textAlign: 'center'}}>{text}</Tag>;
    };
    const formatDate = (dateStr) => dateStr ? dayjs(dateStr).format('DD/MM/YYYY HH:mm:ss') : '';
    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    // --- ĐỊNH NGHĨA CỘT CHO BẢNG CHÍNH (Đã chỉnh width và layout) ---
    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 70, // Fix width
            fixed: 'left', // Cố định cột ID khi scroll ngang
            align: 'center',
            render: (text, record) => <a onClick={() => handleOpenDrawer(record)}><b>#{text}</b></a>,
        },
        {
            title: 'Thời gian đặt',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 130,
            render: (dateStr) => <div style={{fontSize: 12}}>{dayjs(dateStr).format('DD/MM/YY HH:mm')}</div>,
        },
        {
            title: 'Khách hàng & Quán',
            key: 'customerRestaurant',
            width: 220, // Tăng độ rộng
            render: (_, record) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div>
                        <Text strong>{record.customerName || 'Khách lẻ'}</Text>
                        {record.customerPhone && (
                            <span style={{ fontSize: 11, color: '#666', marginLeft: 6 }}>
                                <PhoneOutlined /> {record.customerPhone}
                            </span>
                        )}
                    </div>
                    <div style={{ marginTop: 4, borderTop: '1px dashed #eee', paddingTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: record.restaurantName }}>
                            {record.restaurantName}
                        </Text>
                    </div>
                </div>
            ),
        },
        // --- CỘT THÔNG TIN SHIPPER ---
        {
            title: 'Shipper',
            key: 'shipper',
            width: 180,
            render: (_, record) => record.shipperName ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text strong style={{fontSize: 13}}>{record.shipperName}</Text>
                    {record.shipperPhone ? (
                        <div style={{ fontSize: 11, color: '#1677ff' }}>
                            <PhoneOutlined /> {record.shipperPhone}
                        </div>
                    ) : (
                        <Text type="secondary" style={{ fontSize: 11 }}>{record.shipperEmail}</Text>
                    )}
                </div>
            ) : <Text type="secondary" italic style={{fontSize: 12}}>Chưa nhận</Text>,
        },
        {
            title: 'Thời gian giao hàng',
            key: 'deliveryTime',
            align: 'center',
            width: 160,
            render: (_, record) => (
                <DeliveryTimeCell
                    status={record.status}
                    shippedAt={record.shippedAt}
                    completedAt={record.completedAt}
                />
            ),
        },
        {
            title: 'Đánh giá',
            key: 'rating',
            width: 140,
            align: 'center',
            render: (_, record) => {
                if (record.status !== 'COMPLETED') return <span style={{color: '#ccc'}}>-</span>;
                if (!record.rating) return <span style={{color: '#999', fontSize: 11}}>Chưa đánh giá</span>;

                return (
                    <Tooltip title={record.comment || "Không có lời nhắn"}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ whiteSpace: 'nowrap' }}>
                                <Rate disabled defaultValue={record.rating} style={{ fontSize: 12 }} />
                            </div>
                            <div style={{fontSize: 10, color: '#888'}}>({record.rating} sao)</div>
                        </div>
                    </Tooltip>
                );
            }
        },
        {
            title: 'Tổng tiền',
            key: 'total',
            width: 120,
            align: 'right',
            render: (_, record) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text strong style={{ color: '#cf1322' }}>
                        {formatCurrency(record.totalAmount)}
                    </Text>
                    <Tag style={{ width: 'fit-content', marginTop: 4, fontSize: 10, alignSelf: 'flex-end' }}>
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
            fixed: 'right', // Cố định cột trạng thái
            render: (status) => renderStatusTag(status),
        },
        {
            title: '',
            key: 'action',
            align: 'center',
            width: 60,
            fixed: 'right',
            render: (_, record) => (
                <Button
                    type="text"
                    size="small"
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
                    <Text strong>{text}</Text>
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
                <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                    {/* Checkbox Hiện tất cả */}
                    <Checkbox checked={isAll} onChange={handleCheckboxAll} style={{ fontWeight: 500 }}>
                        Hiện tất cả
                    </Checkbox>
                    <div style={{ flex: 1, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <RangePicker
                            style={{ width: 260 }}
                            format="DD/MM/YYYY"
                            value={dateRange}
                            onChange={(dates) => setDateRange(dates)}
                            allowClear={false}
                            disabled={isAll} // Disable nếu chọn All
                            ranges={{
                                'Hôm nay': [dayjs().startOf('day'), dayjs().endOf('day')],
                                'Tuần này': [dayjs().startOf('week'), dayjs().endOf('week')],
                                'Tháng này': [dayjs().startOf('month'), dayjs().endOf('month')],
                            }}
                        />
                        <Select
                            defaultValue="ALL"
                            style={{ width: 180 }}
                            value={statusFilter}
                            onChange={setStatusFilter}
                            disabled={isAll} // Disable nếu chọn All
                        >
                            <Option value="ALL">Tất cả trạng thái</Option>
                            <Option value="PENDING">Chờ duyệt</Option>
                            <Option value="PREPARING">Đang chuẩn bị</Option>
                            <Option value="SHIPPING">Đang giao</Option>
                            <Option value="COMPLETED">Hoàn thành</Option>
                            <Option value="CANCELLED">Đã hủy</Option>
                        </Select>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
                            Làm mới
                        </Button>
                    </div>
                </div>
                {/* --- BẢNG DỮ LIỆU CHÍNH --- */}
                <Table
                    columns={columns}
                    dataSource={orders}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 8,
                        showSizeChanger: false,
                        showTotal: (total) => `Tổng ${total} đơn hàng`
                    }}
                    scroll={{ x: 'max-content' }} // QUAN TRỌNG: Giúp bảng tự co giãn đẹp, không khoảng trống
                    size="middle"
                />
            </Card>
            {/* --- DRAWER CHI TIẾT ĐƠN HÀNG --- */}
            <Drawer
                title={selectedOrder ? `Chi tiết đơn hàng #${selectedOrder.id}` : "Chi tiết"}
                placement="right"
                width={650}
                onClose={handleCloseDrawer}
                open={drawerVisible}
            >
                {selectedOrder && (
                    <>
                        {/* Thông tin chung */}
                        <Descriptions bordered column={1} size="small" labelStyle={{width: '140px'}}>
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
                                    <Table.Summary.Row style={{ background: '#fafafa' }}>
                                        <Table.Summary.Cell index={0} colSpan={3} align="right">
                                            <Text type="secondary">Tiền món:</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} align="right">
                                            <Text>{formatCurrency(selectedOrder.subtotal)}</Text>
                                        </Table.Summary.Cell>
                                    </Table.Summary.Row>

                                    <Table.Summary.Row style={{ background: '#fafafa' }}>
                                        <Table.Summary.Cell index={0} colSpan={3} align="right">
                                            <Text type="secondary">Phí vận chuyển:</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={1} align="right">
                                            <Text>{formatCurrency(selectedOrder.shippingFee)}</Text>
                                        </Table.Summary.Cell>
                                    </Table.Summary.Row>

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