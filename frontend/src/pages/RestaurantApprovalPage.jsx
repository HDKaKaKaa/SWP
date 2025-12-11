import React, { useState, useEffect } from 'react';
import {
    Table, Button, Card, Tag, Space, Modal, Image, message, Popconfirm, Descriptions, Divider, Row, Col, Typography, DatePicker
} from 'antd';
import {
    EyeOutlined,
    ReloadOutlined,
    UserOutlined,
    ShopOutlined,
    EnvironmentOutlined,
    PhoneOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { getPendingRestaurants, approveRestaurant } from '../services/restaurantService';

const { Text } = Typography;
const { RangePicker } = DatePicker; // <--- Sử dụng RangePicker

const RestaurantApprovalPage = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(false);

    // Mặc định: Từ hôm nay đến hôm nay
    const [dateRange, setDateRange] = useState([dayjs(), dayjs()]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);

    useEffect(() => {
        // Lấy giá trị start và end từ state mặc định
        if (dateRange && dateRange.length === 2) {
            fetchData(dateRange[0], dateRange[1]);
        } else {
            fetchData(); // Fallback về mặc định backend
        }
    }, []);

    const fetchData = async (start, end) => {
        setLoading(true);
        try {
            const data = await getPendingRestaurants(start, end);
            setRestaurants(data);
        } catch (error) {
            message.error('Không thể tải danh sách nhà hàng chờ duyệt');
        } finally {
            setLoading(false);
        }
    };

    // Xử lý khi chọn khoảng ngày
    const handleRangeChange = (dates) => {
        if (dates) {
            setDateRange(dates);
            fetchData(dates[0], dates[1]);
        } else {
            // Nếu user xóa trắng -> Reset về hôm nay
            const today = dayjs();
            const defaultRange = [today, today];
            setDateRange(defaultRange);
            fetchData(today, today);
        }
    };

    const handleApproval = async (id, isApproved) => {
        try {
            await approveRestaurant(id, isApproved);
            message.success(isApproved ? 'Đã duyệt nhà hàng!' : 'Đã từ chối nhà hàng!');
            setIsModalOpen(false);
            // Load lại dữ liệu theo range hiện tại
            fetchData(dateRange[0], dateRange[1]);
        } catch (error) {
            message.error('Có lỗi xảy ra!');
        }
    };

    const showDetail = (record) => {
        setSelectedRestaurant(record);
        setIsModalOpen(true);
    };

    const openGoogleMaps = (lat, lng) => {
        if (lat && lng) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
        } else {
            message.warning('Nhà hàng chưa cập nhật tọa độ bản đồ');
        }
    };

    // --- COLUMNS (Giữ nguyên) ---
    const columns = [
        {
            title: 'Hình ảnh',
            dataIndex: 'image',
            align: 'center',
            render: (src) => <Image width={60} height={60} src={src} style={{ borderRadius: 8, objectFit: 'cover' }} fallback="https://via.placeholder.com/60"/>
        },
        {
            title: 'Tên nhà hàng',
            dataIndex: 'name',
            render: (text) => <b style={{ fontSize: 15, color: '#1677ff' }}>{text}</b>
        },
        { title: 'Chủ nhà hàng', dataIndex: 'ownerName' },
        { title: 'Ngày đăng ký', dataIndex: 'createdAt' },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            align: 'center',
            render: () => <Tag color="orange" style={{ fontWeight: 'bold' }}>PENDING</Tag>
        },
        {
            title: 'Hành động',
            align: 'center',
            render: (_, record) => (
                <Space>
                    <Button icon={<EyeOutlined />} onClick={() => showDetail(record)}>Chi tiết</Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 20 }}>
            <Card
                title="Duyệt Đăng Ký Nhà Hàng Mới"
                extra={
                    <Space>
                        <span style={{ fontWeight: 'bold' }}>Lọc theo ngày:</span>

                        {/* --- RANGE PICKER --- */}
                        <RangePicker
                            value={dateRange}
                            onChange={handleRangeChange}
                            format="DD/MM/YYYY"
                            allowClear={true} // Cho phép xóa để reset về hôm nay
                            style={{ width: 250 }}
                        />

                        <Button icon={<ReloadOutlined />} onClick={() => fetchData(dateRange[0], dateRange[1])}>
                            Làm mới
                        </Button>
                    </Space>
                }
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            >
                <Table
                    rowKey="id"
                    dataSource={restaurants}
                    columns={columns}
                    loading={loading}
                    pagination={{ pageSize: 6 }}
                    locale={{ emptyText: 'Không có yêu cầu nào trong khoảng thời gian này' }}
                />
            </Card>

            {/* --- MODAL CHI TIẾT (Giữ nguyên không đổi) --- */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShopOutlined style={{ color: '#1677ff', fontSize: 20 }} />
                        <span>Chi tiết yêu cầu đăng ký</span>
                    </div>
                }
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                width={800}
                footer={[
                    <Button key="close" onClick={() => setIsModalOpen(false)}>Đóng</Button>,
                    <Popconfirm
                        title="Từ chối nhà hàng này?"
                        onConfirm={() => handleApproval(selectedRestaurant?.id, false)}
                        okText="Từ chối" cancelText="Hủy" okButtonProps={{ danger: true }}
                    >
                        <Button key="reject" danger>Từ chối</Button>
                    </Popconfirm>,
                    <Popconfirm
                        title="Duyệt nhà hàng này?"
                        onConfirm={() => handleApproval(selectedRestaurant?.id, true)}
                        okText="Duyệt ngay" cancelText="Hủy"
                    >
                        <Button key="approve" type="primary" style={{ backgroundColor: '#52c41a' }}>Duyệt ngay</Button>
                    </Popconfirm>
                ]}
            >
                {selectedRestaurant && (
                    <div style={{ padding: '10px 0' }}>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <Image width="100%" height={250} src={selectedRestaurant.image} style={{ borderRadius: 12, objectFit: 'cover' }} fallback="https://via.placeholder.com/600x250" />
                        </div>
                        <Row gutter={24}>
                            <Col xs={24} md={12}>
                                <Card type="inner" title={<><UserOutlined /> Thông tin Chủ Nhà Hàng</>} size="small" style={{ height: '100%', background: '#fafafa' }}>
                                    <Descriptions column={1} labelStyle={{ fontWeight: 'bold' }}>
                                        <Descriptions.Item label="Họ tên">{selectedRestaurant.ownerName}</Descriptions.Item>
                                        <Descriptions.Item label="CCCD">{selectedRestaurant.ownerIdCard}</Descriptions.Item>
                                        <Descriptions.Item label="SĐT">{selectedRestaurant.phone}</Descriptions.Item>
                                    </Descriptions>
                                </Card>
                            </Col>
                            <Col xs={24} md={12}>
                                <Card type="inner" title={<><ShopOutlined /> Thông tin Nhà Hàng</>} size="small" style={{ height: '100%', background: '#fafafa' }}>
                                    <Descriptions column={1} labelStyle={{ fontWeight: 'bold' }}>
                                        <Descriptions.Item label="Tên nhà hàng">{selectedRestaurant.name}</Descriptions.Item>
                                        <Descriptions.Item label="Địa chỉ">{selectedRestaurant.address}</Descriptions.Item>
                                        <Descriptions.Item label="Tọa độ">
                                            {selectedRestaurant.latitude ?
                                                <Button type="link" size="small" style={{padding:0}} onClick={() => openGoogleMaps(selectedRestaurant.latitude, selectedRestaurant.longitude)}>Xem bản đồ</Button>
                                                : <Tag>Chưa có</Tag>}
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Card>
                            </Col>
                        </Row>
                        <Divider />
                        <div style={{textAlign: 'center'}}><Text type="secondary">Gửi lúc: <b>{selectedRestaurant.createdAt}</b></Text></div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default RestaurantApprovalPage;