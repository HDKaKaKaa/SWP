import React, { useState, useEffect } from 'react';
import {
    Table, Card, Button, Tag, Space, message, Popconfirm, Avatar, Rate, Typography, Tooltip, Input, Select, Modal, DatePicker
} from 'antd';
import {
    ReloadOutlined,
    UserOutlined,
    LockOutlined,
    UnlockOutlined,
    SafetyCertificateOutlined,
    PhoneOutlined,
    EyeOutlined,
    ShopOutlined,
    HistoryOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const API_URL = 'http://localhost:8080/api/admin/shippers';

const ShipperManagementPage = () => {
    // --- STATE CHO DANH SÁCH CHÍNH ---
    const [shippers, setShippers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // --- STATE CHO MODAL LỊCH SỬ ---
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyList, setHistoryList] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedShipper, setSelectedShipper] = useState(null);

    // Khởi tạo là mảng rỗng [] để tránh lỗi null
    const [historyDateRange, setHistoryDateRange] = useState([]);
    const [dateRange, setDateRange] = useState([]);

    useEffect(() => {
        fetchShippers();
    }, []);

    // 1. FETCH DANH SÁCH SHIPPER (Kèm Filter)
    const fetchShippers = async (searchKey = keyword, status = statusFilter, dates = dateRange) => {
        setLoading(true);
        try {
            const params = {};
            if (searchKey) params.keyword = searchKey;
            if (status === 'ACTIVE') params.status = true;
            if (status === 'BLOCKED') params.status = false;

            // Kiểm tra null an toàn trước khi đọc length
            if (dates && dates.length === 2) {
                params.startDate = dates[0].format('YYYY-MM-DD');
                params.endDate = dates[1].format('YYYY-MM-DD');
            }

            const response = await axios.get(API_URL, { params });
            setShippers(response.data);
        } catch (error) {
            console.error(error);
            message.error('Không thể tải danh sách shipper');
        } finally {
            setLoading(false);
        }
    };

    // 2. FETCH LỊCH SỬ GIAO HÀNG
    const fetchHistory = async (shipperId, dates) => {
        setHistoryLoading(true);
        try {
            const params = {};
            if (dates && dates.length === 2) {
                params.startDate = dates[0].format('YYYY-MM-DD');
                params.endDate = dates[1].format('YYYY-MM-DD');
            }
            const response = await axios.get(`${API_URL}/${shipperId}/history`, { params });
            setHistoryList(response.data);
        } catch (error) {
            message.error('Lỗi tải lịch sử đơn hàng');
        } finally {
            setHistoryLoading(false);
        }
    };

    // --- HANDLERS ---
    const handleSearch = (val) => {
        setKeyword(val);
        fetchShippers(val, statusFilter, dateRange);
    };

    const handleStatusChange = (val) => {
        setStatusFilter(val);
        fetchShippers(keyword, val, dateRange);
    };

    // --- FIX LỖI CRASH TẠI ĐÂY ---
    const handleDateChange = (dates) => {
        // Nếu user xóa ngày (dates = null), ta gán về mảng rỗng []
        const safeDates = dates || [];
        setDateRange(safeDates);
        fetchShippers(keyword, statusFilter, safeDates);
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            await axios.put(`${API_URL}/${id}/toggle-status`);
            message.success(currentStatus ? 'Đã khóa tài khoản Shipper!' : 'Đã mở khóa tài khoản!');
            fetchShippers(keyword, statusFilter, dateRange);
        } catch (error) {
            message.error('Shipper hiện tại đang có đơn hàng. Không thể khóa tài khoản!');
        }
    };

    const handleOpenHistory = (record) => {
        setSelectedShipper(record);
        setIsHistoryModalOpen(true);
        // Reset date về All hoặc lấy theo filter hiện tại tùy logic bạn muốn
        // Ở đây mình lấy theo dateRange hiện tại để đồng bộ
        fetchHistory(record.shipperId, dateRange);
    };

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    const formatDate = (dateStr) => dateStr ? dayjs(dateStr).format('DD/MM/YYYY HH:mm') : '-';

    // Helper format thời gian giao hàng
    const formatDuration = (minutes) => {
        if (!minutes || minutes === 0) return '0p';
        const hrs = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (hrs > 0) return `${hrs}h ${mins}p`;
        return `${mins}p`;
    };

    // --- COLUMNS BẢNG CHÍNH ---
    const mainColumns = [
        {
            title: 'Tài xế',
            key: 'info',
            width: 250,
            render: (_, record) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar size={48} icon={<UserOutlined />} style={{ backgroundColor: '#87d068' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <Text strong style={{ fontSize: 15 }}>{record.fullName}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
                        <div style={{ fontSize: 12, color: '#1677ff' }}><PhoneOutlined /> {record.phone}</div>
                    </div>
                </div>
            )
        },
        {
            title: 'Hiệu suất (Đơn)',
            dataIndex: 'totalCompletedOrders',
            key: 'orders',
            align: 'center',
            sorter: (a, b) => a.totalCompletedOrders - b.totalCompletedOrders,
            render: (val) => <Tag color="blue" style={{ fontSize: 14, padding: '4px 10px' }}>{val} đơn</Tag>
        },
        {
            title: 'Tổng thu nhập',
            dataIndex: 'totalIncome',
            key: 'income',
            align: 'right',
            sorter: (a, b) => a.totalIncome - b.totalIncome,
            render: (val) => <Text strong style={{ color: '#52c41a' }}>{formatCurrency(val || 0)}</Text>
        },
        {
            title: 'Thời Gian Giao',
            dataIndex: 'totalDeliveryMinutes',
            key: 'time',
            align: 'center',
            sorter: (a, b) => a.totalDeliveryMinutes - b.totalDeliveryMinutes,
            render: (val) => (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.2 }}>
                    <span style={{ fontWeight: 600, color: '#fa8c16' }}>{formatDuration(val)}</span>
                </div>
            )
        },
        {
            title: 'Đánh giá TB',
            dataIndex: 'averageRating',
            key: 'rating',
            align: 'center',
            sorter: (a, b) => (a.averageRating || 0) - (b.averageRating || 0),
            render: (val) => val ? (
                <Tooltip title={`${val.toFixed(1)} sao`}>
                    <div>
                        <Rate disabled allowHalf defaultValue={val} style={{ fontSize: 13 }} />
                        <div style={{ fontSize: 11, color: '#888' }}>({val.toFixed(1)})</div>
                    </div>
                </Tooltip>
            ) : <Text type="secondary">Chưa có</Text>
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            key: 'status',
            align: 'center',
            render: (active) => (
                <Tag color={active ? 'success' : 'error'} icon={active ? <SafetyCertificateOutlined /> : <LockOutlined />}>
                    {active ? 'Hoạt động' : 'Đã khóa'}
                </Tag>
            )
        },
        {
            title: 'Hành động',
            align: 'center',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Xem lịch sử giao hàng">
                        <Button
                            icon={<EyeOutlined />}
                            onClick={() => handleOpenHistory(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title={record.isActive ? "Khóa tài khoản?" : "Mở khóa tài khoản?"}
                        description={record.isActive ? "Tài xế sẽ không thể nhận đơn hàng mới." : "Tài xế có thể hoạt động trở lại."}
                        onConfirm={() => handleToggleStatus(record.shipperId, record.isActive)}
                        okText={record.isActive ? "Khóa ngay" : "Mở khóa"}
                        cancelText="Hủy"
                        okButtonProps={{ danger: record.isActive }}
                    >
                        <Button
                            danger={record.isActive}
                            type={!record.isActive ? 'primary' : 'default'}
                            icon={record.isActive ? <LockOutlined /> : <UnlockOutlined />}
                        />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    // --- COLUMNS BẢNG LỊCH SỬ ---
    const historyColumns = [
        {
            title: 'Đơn hàng & Sản phẩm',
            key: 'order_details',
            width: 300,
            render: (_, record) => (
                <div>
                    <div style={{marginBottom: 8, borderBottom: '1px dashed #eee', paddingBottom: 4}}>
                        {/* SỬA TẠI ĐÂY: Hiển thị orderNumber, fallback về orderId nếu null */}
                        Mã đơn: <b>{record.orderNumber || `#${record.orderId}`}</b>
                        {' - '}
                        <span style={{color: '#cf1322', fontWeight: 'bold'}}>{formatCurrency(record.totalAmount)}</span>
                    </div>

                    <div style={{maxHeight: '120px', overflowY: 'auto'}}>
                        {record.items && record.items.map((item, idx) => (
                            <div key={idx} style={{fontSize: 12, display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                                <span>
                                    <b>{item.quantity}x</b> {item.productName}
                                    {item.options && <span style={{color: '#888', marginLeft: 4}}>({item.options})</span>}
                                </span>
                                <span style={{color: '#555'}}>{formatCurrency(item.price)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )
        },
        {
            title: 'Khách Hàng',
            key: 'route',
            width: 220,
            render: (_, record) => (
                <div style={{fontSize: 12}}>
                    <div style={{marginBottom: 6}}>
                        <ShopOutlined style={{color: 'orange'}} /> <b>{record.restaurantName}</b>
                        <div style={{color:'#888', marginLeft: 16, fontSize: 11}}>{record.restaurantAddress}</div>
                    </div>
                    <div>
                        <UserOutlined style={{color: 'blue'}} /> <b>{record.customerName}</b>
                        <span style={{color: '#666'}}> - {record.customerPhone}</span>
                    </div>
                </div>
            )
        },
        {
            title: 'Đánh giá',
            key: 'feedback',
            width: 180,
            render: (_, record) => record.shipperRating ? (
                <div style={{background: '#f6ffed', padding: 8, borderRadius: 6, border: '1px solid #b7eb8f'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 5}}>
                        <Rate disabled defaultValue={record.shipperRating} style={{fontSize: 12}} />
                        <span style={{fontWeight: 'bold', color: '#52c41a'}}>{record.shipperRating}★</span>
                    </div>
                    {record.shipperComment && <div style={{fontSize: 11, fontStyle: 'italic', color: '#555', marginTop: 4}}>"{record.shipperComment}"</div>}
                </div>
            ) : <Tag>Chưa có đánh giá</Tag>
        },
        {
            title: 'Thời gian',
            key: 'time',
            width: 150,
            render: (_, record) => (
                <div style={{fontSize: 11, color: '#666'}}>
                    <div>Giao: {formatDate(record.shippedAt)}</div>
                    <div>Xong: <span style={{color: '#333', fontWeight: 500}}>{formatDate(record.completedAt)}</span></div>
                </div>
            )
        },
        {
            title: 'Thu nhập',
            dataIndex: 'shippingFee',
            align: 'right',
            width: 100,
            render: (val) => <b style={{color: '#1677ff'}}>{formatCurrency(val)}</b>
        }
    ];

    return (
        <div style={{ padding: 20 }}>
            {/* Fix Warning: bodyStyle -> styles.body */}
            <Card
                title={<Title level={4} style={{ margin: 0 }}>🛵 Quản lý & Giám sát Tài xế</Title>}
                styles={{ body: { padding: 24 } }}
            >
                {/* --- FILTER MAIN PAGE --- */}
                <div style={{ marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <Search
                        placeholder="Tìm tên, SĐT shipper..."
                        onSearch={handleSearch}
                        enterButton
                        allowClear
                        style={{ width: 300 }}
                    />
                    <Select value={statusFilter} onChange={handleStatusChange} style={{ width: 150 }}>
                        <Option value="ALL">Tất cả trạng thái</Option>
                        <Option value="ACTIVE">Đang hoạt động</Option>
                        <Option value="BLOCKED">Đã khóa</Option>
                    </Select>

                    {/* RangePicker đã được xử lý an toàn */}
                    <RangePicker
                        value={dateRange && dateRange.length ? dateRange : null}
                        onChange={handleDateChange}
                        format="DD/MM/YYYY"
                        placeholder={['Từ ngày', 'Đến ngày']}
                    />

                    <Button icon={<ReloadOutlined />} onClick={() => fetchShippers(keyword, statusFilter, dateRange)}>Làm mới</Button>
                </div>

                <Table
                    rowKey="shipperId"
                    columns={mainColumns}
                    dataSource={shippers}
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                />
            </Card>

            {/* --- MODAL LỊCH SỬ --- */}
            <Modal
                title={
                    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <HistoryOutlined style={{color: '#1677ff'}} />
                        <span>Lịch sử giao hàng: <b style={{color: '#1677ff'}}>{selectedShipper?.fullName}</b></span>

                        {/* FIX LỖI CRASH: Kiểm tra an toàn dateRange?.length */}
                        {dateRange && dateRange.length === 2 && (
                            <Tag color="orange" style={{fontWeight: 'normal', fontSize: 12, marginLeft: 10}}>
                                Lọc theo: {dateRange[0].format('DD/MM/YYYY')} - {dateRange[1].format('DD/MM/YYYY')}
                            </Tag>
                        )}
                    </div>
                }
                open={isHistoryModalOpen}
                onCancel={() => setIsHistoryModalOpen(false)}
                width={1100}
                footer={[<Button key="close" onClick={() => setIsHistoryModalOpen(false)}>Đóng</Button>]}
            >
                <Table
                    rowKey="orderId"
                    columns={historyColumns}
                    dataSource={historyList}
                    loading={historyLoading}
                    pagination={{ pageSize: 5 }}
                    size="small"
                    scroll={{ x: 900 }}
                    summary={(pageData) => {
                        let totalShip = 0;
                        pageData.forEach(({ shippingFee }) => { totalShip += (shippingFee || 0); });
                        return (
                            <Table.Summary.Row>
                                <Table.Summary.Cell index={0} colSpan={4} align="right"><b>Tổng tiền công trang này:</b></Table.Summary.Cell>
                                <Table.Summary.Cell index={1} align="right">
                                    <Text type="danger" strong>{formatCurrency(totalShip)}</Text>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        );
                    }}
                />
            </Modal>
        </div>
    );
};

export default ShipperManagementPage;