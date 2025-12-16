import React, { useEffect, useState, useRef } from 'react';
import { Card, Row, Col, Button, message, Spin, Space, Tag, Select } from 'antd';
import {
    EnvironmentOutlined,
    CarOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import {
    getMyOrders,
    getShipperProfile
} from '../services/shipperService';

const ShipperMap = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [shipperLocation, setShipperLocation] = useState(null);
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
        if (shipperId) {
            fetchData();
            getCurrentLocation();
        }
    }, [shipperId]);

    useEffect(() => {
        if (mapRef.current && shipperLocation) {
            initMap();
        }
    }, [shipperLocation, orders, selectedOrder]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [ordersData, profileData] = await Promise.all([
                getMyOrders(shipperId),
                getShipperProfile(shipperId)
            ]);
            
            // Lấy đơn hàng đang giao (SHIPPING)
            const activeOrders = ordersData.filter(o => o.status === 'SHIPPING');
            setOrders(activeOrders);
            
            // Nếu có orderId trong URL, tự động chọn đơn hàng đó
            const orderIdFromUrl = searchParams.get('orderId');
            if (orderIdFromUrl) {
                const order = activeOrders.find(o => o.id === parseInt(orderIdFromUrl));
                if (order) {
                    setSelectedOrder(order);
                }
            }
            
            // Lấy vị trí shipper từ profile
            if (profileData.currentLat && profileData.currentLong) {
                setShipperLocation({
                    lat: profileData.currentLat,
                    lng: profileData.currentLong
                });
            }
        } catch (error) {
            message.error('Không thể tải dữ liệu bản đồ!');
        } finally {
            setLoading(false);
        }
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setShipperLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.error('Lỗi lấy vị trí:', error);
                    // Dùng vị trí mặc định (Hà Nội)
                    setShipperLocation({ lat: 21.0285, lng: 105.8542 });
                }
            );
        } else {
            // Dùng vị trí mặc định
            setShipperLocation({ lat: 21.0285, lng: 105.8542 });
        }
    };

    const initMap = () => {
        if (!mapRef.current || !shipperLocation) return;

        // Nếu có đơn hàng được chọn, zoom vào vị trí khách hàng
        if (selectedOrder && selectedOrder.shippingLat && selectedOrder.shippingLong) {
            handleSelectOrder(selectedOrder);
            return;
        }

        // Mặc định: hiển thị vị trí shipper
        const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${shipperLocation.lng - 0.1},${shipperLocation.lat - 0.1},${shipperLocation.lng + 0.1},${shipperLocation.lat + 0.1}&layer=mapnik&marker=${shipperLocation.lat},${shipperLocation.lng}`;
        
        // Tạo iframe để hiển thị bản đồ
        if (!mapInstanceRef.current) {
            const iframe = document.createElement('iframe');
            iframe.width = '100%';
            iframe.height = '600px';
            iframe.frameBorder = '0';
            iframe.scrolling = 'no';
            iframe.src = mapUrl;
            mapRef.current.appendChild(iframe);
            mapInstanceRef.current = iframe;
        } else {
            mapInstanceRef.current.src = mapUrl;
        }
    };

    const calculateDistance = (order) => {
        if (!shipperLocation || !order.shippingLat || !order.shippingLong) {
            return 'N/A';
        }
        
        // Công thức Haversine để tính khoảng cách
        const R = 6371; // Bán kính Trái Đất (km)
        const dLat = (order.shippingLat - shipperLocation.lat) * Math.PI / 180;
        const dLon = (order.shippingLong - shipperLocation.lng) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(shipperLocation.lat * Math.PI / 180) * 
            Math.cos(order.shippingLat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        
        return distance.toFixed(2) + ' km';
    };

    const calculateEstimatedTime = (order) => {
        const distance = calculateDistance(order);
        if (distance !== 'N/A') {
            const km = parseFloat(distance);
            const minutes = Math.round(km * 2); // Giả sử tốc độ 30km/h
            return `${minutes} phút`;
        }
        return 'N/A';
    };

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const handleSelectOrder = (order) => {
        setSelectedOrder(order);
        // Zoom vào đúng vị trí khách hàng (địa chỉ giao hàng)
        if (order.shippingLat && order.shippingLong && mapInstanceRef.current) {
            // Tính bounding box để hiển thị cả vị trí shipper và vị trí khách hàng (nếu có)
            let bbox;
            if (shipperLocation && shipperLocation.lat && shipperLocation.lng) {
                // Có cả 2 vị trí: tính bounding box bao phủ cả 2 điểm
                const minLat = Math.min(shipperLocation.lat, order.shippingLat);
                const maxLat = Math.max(shipperLocation.lat, order.shippingLat);
                const minLng = Math.min(shipperLocation.lng, order.shippingLong);
                const maxLng = Math.max(shipperLocation.lng, order.shippingLong);
                // Add padding để map không sát biên
                const padding = 0.01;
                bbox = `${minLng - padding},${minLat - padding},${maxLng + padding},${maxLat + padding}`;
            } else {
                // Chỉ có vị trí khách hàng: zoom vào đó
                const padding = 0.01;
                bbox = `${order.shippingLong - padding},${order.shippingLat - padding},${order.shippingLong + padding},${order.shippingLat + padding}`;
            }
            
            // Tạo URL với marker tại vị trí khách hàng
            const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${order.shippingLat},${order.shippingLong}`;
            mapInstanceRef.current.src = mapUrl;
        } else {
            // Nếu không có tọa độ, hiển thị thông báo
            message.warning('Đơn hàng này chưa có tọa độ địa chỉ giao hàng. Vui lòng cập nhật địa chỉ trong profile để hiển thị trên bản đồ.');
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: 50 }}><Spin size="large" /></div>;
    }

    return (
        <div style={{ padding: 0, margin: 0, width: '100%' }}>
            <Card style={{ margin: 0 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0 }}>
                            <EnvironmentOutlined /> Bản đồ giao hàng
                        </h2>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => {
                                getCurrentLocation();
                                fetchData();
                            }}
                        >
                            Làm mới vị trí
                        </Button>
                    </div>

                    <Row gutter={16}>
                        <Col span={16}>
                            <Card title="Bản đồ" style={{ height: '650px' }}>
                                <div ref={mapRef} style={{ width: '100%', height: '600px' }} />
                                {!shipperLocation && (
                                    <div style={{ textAlign: 'center', padding: '50px' }}>
                                        <Spin size="large" />
                                        <p>Đang tải bản đồ...</p>
                                    </div>
                                )}
                            </Card>
                        </Col>

                        <Col span={8}>
                            <Card title="Đơn hàng đang giao" style={{ maxHeight: '650px', overflowY: 'auto' }}>
                                {orders.length === 0 ? (
                                    <p style={{ textAlign: 'center', color: '#999' }}>
                                        Không có đơn hàng đang giao
                                    </p>
                                ) : (
                                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                        {orders.map((order) => (
                                            <Card
                                                key={order.id}
                                                size="small"
                                                hoverable
                                                onClick={() => handleSelectOrder(order)}
                                                style={{
                                                    cursor: 'pointer',
                                                    border: selectedOrder?.id === order.id ? '2px solid #1890ff' : '1px solid #d9d9d9'
                                                }}
                                            >
                                                <Space direction="vertical" style={{ width: '100%' }} size="small">
                                                    <div>
                                                        <strong>Đơn #{order.id}</strong>
                                                        <Tag color="blue" style={{ marginLeft: 8 }}>
                                                            {order.status}
                                                        </Tag>
                                                    </div>
                                                    <div>
                                                        <CarOutlined /> {order.restaurantName}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                                        📍 {order.shippingAddress}
                                                    </div>
                                                    <Row gutter={8}>
                                                        <Col span={12}>
                                                            <div style={{ fontSize: '12px' }}>
                                                                <strong>Khoảng cách:</strong>
                                                                <div style={{ color: '#1890ff' }}>
                                                                    {calculateDistance(order)}
                                                                </div>
                                                            </div>
                                                        </Col>
                                                        <Col span={12}>
                                                            <div style={{ fontSize: '12px' }}>
                                                                <strong>Thời gian ước tính:</strong>
                                                                <div style={{ color: '#52c41a' }}>
                                                                    {calculateEstimatedTime(order)}
                                                                </div>
                                                            </div>
                                                        </Col>
                                                    </Row>
                                                    <div style={{ fontSize: '12px' }}>
                                                        <strong>Tổng tiền:</strong> {formatMoney(order.totalAmount)}
                                                    </div>
                                                </Space>
                                            </Card>
                                        ))}
                                    </Space>
                                )}
                            </Card>
                        </Col>
                    </Row>

                    {selectedOrder && (
                        <Card title={`Chi tiết đơn hàng #${selectedOrder.id}`} style={{ marginTop: 16 }}>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <p><strong>Nhà hàng:</strong> {selectedOrder.restaurantName}</p>
                                    <p><strong>Địa chỉ giao hàng:</strong> {selectedOrder.shippingAddress}</p>
                                    <p><strong>Khoảng cách:</strong> {calculateDistance(selectedOrder)}</p>
                                    <p><strong>Thời gian ước tính:</strong> {calculateEstimatedTime(selectedOrder)}</p>
                                </Col>
                                <Col span={12}>
                                    <p><strong>Tổng tiền:</strong> {formatMoney(selectedOrder.totalAmount)}</p>
                                    <p><strong>Phương thức thanh toán:</strong> <Tag>{selectedOrder.paymentMethod}</Tag></p>
                                    <p><strong>Trạng thái:</strong> <Tag color="blue">{selectedOrder.status}</Tag></p>
                                    {selectedOrder.note && (
                                        <p><strong>Ghi chú:</strong> {selectedOrder.note}</p>
                                    )}
                                </Col>
                            </Row>
                        </Card>
                    )}
                </Space>
            </Card>
        </div>
    );
};

export default ShipperMap;


