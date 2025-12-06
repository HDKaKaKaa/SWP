import React, { useState, useEffect } from 'react';
import {
    Table, Button, Card, Tag, Space, Modal, Image, message, Popconfirm, Descriptions, Divider, Row, Col, Typography
} from 'antd';
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined,
    ReloadOutlined,
    UserOutlined,
    ShopOutlined,
    EnvironmentOutlined,
    IdcardOutlined,
    PhoneOutlined
} from '@ant-design/icons';
import { getPendingRestaurants, approveRestaurant } from '../services/restaurantService';

const { Title, Text } = Typography;

const RestaurantApprovalPage = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getPendingRestaurants();
            setRestaurants(data);
        } catch (error) {
            message.error('Không thể tải danh sách quán chờ duyệt');
        } finally {
            setLoading(false);
        }
    };

    const handleApproval = async (id, isApproved) => {
        try {
            await approveRestaurant(id, isApproved);
            message.success(isApproved ? 'Đã duyệt quán!' : 'Đã từ chối quán!');
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            message.error('Có lỗi xảy ra!');
        }
    };

    const showDetail = (record) => {
        setSelectedRestaurant(record);
        setIsModalOpen(true);
    };

    // Hàm mở Google Maps
    const openGoogleMaps = (lat, lng) => {
        if (lat && lng) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
        } else {
            message.warning('Quán chưa cập nhật tọa độ bản đồ');
        }
    };

    const columns = [
        {
            title: 'Hình ảnh',
            dataIndex: 'image',
            key: 'image',
            align: 'center',
            render: (src) => (
                <Image
                    width={60}
                    height={60}
                    src={src}
                    fallback="https://via.placeholder.com/60?text=No+Img"
                    style={{ borderRadius: 8, objectFit: 'cover' }}
                />
            )
        },
        {
            title: 'Tên quán',
            dataIndex: 'name',
            key: 'name',
            render: (text) => <b style={{ fontSize: 15, color: '#1677ff' }}>{text}</b>
        },
        {
            title: 'Chủ quán',
            dataIndex: 'ownerName', // Sử dụng trường mới từ DTO
            key: 'ownerName',
        },
        {
            title: 'Ngày đăng ký',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (text) => <span style={{ fontSize: 13, color: '#888' }}>{text}</span>
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            align: 'center',
            render: () => <Tag color="orange" style={{ fontWeight: 'bold' }}>PENDING</Tag>
        },
        {
            title: 'Hành động',
            key: 'action',
            align: 'center',
            render: (_, record) => (
                <Space>
                    <Button
                        icon={<EyeOutlined />}
                        onClick={() => showDetail(record)}
                    >
                        Chi tiết
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 20 }}>
            <Card
                title="Duyệt Đăng Ký Quán Mới"
                extra={<Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>}
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            >
                <Table
                    rowKey="id"
                    dataSource={restaurants}
                    columns={columns}
                    loading={loading}
                    pagination={{ pageSize: 6 }}
                    locale={{ emptyText: 'Hiện không có yêu cầu nào' }}
                />
            </Card>

            {/* --- MODAL CHI TIẾT ĐĂNG KÝ --- */}
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
                        title="Từ chối quán này?"
                        description="Hành động này không thể hoàn tác."
                        onConfirm={() => handleApproval(selectedRestaurant?.id, false)}
                        okText="Từ chối"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button key="reject" danger style={{ minWidth: 100 }}>Từ chối</Button>
                    </Popconfirm>,
                    <Popconfirm
                        title="Duyệt quán này?"
                        description="Quán sẽ được kích hoạt và bắt đầu hoạt động."
                        onConfirm={() => handleApproval(selectedRestaurant?.id, true)}
                        okText="Duyệt ngay"
                        cancelText="Hủy"
                    >
                        <Button key="approve" type="primary" style={{ backgroundColor: '#52c41a', minWidth: 100 }}>
                            Duyệt ngay
                        </Button>
                    </Popconfirm>
                ]}
            >
                {selectedRestaurant && (
                    <div style={{ padding: '10px 0' }}>
                        {/* 1. HÌNH ẢNH COVER */}
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <Image
                                width="100%"
                                height={250}
                                src={selectedRestaurant.image}
                                style={{ borderRadius: 12, objectFit: 'cover', border: '1px solid #f0f0f0' }}
                                fallback="https://via.placeholder.com/600x250?text=No+Cover+Image"
                            />
                        </div>

                        <Row gutter={24}>
                            {/* 2. THÔNG TIN CHỦ QUÁN (CỘT TRÁI) */}
                            <Col xs={24} md={12}>
                                <Card type="inner" title={<><UserOutlined /> Thông tin Chủ quán</>} size="small" style={{ height: '100%', background: '#fafafa' }}>
                                    <Descriptions column={1} layout="horizontal" labelStyle={{ fontWeight: 'bold', width: 100 }}>
                                        <Descriptions.Item label="Họ và tên">
                                            {selectedRestaurant.ownerName || <i style={{color:'#ccc'}}>Chưa cập nhật</i>}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="CCCD/CMND">
                                            {selectedRestaurant.ownerIdCard ? (
                                                <Tag color="blue">{selectedRestaurant.ownerIdCard}</Tag>
                                            ) : (
                                                <i style={{color:'#ccc'}}>Chưa cập nhật</i>
                                            )}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="SĐT Liên hệ">
                                            <Space>
                                                <PhoneOutlined />
                                                <b>{selectedRestaurant.phone}</b>
                                            </Space>
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Card>
                            </Col>

                            {/* 3. THÔNG TIN QUÁN (CỘT PHẢI) */}
                            <Col xs={24} md={12}>
                                <Card type="inner" title={<><ShopOutlined /> Thông tin Quán ăn</>} size="small" style={{ height: '100%', background: '#fafafa' }}>
                                    <Descriptions column={1} layout="horizontal" labelStyle={{ fontWeight: 'bold', width: 80 }}>
                                        <Descriptions.Item label="Tên quán">
                                            <b style={{ color: '#1677ff', fontSize: 16 }}>{selectedRestaurant.name}</b>
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Địa chỉ">
                                            {selectedRestaurant.address}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Tọa độ">
                                            {selectedRestaurant.latitude && selectedRestaurant.longitude ? (
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    icon={<EnvironmentOutlined />}
                                                    onClick={() => openGoogleMaps(selectedRestaurant.latitude, selectedRestaurant.longitude)}
                                                    style={{ padding: 0 }}
                                                >
                                                    Xem trên Google Maps
                                                </Button>
                                            ) : (
                                                <Tag>Chưa có tọa độ</Tag>
                                            )}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Mô tả">
                                            <Text type="secondary" style={{ fontSize: 13 }}>
                                                {selectedRestaurant.description || "Không có mô tả"}
                                            </Text>
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Card>
                            </Col>
                        </Row>

                        <Divider style={{ margin: '16px 0' }} />

                        <div style={{ textAlign: 'center' }}>
                            <Text type="secondary">
                                Yêu cầu được gửi vào lúc: <b>{selectedRestaurant.createdAt}</b>
                            </Text>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default RestaurantApprovalPage;