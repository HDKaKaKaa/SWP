import React, { useEffect, useState, useRef } from 'react';
import { Card, Spin, message, Row, Col, Tag, Descriptions, Table, Button, Space, Typography, Divider } from 'antd';
import {
    ArrowLeftOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ShopOutlined,
    UserOutlined,
    EnvironmentOutlined,
    DollarOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrderDetail } from '../services/shipperService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const ShipperOrderDetail = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [shipperId, setShipperId] = useState(null);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        if (user && user.id) {
            setShipperId(user.shipperId || user.id);
        }
    }, [user]);

    useEffect(() => {
        if (shipperId && orderId) {
            fetchOrderDetail();
        }
    }, [shipperId, orderId]);

    // Initialize map
    useEffect(() => {
        if (order && order.shippingLat && order.shippingLong && mapRef.current) {
            // Calculate bounding box
            let bbox;
            if (order.restaurant && order.restaurant.lat && order.restaurant.long) {
                // Include both restaurant and delivery location
                const minLat = Math.min(order.restaurant.lat, order.shippingLat);
                const maxLat = Math.max(order.restaurant.lat, order.shippingLat);
                const minLng = Math.min(order.restaurant.long, order.shippingLong);
                const maxLng = Math.max(order.restaurant.long, order.shippingLong);
                // Add padding
                const padding = 0.01;
                bbox = `${minLng - padding},${minLat - padding},${maxLng + padding},${maxLat + padding}`;
            } else {
                // Only delivery location
                const padding = 0.01;
                bbox = `${order.shippingLong - padding},${order.shippingLat - padding},${order.shippingLong + padding},${order.shippingLat + padding}`;
            }

            const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${order.shippingLat},${order.shippingLong}`;
            
            // Create iframe to display map
            if (!mapInstanceRef.current) {
                const iframe = document.createElement('iframe');
                iframe.width = '100%';
                iframe.height = '100%';
                iframe.frameBorder = '0';
                iframe.scrolling = 'no';
                iframe.style.border = 'none';
                iframe.style.display = 'block';
                iframe.src = mapUrl;
                mapRef.current.appendChild(iframe);
                mapInstanceRef.current = iframe;
            } else {
                mapInstanceRef.current.src = mapUrl;
            }
        }

        // Cleanup on unmount
        return () => {
            if (mapInstanceRef.current && mapRef.current) {
                mapRef.current.removeChild(mapInstanceRef.current);
                mapInstanceRef.current = null;
            }
        };
    }, [order]);

    const fetchOrderDetail = async () => {
        try {
            setLoading(true);
            const data = await getOrderDetail(orderId, shipperId);
            setOrder(data);
        } catch (error) {
            message.error(error.response?.data || 'Không thể tải chi tiết đơn hàng!');
            navigate('/shipper/history');
        } finally {
            setLoading(false);
        }
    };

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return dayjs(dateString).format('DD/MM/YYYY HH:mm:ss');
    };

    const calculateDeliveryTime = () => {
        if (order?.shippedAt && order?.completedAt) {
            const startTime = dayjs(order.shippedAt);
            const endTime = dayjs(order.completedAt);
            const diffMinutes = endTime.diff(startTime, 'minute');
            
            if (diffMinutes < 60) {
                return `${diffMinutes} phút`;
            } else {
                const hours = Math.floor(diffMinutes / 60);
                const minutes = diffMinutes % 60;
                return `${hours} giờ ${minutes} phút`;
            }
        }
        return 'N/A';
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', marginTop: 50 }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!order) {
        return null;
    }

    const orderItemsColumns = [
        {
            title: 'Món ăn',
            key: 'product',
            render: (_, record) => (
                <Space>
                    {record.product?.image && (
                        <img
                            src={record.product.image}
                            alt={record.product.name}
                            style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                        />
                    )}
                    <div>
                        <div>{record.product?.name || 'N/A'}</div>
                        {record.product?.description && (
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                {record.product.description}
                            </Text>
                        )}
                    </div>
                </Space>
            ),
        },
        {
            title: 'Số lượng',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 100,
            align: 'center',
        },
        {
            title: 'Đơn giá',
            dataIndex: 'price',
            key: 'price',
            width: 150,
            align: 'right',
            render: (price) => formatMoney(price),
        },
        {
            title: 'Thành tiền',
            key: 'total',
            width: 150,
            align: 'right',
            render: (_, record) => formatMoney(parseFloat(record.price) * record.quantity),
        },
    ];

    return (
        <div style={{ padding: 0, margin: 0, width: '100%' }}>
            <Card>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={2} style={{ margin: 0 }}>
                            Chi tiết đơn hàng #{order.id}
                        </Title>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate('/shipper/history')}
                        >
                            Quay lại
                        </Button>
                    </div>

                    {/* Status */}
                    <div>
                        <Space>
                            <Tag
                                color={order.status === 'COMPLETED' ? 'green' : 'red'}
                                icon={order.status === 'COMPLETED' ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                                style={{ fontSize: '16px', padding: '8px 16px' }}
                            >
                                {order.status}
                            </Tag>
                            {order.isOverdue && (
                                <Tag color="red" style={{ fontSize: '16px', padding: '8px 16px', fontWeight: 'bold' }}>
                                    ⚠️ QUÁ HẠN
                                </Tag>
                            )}
                        </Space>
                    </div>

                    <Row gutter={16}>
                        {/* Left Column - Order Info */}
                        <Col xs={24} lg={12}>
                            {/* Order Information */}
                            <Card title="Thông tin đơn hàng" style={{ marginBottom: 16 }}>
                                <Descriptions column={1} bordered>
                                    <Descriptions.Item label="Mã đơn hàng">
                                        <Text strong>#{order.id}</Text>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Trạng thái">
                                        <Tag color={order.status === 'COMPLETED' ? 'green' : 'red'}>
                                            {order.status}
                                        </Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Phương thức thanh toán">
                                        <Tag>{order.paymentMethod}</Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Ghi chú">
                                        {order.note || 'Không có'}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Card>

                            {/* Order Items with Payment Summary */}
                            {order.orderItems && order.orderItems.length > 0 && (
                                <Card title="Chi tiết món ăn & Thanh toán" style={{ marginBottom: 16 }}>
                                    <Table
                                        columns={orderItemsColumns}
                                        dataSource={order.orderItems}
                                        rowKey="id"
                                        pagination={false}
                                        summary={() => (
                                            <Table.Summary fixed>
                                                <Table.Summary.Row>
                                                    <Table.Summary.Cell index={0} colSpan={3}>
                                                        <Text strong>Tổng tiền món ăn:</Text>
                                                    </Table.Summary.Cell>
                                                    <Table.Summary.Cell index={1} align="right">
                                                        <Text strong>{formatMoney(order.subtotal)}</Text>
                                                    </Table.Summary.Cell>
                                                </Table.Summary.Row>
                                                <Table.Summary.Row>
                                                    <Table.Summary.Cell index={0} colSpan={3}>
                                                        <Text strong>Phí vận chuyển:</Text>
                                                    </Table.Summary.Cell>
                                                    <Table.Summary.Cell index={1} align="right">
                                                        <Text strong>{formatMoney(order.shippingFee)}</Text>
                                                    </Table.Summary.Cell>
                                                </Table.Summary.Row>
                                                <Table.Summary.Row>
                                                    <Table.Summary.Cell index={0} colSpan={3}>
                                                        <Text strong style={{ fontSize: '16px' }}>
                                                            Tổng cộng:
                                                        </Text>
                                                    </Table.Summary.Cell>
                                                    <Table.Summary.Cell index={1} align="right">
                                                        <Text strong style={{ fontSize: '16px', color: '#52c41a' }}>
                                                            {formatMoney(order.totalAmount)}
                                                        </Text>
                                                    </Table.Summary.Cell>
                                                </Table.Summary.Row>
                                            </Table.Summary>
                                        )}
                                    />
                                </Card>
                            )}

                            {/* Timeline */}
                            <Card
                                title={
                                    <Space>
                                        <ClockCircleOutlined />
                                        Lịch sử đơn hàng
                                    </Space>
                                }
                            >
                                <Descriptions column={1} bordered>
                                    <Descriptions.Item label="Thời gian tạo đơn">
                                        {formatDate(order.createdAt)}
                                    </Descriptions.Item>
                                    {order.restaurantAcceptedAt && (
                                        <Descriptions.Item label="Nhà hàng chấp nhận">
                                            {formatDate(order.restaurantAcceptedAt)}
                                        </Descriptions.Item>
                                    )}
                                    {order.shippedAt && (
                                        <Descriptions.Item label="Bắt đầu giao hàng">
                                            {formatDate(order.shippedAt)}
                                        </Descriptions.Item>
                                    )}
                                    {order.completedAt && (
                                        <Descriptions.Item label="Hoàn thành">
                                            {formatDate(order.completedAt)}
                                        </Descriptions.Item>
                                    )}
                                    {order.shippedAt && order.completedAt && (
                                        <Descriptions.Item label="Thời gian giao hàng">
                                            <Text strong style={{ color: '#52c41a' }}>
                                                {calculateDeliveryTime()}
                                            </Text>
                                        </Descriptions.Item>
                                    )}
                                </Descriptions>
                            </Card>
                        </Col>

                        {/* Right Column - Map & Other Info */}
                        <Col xs={24} lg={12}>
                            {/* Map & Delivery Info */}
                            <Card
                                title={
                                    <Space>
                                        <EnvironmentOutlined />
                                        Bản đồ & Thông tin giao hàng
                                    </Space>
                                }
                                style={{ marginBottom: 16 }}
                            >
                                {order.shippingLat && order.shippingLong ? (
                                    <div>
                                        <div
                                            id="order-detail-map"
                                            ref={mapRef}
                                            style={{
                                                height: '300px',
                                                width: '100%',
                                                borderRadius: '8px',
                                                marginBottom: 16,
                                                position: 'relative',
                                                overflow: 'hidden',
                                                border: '1px solid #d9d9d9',
                                                zIndex: 1
                                            }}
                                        />
                                        <Descriptions column={1} bordered style={{ marginTop: 16 }}>
                                            <Descriptions.Item label="Địa chỉ giao hàng">
                                                {order.shippingAddress}
                                            </Descriptions.Item>
                                            <Descriptions.Item label="Tọa độ">
                                                <Button
                                                    type="link"
                                                    onClick={() => navigate('/shipper/map')}
                                                    style={{ padding: 0, height: 'auto' }}
                                                >
                                                    {order.shippingLat}, {order.shippingLong}
                                                </Button>
                                            </Descriptions.Item>
                                            {order.restaurant && (
                                                <Descriptions.Item label="Nhà hàng">
                                                    {order.restaurant.name}
                                                </Descriptions.Item>
                                            )}
                                        </Descriptions>
                                    </div>
                                ) : (
                                    <Descriptions column={1} bordered>
                                        <Descriptions.Item label="Địa chỉ giao hàng">
                                            {order.shippingAddress}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Tọa độ">
                                            N/A
                                        </Descriptions.Item>
                                        {order.restaurant && (
                                            <Descriptions.Item label="Nhà hàng">
                                                {order.restaurant.name}
                                            </Descriptions.Item>
                                        )}
                                    </Descriptions>
                                )}
                            </Card>

                            {/* Restaurant Information */}
                            {order.restaurant && (
                                <Card
                                    title={
                                        <Space>
                                            <ShopOutlined />
                                            Thông tin nhà hàng
                                        </Space>
                                    }
                                    style={{ marginBottom: 16 }}
                                >
                                    <Descriptions column={1} bordered>
                                        <Descriptions.Item label="Tên nhà hàng">
                                            {order.restaurant.name}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Địa chỉ">
                                            {order.restaurant.address}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Số điện thoại">
                                            {order.restaurant.phone || 'N/A'}
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Card>
                            )}

                            {/* Customer Information */}
                            {order.customer && (
                                <Card
                                    title={
                                        <Space>
                                            <UserOutlined />
                                            Thông tin khách hàng
                                        </Space>
                                    }
                                >
                                    <Descriptions column={1} bordered>
                                        <Descriptions.Item label="Tên đăng nhập">
                                            {order.customer.username}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Email">
                                            {order.customer.email}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Số điện thoại">
                                            {order.customer.phone || 'N/A'}
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Card>
                            )}
                        </Col>
                    </Row>
                </Space>
            </Card>
        </div>
    );
};

export default ShipperOrderDetail;

