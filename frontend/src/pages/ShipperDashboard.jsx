import React, { useEffect, useState, useRef } from 'react';
import { Card, Row, Col, Statistic, Button, Switch, message, Spin, List, Tag, Space } from 'antd';
import {
    ShoppingOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CarOutlined,
    EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
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
    const navigate = useNavigate();
    const [availableOrders, setAvailableOrders] = useState([]);
    const [myOrders, setMyOrders] = useState([]);
    const [shipperStatus, setShipperStatus] = useState('OFFLINE'); // ONLINE, BUSY, OFFLINE
    const [loading, setLoading] = useState(true);
    const [shipperId, setShipperId] = useState(null);
    const [deliveryStartTime, setDeliveryStartTime] = useState(null); // Thời gian bắt đầu giao hàng
    const [elapsedTime, setElapsedTime] = useState(0); // Thời gian đã trôi qua (giây)
    const mapRefs = useRef({}); // Lưu ref cho map của mỗi đơn hàng

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

    // Lọc chỉ lấy đơn hàng đang giao (SHIPPING) để hiển thị trong phần "Đơn hàng của tôi"
    const shippingOrders = (myOrders || []).filter(o => o.status === 'SHIPPING');
    
    // Đếm số đơn hàng theo trạng thái
    const shippingCount = shippingOrders.length;
    const completedCount = (myOrders || []).filter(o => o.status === 'COMPLETED').length;

    // Khởi tạo map cho đơn hàng
    useEffect(() => {
        if (!shippingOrders || shippingOrders.length === 0) {
            return;
        }
        
        // Delay nhỏ để đảm bảo DOM đã được render
        const timer = setTimeout(() => {
            try {
                shippingOrders.forEach((order) => {
                    if (order && order.shippingLat && order.shippingLong) {
                        const mapId = `map-${order.id}`;
                        const mapContainer = document.getElementById(mapId);
                        
                        if (mapContainer && !mapRefs.current[order.id]) {
                            // Tính bounding box
                            const padding = 0.01;
                            const bbox = `${order.shippingLong - padding},${order.shippingLat - padding},${order.shippingLong + padding},${order.shippingLat + padding}`;
                            const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${order.shippingLat},${order.shippingLong}`;
                            
                            const iframe = document.createElement('iframe');
                            iframe.width = '100%';
                            iframe.height = '100%';
                            iframe.frameBorder = '0';
                            iframe.scrolling = 'no';
                            iframe.style.border = 'none';
                            iframe.src = mapUrl;
                            mapContainer.appendChild(iframe);
                            mapRefs.current[order.id] = iframe;
                        }
                    }
                });
            } catch (error) {
                console.error('Lỗi khi khởi tạo map:', error);
            }
        }, 100);

        // Cleanup khi component unmount hoặc orders thay đổi
        return () => {
            clearTimeout(timer);
            Object.keys(mapRefs.current).forEach((orderId) => {
                const mapId = `map-${orderId}`;
                const mapContainer = document.getElementById(mapId);
                if (mapContainer && mapRefs.current[orderId]) {
                    try {
                        mapContainer.removeChild(mapRefs.current[orderId]);
                    } catch (e) {
                        // Ignore errors
                    }
                }
            });
            mapRefs.current = {};
        };
    }, [shippingOrders]);

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
                                        <p style={{ 
                                            margin: '8px 0 0 0', 
                                            fontSize: '16px', 
                                            fontWeight: 'bold', 
                                            color: shippingOrders.some(o => o.isOverdue) ? '#ff4d4f' : '#faad14'
                                        }}>
                                            ⏱️ Thời gian giao hàng: {formatTime(elapsedTime)}
                                            {shippingOrders.some(o => o.isOverdue) && (
                                                <span style={{ marginLeft: '12px', color: '#ff4d4f' }}>
                                                    ⚠️ Đơn hàng đang quá hạn!
                                                </span>
                                            )}
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

                {/* Đơn hàng của tôi - Chỉ hiển thị đơn đang giao (SHIPPING) */}
                {shipperId && (
                    <Col span={12}>
                        <Card title="Đơn hàng của tôi" style={{ marginBottom: 16 }}>
                            {shippingOrders.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                    Bạn chưa có đơn hàng đang giao nào
                                </div>
                            ) : (
                                <List
                                    dataSource={shippingOrders}
                                    renderItem={(order) => (
                                        <List.Item style={{ padding: '16px 0' }}>
                                            <Row gutter={16} style={{ width: '100%' }}>
                                                {/* Map bên trái */}
                                                <Col span={12}>
                                                    <div
                                                        id={`map-${order.id}`}
                                                        style={{
                                                            width: '100%',
                                                            height: '250px',
                                                            borderRadius: '8px',
                                                            overflow: 'hidden',
                                                            border: '1px solid #d9d9d9'
                                                        }}
                                                    />
                                                </Col>
                                                {/* Thông tin đơn hàng bên phải */}
                                                <Col span={12}>
                                                    <div>
                                                        <Space style={{ marginBottom: 8 }}>
                                                            <strong>Đơn #{order.id} - {order.restaurantName}</strong>
                                                            <Tag color={order.isOverdue ? "red" : "blue"}>SHIPPING</Tag>
                                                            {order.isOverdue && (
                                                                <Tag color="red" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                                                    ⚠️ QUÁ HẠN
                                                                </Tag>
                                                            )}
                                                        </Space>
                                                        <div style={{ marginTop: 12 }}>
                                                            <p style={{ margin: '4px 0' }}>
                                                                <strong>Khách hàng:</strong> {order.customerName || 'N/A'}
                                                            </p>
                                                            <p style={{ margin: '4px 0' }}>
                                                                <strong>Địa chỉ:</strong> {order.shippingAddress}
                                                            </p>
                                                            <p style={{ margin: '4px 0' }}>
                                                                <strong>Khoảng cách:</strong> <span style={{ color: '#1890ff' }}>{calculateDistance(order)}</span>
                                                            </p>
                                                            <p style={{ margin: '4px 0' }}>
                                                                <strong>Thời gian ước tính:</strong> <span style={{ color: '#52c41a' }}>{calculateEstimatedTime(order)}</span>
                                                            </p>
                                                            <p style={{ margin: '4px 0' }}>
                                                                <strong>Tổng tiền:</strong> {formatMoney(order.totalAmount)}
                                                            </p>
                                                            <p style={{ margin: '4px 0' }}>
                                                                <strong>Thanh toán:</strong> <Tag>{order.paymentMethod}</Tag>
                                                            </p>
                                                            <div style={{ marginTop: 12 }}>
                                                                <Button
                                                                    type="primary"
                                                                    icon={<EyeOutlined />}
                                                                    onClick={() => navigate(`/shipper/history/${order.id}`)}
                                                                    block
                                                                >
                                                                    Xem chi tiết
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </List.Item>
                                    )}
                                />
                            )}
                        </Card>
                    </Col>
                )}
            </Row>
        </div>
    );
};

export default ShipperDashboard;

