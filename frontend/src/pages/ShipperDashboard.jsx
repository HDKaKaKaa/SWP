import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Button, Switch, message, Spin, List, Tag, Space } from 'antd';
import {
    ShoppingOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CarOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import {
    getAvailableOrders,
    getMyOrders,
    acceptOrder,
    updateShipperStatus,
    getShipperProfile
} from '../services/shipperService';
import '../css/ShipperDashboard.css';

const ShipperDashboard = () => {
    const { user } = useAuth();
    const [availableOrders, setAvailableOrders] = useState([]);
    const [myOrders, setMyOrders] = useState([]);
    const [shipperStatus, setShipperStatus] = useState('OFFLINE'); // ONLINE, BUSY, OFFLINE
    const [loading, setLoading] = useState(true);
    const [shipperId, setShipperId] = useState(null);
    const [deliveryStartTime, setDeliveryStartTime] = useState(null); // Thời gian bắt đầu giao hàng
    const [elapsedTime, setElapsedTime] = useState(0); // Thời gian đã trôi qua (giây)

    // Giả sử shipperId được lưu trong user object hoặc lấy từ API
    useEffect(() => {
        if (user && user.id) {
            // Nếu user có shipperId, dùng nó. Nếu không, dùng accountId
            setShipperId(user.shipperId || user.id);
        } else {
            // Nếu không có user, vẫn cho phép xem đơn hàng có sẵn
            setShipperId(null);
        }
    }, [user]);

    // Load dữ liệu
    useEffect(() => {
        fetchData();
    }, [shipperId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Luôn lấy đơn hàng có sẵn
            const available = await getAvailableOrders();
            setAvailableOrders(available);
            
            // Chỉ lấy đơn hàng của shipper nếu có shipperId
            if (shipperId) {
                try {
                    const my = await getMyOrders(shipperId);
                    setMyOrders(my);
                    
                    // Lấy thông tin shipper để biết trạng thái hiện tại
                    const profile = await getShipperProfile(shipperId);
                    setShipperStatus(profile.status || 'OFFLINE');
                    
                    // Nếu đang BUSY và có đơn đang giao, bắt đầu đếm thời gian
                    if (profile.status === 'BUSY' && my.some(o => o.status === 'SHIPPING')) {
                        // Tìm đơn đang giao đầu tiên để lấy thời gian bắt đầu (dùng shippedAt)
                        const shippingOrder = my.find(o => o.status === 'SHIPPING');
                        if (shippingOrder && shippingOrder.shippedAt) {
                            const startTime = new Date(shippingOrder.shippedAt).getTime();
                            setDeliveryStartTime(startTime);
                        } else if (shippingOrder && shippingOrder.createdAt) {
                            // Fallback: nếu chưa có shippedAt, dùng createdAt (cho đơn hàng cũ)
                            const startTime = new Date(shippingOrder.createdAt).getTime();
                            setDeliveryStartTime(startTime);
                        }
                    } else if (profile.status !== 'BUSY') {
                        setDeliveryStartTime(null);
                        setElapsedTime(0);
                    }
                } catch (error) {
                    console.error('Lỗi khi lấy đơn hàng của shipper:', error);
                    setMyOrders([]);
                }
            } else {
                setMyOrders([]);
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
            message.error('Không thể tải dữ liệu! ' + (error.response?.data || error.message));
            setAvailableOrders([]);
            setMyOrders([]);
        } finally {
            setLoading(false);
        }
    };

    // Timer đếm thời gian giao hàng
    useEffect(() => {
        let interval = null;
        if (shipperStatus === 'BUSY' && deliveryStartTime) {
            interval = setInterval(() => {
                const now = Date.now();
                const elapsed = Math.floor((now - deliveryStartTime) / 1000); // Đếm bằng giây
                setElapsedTime(elapsed);
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [shipperStatus, deliveryStartTime]);

    // Format thời gian (giây -> mm:ss hoặc hh:mm:ss)
    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Toggle trạng thái ONLINE/OFFLINE (chỉ cho phép khi không BUSY)
    const handleToggleStatus = async (checked) => {
        if (!shipperId) {
            message.warning('Vui lòng đăng nhập để sử dụng chức năng này!');
            return;
        }
        if (shipperStatus === 'BUSY') {
            message.warning('Không thể đổi trạng thái khi đang giao hàng!');
            return;
        }
        try {
            await updateShipperStatus(shipperId, checked ? 'ONLINE' : 'OFFLINE');
            setShipperStatus(checked ? 'ONLINE' : 'OFFLINE');
            message.success(checked ? 'Đã bật trạng thái ONLINE' : 'Đã tắt trạng thái ONLINE');
            fetchData();
        } catch (error) {
            message.error('Không thể cập nhật trạng thái! ' + (error.response?.data || error.message));
        }
    };

    // Nhận đơn hàng
    const handleAcceptOrder = async (orderId) => {
        if (!shipperId) {
            message.warning('Vui lòng đăng nhập để nhận đơn hàng!');
            return;
        }
        if (shipperStatus !== 'ONLINE') {
            message.warning('Chỉ có thể nhận đơn khi ở trạng thái ONLINE!');
            return;
        }
        try {
            await acceptOrder(orderId, shipperId);
            message.success('Nhận đơn hàng thành công!');
            // Cập nhật trạng thái thành BUSY
            setShipperStatus('BUSY');
            // Reset timer, fetchData sẽ set lại deliveryStartTime từ shippedAt
            setDeliveryStartTime(null);
            setElapsedTime(0);
            // Fetch lại dữ liệu để lấy shippedAt từ server
            await fetchData();
        } catch (error) {
            message.error(error.response?.data || 'Không thể nhận đơn hàng!');
        }
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
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN');
    };

    // Tính khoảng cách (giả lập - trong thực tế cần API tính khoảng cách thực)
    const calculateDistance = (order) => {
        if (order.shippingLat && order.shippingLong) {
            // Giả lập khoảng cách
            return (Math.random() * 10 + 2).toFixed(1) + ' km';
        }
        return 'N/A';
    };

    // Tính thời gian ước tính (giả lập)
    const calculateEstimatedTime = (order) => {
        const distance = calculateDistance(order);
        if (distance !== 'N/A') {
            const km = parseFloat(distance);
            // Giả sử tốc độ trung bình 30km/h
            const minutes = Math.round(km * 2);
            return `${minutes} phút`;
        }
        return 'N/A';
    };

    // Đếm số đơn hàng theo trạng thái
    const shippingCount = myOrders.filter(o => o.status === 'SHIPPING').length;
    const completedCount = myOrders.filter(o => o.status === 'COMPLETED').length;

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: 50 }}><Spin size="large" /></div>;
    }

    return (
        <div style={{ padding: 0, margin: 0, width: '100%' }}>
            {!shipperId && (
                <Card style={{ marginBottom: 16, background: '#fff7e6', border: '1px solid #ffd591' }}>
                    <p style={{ margin: 0, color: '#d46b08' }}>
                        ⚠️ Bạn chưa đăng nhập. Vui lòng đăng nhập với tài khoản shipper để sử dụng đầy đủ chức năng.
                    </p>
                </Card>
            )}
            
            {shipperId && (
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={24}>
                        <Card>
                            <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ margin: 0 }}>Trạng thái hoạt động</h2>
                                    <p style={{ margin: '8px 0 0 0' }}>
                                        {shipperStatus === 'ONLINE' && 'Bật trạng thái ONLINE để nhận đơn hàng mới'}
                                        {shipperStatus === 'BUSY' && 'Đang giao hàng - Không thể nhận đơn mới'}
                                        {shipperStatus === 'OFFLINE' && 'Bật trạng thái ONLINE để nhận đơn hàng mới'}
                                    </p>
                                    {shipperStatus === 'BUSY' && elapsedTime > 0 && (
                                        <p style={{ margin: '8px 0 0 0', fontSize: '16px', fontWeight: 'bold', color: '#faad14' }}>
                                            ⏱️ Thời gian giao hàng: {formatTime(elapsedTime)}
                                        </p>
                                    )}
                                </div>
                                <Space direction="vertical" align="end" size="small">
                                    {shipperStatus === 'BUSY' ? (
                                        <Tag color="orange" style={{ fontSize: '16px', padding: '8px 16px', margin: 0 }}>
                                            BUSY
                                        </Tag>
                                    ) : (
                                        <div>
                                            <Switch
                                                checked={shipperStatus === 'ONLINE'}
                                                onChange={handleToggleStatus}
                                                checkedChildren="ONLINE"
                                                unCheckedChildren="OFFLINE"
                                                size="large"
                                                className={shipperStatus === 'ONLINE' ? 'shipper-online-switch' : ''}
                                            />
                                        </div>
                                    )}
                                </Space>
                            </Space>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Thống kê */}
            {shipperId && (
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Đơn hàng có sẵn"
                                value={availableOrders.length}
                                prefix={<ShoppingOutlined />}
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Đang giao hàng"
                                value={shippingCount}
                                prefix={<CarOutlined />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Đã hoàn thành"
                                value={completedCount}
                                prefix={<CheckCircleOutlined />}
                                valueStyle={{ color: '#722ed1' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Tổng đơn hàng"
                                value={myOrders.length}
                                prefix={<ClockCircleOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>
            )}

            <Row gutter={16}>
                {/* Đơn hàng có sẵn */}
                <Col span={shipperId ? 12 : 24}>
                    <Card title="Đơn hàng có sẵn" style={{ marginBottom: 16 }}>
                        <List
                            dataSource={availableOrders}
                            renderItem={(order) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            type="primary"
                                            onClick={() => handleAcceptOrder(order.id)}
                                            disabled={shipperStatus !== 'ONLINE' || !shipperId}
                                        >
                                            Nhận đơn
                                        </Button>
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={`Đơn #${order.id} - ${order.restaurantName}`}
                                        description={
                                            <div>
                                                <p><strong>Địa chỉ:</strong> {order.shippingAddress}</p>
                                                <Row gutter={16}>
                                                    <Col span={12}>
                                                        <p><strong>Khoảng cách:</strong> <span style={{ color: '#1890ff' }}>{calculateDistance(order)}</span></p>
                                                    </Col>
                                                    <Col span={12}>
                                                        <p><strong>Thời gian ước tính:</strong> <span style={{ color: '#52c41a' }}>{calculateEstimatedTime(order)}</span></p>
                                                    </Col>
                                                </Row>
                                                <p><strong>Tổng tiền:</strong> {formatMoney(order.totalAmount)}</p>
                                                <p><strong>Thanh toán:</strong> <Tag>{order.paymentMethod}</Tag></p>
                                                <p><strong>Thời gian:</strong> {formatDate(order.createdAt)}</p>
                                            </div>
                                        }
                                    />
                                </List.Item>
                            )}
                            locale={{ emptyText: 'Không có đơn hàng nào' }}
                        />
                    </Card>
                </Col>

                {/* Đơn hàng của tôi */}
                {shipperId && (
                    <Col span={12}>
                        <Card title="Đơn hàng của tôi" style={{ marginBottom: 16 }}>
                            <List
                                dataSource={myOrders}
                                renderItem={(order) => (
                                    <List.Item>
                                        <List.Item.Meta
                                            title={
                                                <Space>
                                                    Đơn #{order.id} - {order.restaurantName}
                                                    <Tag color={
                                                        order.status === 'SHIPPING' ? 'blue' :
                                                        order.status === 'COMPLETED' ? 'green' :
                                                        'default'
                                                    }>
                                                        {order.status}
                                                    </Tag>
                                                </Space>
                                            }
                                            description={
                                                <div>
                                                    <p><strong>Địa chỉ:</strong> {order.shippingAddress}</p>
                                                    <Row gutter={16}>
                                                        <Col span={12}>
                                                            <p><strong>Khoảng cách:</strong> <span style={{ color: '#1890ff' }}>{calculateDistance(order)}</span></p>
                                                        </Col>
                                                        <Col span={12}>
                                                            <p><strong>Thời gian ước tính:</strong> <span style={{ color: '#52c41a' }}>{calculateEstimatedTime(order)}</span></p>
                                                        </Col>
                                                    </Row>
                                                    <p><strong>Tổng tiền:</strong> {formatMoney(order.totalAmount)}</p>
                                                    <p><strong>Thanh toán:</strong> <Tag>{order.paymentMethod}</Tag></p>
                                                    <p><strong>Thời gian:</strong> {formatDate(order.createdAt)}</p>
                                                </div>
                                            }
                                        />
                                    </List.Item>
                                )}
                                locale={{ emptyText: 'Bạn chưa có đơn hàng nào' }}
                            />
                        </Card>
                    </Col>
                )}
            </Row>
        </div>
    );
};

export default ShipperDashboard;

