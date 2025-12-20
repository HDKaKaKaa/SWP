import React, { useState, useEffect, useCallback } from 'react';
import {
    Card, Table, Tag, Space, DatePicker, Select, Button, Typography, Row, Col, message,
    Drawer, Descriptions, Timeline, Divider, Tooltip, Rate, Checkbox, Input
} from 'antd';
import {
    ReloadOutlined, EyeOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
    PhoneOutlined, WarningOutlined, UserOutlined, ShopOutlined, SearchOutlined
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
    const [keyword, setKeyword] = useState(''); // [NEW] State từ khóa tìm kiếm

    // State cho Checkbox "All"
    const [isAll, setIsAll] = useState(false);

    // State cho Drawer chi tiết
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = {};

            // 1. LUÔN LUÔN lấy status từ state người dùng chọn
            params.status = statusFilter;

            // [NEW] Gửi từ khóa tìm kiếm xuống BE
            if (keyword && keyword.trim() !== '') {
                params.keyword = keyword.trim();
            }

            // 2. Xử lý thời gian
            if (isAll) {
                // Nếu tick "Hiện tất cả" -> Gửi khoảng thời gian "từ cổ chí kim"
                params.startDate = '2000-01-01';
                params.endDate = dayjs().format('YYYY-MM-DD');
            } else {
                // Nếu không tick -> Lấy theo DatePicker
                if (dateRange && dateRange[0] && dateRange[1]) {
                    params.startDate = dateRange[0].format('YYYY-MM-DD');
                    params.endDate = dateRange[1].format('YYYY-MM-DD');
                }
            }

            console.log("Params gửi đi:", params);
            const response = await axios.get(API_URL, { params });
            setOrders(response.data);
        } catch (error) {
            message.error('Không thể tải danh sách đơn hàng!');
        } finally {
            setLoading(false);
        }
    }, [dateRange, statusFilter, isAll, keyword]); // [NEW] Thêm keyword vào dependency

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleRefresh = () => {
        fetchOrders();
    };

    // [NEW] Xử lý tìm kiếm
    const handleSearch = (value) => {
        setKeyword(value);
        // useEffect sẽ tự gọi lại fetchOrders khi keyword thay đổi
    };

    // Handler cho Checkbox
    const handleCheckboxAll = (e) => {
        setIsAll(e.target.checked);
        if (e.target.checked) {
            setStatusFilter('ALL');
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

        if (status === 'COMPLETED') {
            return <Tag color="success">{diffMinutes} phút</Tag>;
        }
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                {isOverdue ? (
                    <Tag color="#cf1322" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <WarningOutlined spin /> {diffMinutes} phút
                    </Tag>
                ) : (
                    <Tag color="processing">{diffMinutes}/20 phút</Tag>
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
            case 'PREPARING': color = 'orange'; text = 'Chuẩn bị'; break;
            case 'SHIPPING': color = 'processing'; text = 'Đang giao'; break;
            case 'COMPLETED': color = 'success'; text = 'Hoàn thành'; break;
            case 'CANCELLED': color = 'error'; text = 'Đã hủy'; break;
            case 'REFUNDED': color = 'purple'; text = 'Hoàn tiền'; break;
            default: break;
        }
        return <Tag color={color} style={{width: '100%', textAlign: 'center', margin: 0}}>{text}</Tag>;
    };

    const formatDate = (dateStr) => dateStr ? dayjs(dateStr).format('DD/MM/YYYY HH:mm') : '';
    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    // --- [NEW] CẤU HÌNH CỘT (DÙNG % ĐỂ VỪA KHÍT MÀN HÌNH) ---
    const columns = [
        {
            title: 'Mã đơn',
            dataIndex: 'orderNumber',
            width: '14%', // Dùng %
            // Đã gộp ngày tạo vào cột này để tiết kiệm chỗ
            render: (text, record) => (
                <div style={{cursor: 'pointer'}} onClick={() => handleOpenDrawer(record)}>
                    <div style={{fontWeight: 600, color: '#1677ff'}}>{text || `#${record.id}`}</div>
                    <div style={{fontSize: 11, color: '#888'}}>{dayjs(record.createdAt).format('DD/MM HH:mm')}</div>
                </div>
            ),
        },
        // Đã bỏ cột "Thời gian đặt" riêng lẻ
        {
            title: 'Khách hàng & Quán',
            key: 'customerRestaurant',
            width: '26%',
            render: (_, record) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <div>
                        <UserOutlined style={{color: '#1677ff', marginRight: 4}} />
                        <Text strong style={{fontSize: 13}}>{record.customerName || 'Khách lẻ'}</Text>
                        {record.customerPhone && (
                            <span style={{ fontSize: 11, color: '#666', marginLeft: 4 }}>
                                - {record.customerPhone}
                            </span>
                        )}
                    </div>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <ShopOutlined style={{color: '#fa8c16', marginRight: 4}} />
                        <Tooltip title={record.restaurantName}>
                            <Text style={{ fontSize: 12 }}>{record.restaurantName}</Text>
                        </Tooltip>
                    </div>
                </div>
            ),
        },
        {
            title: 'Shipper',
            key: 'shipper',
            width: '18%',
            render: (_, record) => record.shipperName ? (
                <div>
                    <div style={{fontSize: 13, fontWeight: 500}}>{record.shipperName}</div>
                    {record.shipperPhone && (
                        <div style={{ fontSize: 11, color: '#1677ff' }}>
                            {record.shipperPhone}
                        </div>
                    )}
                </div>
            ) : <Text type="secondary" italic style={{fontSize: 11}}>Chưa nhận</Text>,
        },
        {
            title: 'Thời gian giao',
            key: 'deliveryTime',
            align: 'center',
            width: '12%',
            render: (_, record) => (
                <DeliveryTimeCell
                    status={record.status}
                    shippedAt={record.shippedAt}
                    completedAt={record.completedAt}
                />
            ),
        },
        {
            title: 'Tổng tiền',
            key: 'total',
            width: '15%',
            align: 'right',
            render: (_, record) => (
                <div>
                    <div style={{ color: '#cf1322', fontWeight: 600 }}>
                        {formatCurrency(record.totalAmount)}
                    </div>
                    <Tag style={{ fontSize: 10, margin: 0, marginTop: 2 }}>
                        {record.paymentMethod}
                    </Tag>
                </div>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: '10%',
            align: 'center',
            render: (status) => renderStatusTag(status),
        },
        {
            title: '',
            key: 'action',
            align: 'center',
            width: '5%',
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
        <div style={{ padding: 20 }}>
            <Card bordered={false} bodyStyle={{ padding: '10px 24px' }}>
                <Title level={4} style={{ margin: 0 }}>QUẢN LÝ ĐƠN HÀNG</Title>
            </Card>

            <Card bordered={false} style={{marginTop: 16}}>
                {/* --- [MODIFIED] THANH CÔNG CỤ BỘ LỌC --- */}
                <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>

                    {/* 1. Ô Tìm Kiếm */}
                    <Input.Search
                        placeholder="Tìm Mã đơn, Tên/SĐT Khách hoặc Quán..."
                        allowClear
                        enterButton
                        onSearch={handleSearch}
                        style={{ width: 320 }}
                        onChange={(e) => {
                            if (e.target.value === '') handleSearch('');
                        }}
                    />

                    {/* 2. Chọn Ngày */}
                    <RangePicker
                        style={{ width: 240 }}
                        format="DD/MM/YYYY"
                        value={dateRange}
                        onChange={(dates) => setDateRange(dates)}
                        allowClear={false}
                        disabled={isAll}
                        placeholder={['Từ ngày', 'Đến ngày']}
                    />

                    {/* 3. Chọn Trạng Thái */}
                    <Select
                        defaultValue="ALL"
                        style={{ width: 160 }}
                        value={statusFilter}
                        onChange={setStatusFilter}
                    >
                        <Option value="ALL">Tất cả trạng thái</Option>
                        <Option value="PENDING">Chờ duyệt</Option>
                        <Option value="PREPARING">Đang chuẩn bị</Option>
                        <Option value="SHIPPING">Đang giao</Option>
                        <Option value="COMPLETED">Hoàn thành</Option>
                        <Option value="CANCELLED">Đã hủy</Option>
                        <Option value="REFUNDED">Đã hoàn tiền</Option>
                    </Select>

                    {/* 4. Checkbox Tất cả */}
                    <Checkbox checked={isAll} onChange={handleCheckboxAll}>Hiện tất cả các đơn hàng</Checkbox>

                    <div style={{ flex: 1, textAlign: 'right' }}>
                        <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
                            Làm mới
                        </Button>
                    </div>
                </div>

                {/* --- [MODIFIED] BẢNG DỮ LIỆU CHÍNH --- */}
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
                    size="small" // Dùng size nhỏ để gọn hơn
                    // Đã bỏ scroll={{ x: 'max-content' }} để bảng tự co giãn full màn hình
                />
            </Card>

            {/* --- DRAWER CHI TIẾT ĐƠN HÀNG --- */}
            <Drawer
                title={selectedOrder ? `Chi tiết đơn hàng ${selectedOrder.orderNumber || '#' + selectedOrder.id}` : "Chi tiết"}
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
                            {/* 1. Lúc nào cũng có: Đặt hàng thành công */}
                            <Timeline.Item dot={<ClockCircleOutlined style={{fontSize: 16}} />} color="blue">
                                <Text strong>Đặt hàng thành công</Text>
                                <br />
                                <Text type="secondary">{formatDate(selectedOrder.createdAt)}</Text>
                            </Timeline.Item>

                            {/* 2. Nhà hàng nhận đơn */}
                            {selectedOrder.restaurantAcceptedAt && (
                                <Timeline.Item color="orange">
                                    <Text strong>Nhà hàng đã nhận đơn</Text>
                                    <br />
                                    <Text type="secondary">{formatDate(selectedOrder.restaurantAcceptedAt)}</Text>
                                </Timeline.Item>
                            )}

                            {/* 3. Shipper nhận đơn */}
                            {selectedOrder.shippedAt && (
                                <Timeline.Item color="blue">
                                    <Text strong>Shipper đã nhận & bắt đầu giao</Text>
                                    <br />
                                    <Text type="secondary">{formatDate(selectedOrder.shippedAt)}</Text>
                                </Timeline.Item>
                            )}

                            {/* 4. Case: HOÀN THÀNH */}
                            {selectedOrder.status === 'COMPLETED' && (
                                <Timeline.Item dot={<CheckCircleOutlined style={{fontSize: 16}} />} color="green">
                                    <Text strong>Giao hàng thành công</Text>
                                    <br />
                                    <Text type="secondary">
                                        {selectedOrder.completedAt ? formatDate(selectedOrder.completedAt) : ''}
                                    </Text>
                                </Timeline.Item>
                            )}

                            {/* 5. Case: ĐÃ HỦY (SỬA LẠI: Không bắt buộc completedAt phải có giá trị mới hiện) */}
                            {selectedOrder.status === 'CANCELLED' && (
                                <Timeline.Item dot={<CloseCircleOutlined style={{fontSize: 16}} />} color="red">
                                    <Text strong>Đơn hàng đã bị hủy</Text>
                                    <br />
                                    {selectedOrder.completedAt ? (
                                        <Text type="secondary">{formatDate(selectedOrder.completedAt)}</Text>
                                    ) : (
                                        <Text type="secondary" italic>(Không có thời gian cụ thể)</Text>
                                    )}
                                </Timeline.Item>
                            )}

                            {/* 6. Case: ĐÃ HOÀN TIỀN (Thêm mới cho đủ bộ) */}
                            {selectedOrder.status === 'REFUNDED' && (
                                <Timeline.Item dot={<WarningOutlined style={{fontSize: 16}} />} color="purple">
                                    <Text strong>Đơn hàng đã hoàn tiền</Text>
                                    <br />
                                    <Text type="secondary">
                                        {selectedOrder.completedAt ? formatDate(selectedOrder.completedAt) : ''}
                                    </Text>
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