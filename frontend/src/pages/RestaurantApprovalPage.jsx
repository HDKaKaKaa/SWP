import React, { useState, useEffect } from 'react';
import {
    Table, Button, Card, Tag, Space, Modal, Image, message, Popconfirm, Descriptions, Divider, Row, Col, Typography, DatePicker, Input
} from 'antd';
import {
    EyeOutlined,
    ReloadOutlined,
    UserOutlined,
    ShopOutlined,
    EnvironmentOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

// Cấu hình URL Backend
const API_URL = 'http://localhost:8080/api/admin/restaurants';

const RestaurantApprovalPage = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filter state
    const [dateRange, setDateRange] = useState([]); // Mặc định rỗng = All
    const [keyword, setKeyword] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (dates = dateRange, searchKey = keyword) => {
        setLoading(true);
        try {
            const params = {};
            // Chỉ gửi ngày nếu user chọn
            if (dates && dates.length === 2) {
                params.startDate = dates[0].format('YYYY-MM-DD');
                params.endDate = dates[1].format('YYYY-MM-DD');
            }
            // Gửi keyword nếu có
            if (searchKey) {
                params.keyword = searchKey;
            }

            const response = await axios.get(`${API_URL}/pending`, { params });
            setRestaurants(response.data);
        } catch (error) {
            message.error('Không thể tải danh sách nhà hàng chờ duyệt');
        } finally {
            setLoading(false);
        }
    };

    // Handle Filter Changes
    const handleRangeChange = (dates) => {
        setDateRange(dates);
        fetchData(dates, keyword);
    };

    const handleSearch = (value) => {
        setKeyword(value);
        fetchData(dateRange, value);
    };

    // Handle Actions
    const handleApproval = async (id, isApproved) => {
        try {
            await axios.put(`${API_URL}/${id}/approve`, null, {
                params: { isApproved }
            });
            message.success(isApproved ? 'Đã duyệt hồ sơ!' : 'Đã từ chối hồ sơ!');
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            message.error('Có lỗi xảy ra khi xử lý!');
        }
    };

    const showApplication = (record) => {
        setSelectedRestaurant(record);
        setIsModalOpen(true);
    };

    const openGoogleMaps = (lat, lng) => {
        if (lat && lng) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
        } else {
            message.warning('Tọa độ không khả dụng');
        }
    };

    // --- COLUMNS ---
    const columns = [
        {
            title: 'Mã hồ sơ',
            dataIndex: 'id',
            width: 80,
            align: 'center',
            render: (id) => <Text type="secondary">#{id}</Text>
        },
        {
            title: 'Tên nhà hàng',
            dataIndex: 'name',
            render: (text, record) => (
                <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                    <Image
                        src={record.image}
                        width={40} height={40}
                        style={{borderRadius: 4, objectFit: 'cover'}}
                        fallback="https://via.placeholder.com/40"
                        preview={false}
                    />
                    <b style={{ color: '#1677ff' }}>{text}</b>
                </div>
            )
        },
        {
            title: 'Chủ sở hữu',
            dataIndex: 'ownerName',
            render: (text) => <span><UserOutlined /> {text}</span>
        },
        {
            title: 'Ngày nộp đơn',
            dataIndex: 'createdAt',
            align: 'center',
            sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        },
        {
            title: 'Trạng thái',
            align: 'center',
            render: () => <Tag color="orange" icon={<ReloadOutlined spin />}>CHỜ DUYỆT</Tag>
        },
        {
            title: 'Hành động',
            align: 'center',
            render: (_, record) => (
                <Button
                    type="primary"
                    ghost
                    icon={<FileTextOutlined />}
                    onClick={() => showApplication(record)}
                >
                    Xem đơn
                </Button>
            ),
        },
    ];

    return (
        <div style={{ padding: 20 }}>
            <Card
                title={<Title level={4} style={{margin:0}}>📬 Duyệt Đăng Ký Nhà Hàng</Title>}
                bodyStyle={{ padding: '0 24px 24px' }}
                style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                extra={<Button icon={<ReloadOutlined />} onClick={() => fetchData()}>Làm mới</Button>}
            >
                {/* --- FILTERS --- */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 20, marginTop: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 250 }}>
                        <Input.Search
                            placeholder="Tìm kiếm theo tên nhà hàng..."
                            onSearch={handleSearch}
                            onChange={(e) => { if(e.target.value === '') handleSearch('') }}
                            enterButton
                            allowClear
                        />
                    </div>
                    <div>
                        <RangePicker
                            placeholder={['Từ ngày', 'Đến ngày']}
                            value={dateRange}
                            onChange={handleRangeChange}
                            format="DD/MM/YYYY"
                            style={{ width: 260 }}
                        />
                    </div>
                </div>

                <Table
                    rowKey="id"
                    dataSource={restaurants}
                    columns={columns}
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                    locale={{ emptyText: 'Không có đơn đăng ký nào cần duyệt' }}
                />
            </Card>

            {/* --- MODAL HIỂN THỊ ĐƠN ĐĂNG KÝ (APPLICATION FORM VIEW) --- */}
            <Modal
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                width={850}
                centered
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid #f0f0f0' }}>
                        <FileTextOutlined style={{ fontSize: 22, color: '#1677ff' }} />
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 'bold' }}>Đơn đăng ký đối tác</div>
                            <div style={{ fontSize: 12, fontWeight: 'normal', color: '#888' }}>Mã hồ sơ: #{selectedRestaurant?.id} • Gửi ngày: {selectedRestaurant?.createdAt}</div>
                        </div>
                    </div>
                }
                footer={[
                    <Button key="cancel" onClick={() => setIsModalOpen(false)} size="large">Đóng</Button>,
                    <Popconfirm
                        title="Từ chối hồ sơ này?"
                        description="Hành động này sẽ gửi thông báo từ chối đến chủ quán."
                        onConfirm={() => handleApproval(selectedRestaurant?.id, false)}
                        okText="Từ chối" cancelText="Hủy" okButtonProps={{ danger: true }}
                    >
                        <Button key="reject" danger size="large" icon={<CloseCircleOutlined />}>Từ chối</Button>
                    </Popconfirm>,
                    <Popconfirm
                        title="Duyệt hồ sơ này?"
                        description="Nhà hàng sẽ được kích hoạt ngay lập tức."
                        onConfirm={() => handleApproval(selectedRestaurant?.id, true)}
                        okText="Duyệt ngay" cancelText="Hủy"
                    >
                        <Button key="approve" type="primary" size="large" icon={<CheckCircleOutlined />} style={{ backgroundColor: '#52c41a' }}>
                            Duyệt hồ sơ
                        </Button>
                    </Popconfirm>
                ]}
            >
                {selectedRestaurant && (
                    <div style={{ padding: '10px' }}>
                        {/* 1. Hình ảnh Cover */}
                        <div style={{ width: '100%', height: 200, borderRadius: 8, overflow: 'hidden', marginBottom: 20, border: '1px solid #f0f0f0', position: 'relative' }}>
                            <Image
                                src={selectedRestaurant.image}
                                width="100%" height="100%"
                                style={{ objectFit: 'cover' }}
                                fallback="https://via.placeholder.com/800x200?text=No+Cover+Image"
                            />
                            <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '4px 10px', borderRadius: 4, fontSize: 12 }}>
                                Ảnh đại diện quán
                            </div>
                        </div>

                        <Row gutter={24}>
                            {/* CỘT TRÁI: THÔNG TIN CHỦ QUÁN */}
                            <Col span={12}>
                                <Card
                                    type="inner"
                                    title={<Space><UserOutlined /> Thông tin Chủ sở hữu</Space>}
                                    size="small"
                                    style={{ height: '100%', background: '#fafafa' }}
                                >
                                    <Descriptions column={1} layout="vertical" size="small">
                                        <Descriptions.Item label={<Text type="secondary">Họ và tên</Text>}>
                                            <b style={{fontSize: 15}}>{selectedRestaurant.ownerName}</b>
                                        </Descriptions.Item>
                                        <Descriptions.Item label={<Text type="secondary">Số CCCD / CMND</Text>}>
                                            <b style={{fontSize: 15, letterSpacing: 1}}>{selectedRestaurant.ownerIdCard}</b>
                                        </Descriptions.Item>
                                        <Descriptions.Item label={<Text type="secondary">Số điện thoại liên hệ</Text>}>
                                            <b style={{fontSize: 15}}>{selectedRestaurant.phone}</b>
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Card>
                            </Col>

                            {/* CỘT PHẢI: THÔNG TIN QUÁN */}
                            <Col span={12}>
                                <Card
                                    type="inner"
                                    title={<Space><ShopOutlined /> Thông tin Doanh nghiệp</Space>}
                                    size="small"
                                    style={{ height: '100%', background: '#fafafa' }}
                                >
                                    <Descriptions column={1} layout="vertical" size="small">
                                        <Descriptions.Item label={<Text type="secondary">Tên thương hiệu</Text>}>
                                            <b style={{fontSize: 15, color: '#1677ff'}}>{selectedRestaurant.name}</b>
                                        </Descriptions.Item>
                                        <Descriptions.Item label={<Text type="secondary">Địa chỉ kinh doanh</Text>}>
                                            {selectedRestaurant.address}
                                        </Descriptions.Item>
                                        <Descriptions.Item label={<Text type="secondary">Vị trí bản đồ</Text>}>
                                            {selectedRestaurant.latitude ? (
                                                <Button size="small" type="dashed" icon={<EnvironmentOutlined />} onClick={() => openGoogleMaps(selectedRestaurant.latitude, selectedRestaurant.longitude)}>
                                                    Mở Google Maps
                                                </Button>
                                            ) : <Tag color="default">Chưa cập nhật</Tag>}
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Card>
                            </Col>
                        </Row>

                        {/* MÔ TẢ */}
                        <div style={{ marginTop: 20 }}>
                            <Card type="inner" size="small" title="Mô tả / Giới thiệu quán">
                                <Text style={{ fontStyle: 'italic', color: '#555' }}>
                                    "{selectedRestaurant.description || 'Không có mô tả chi tiết.'}"
                                </Text>
                            </Card>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default RestaurantApprovalPage;