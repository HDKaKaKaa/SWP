import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Tag, Avatar, message, Spin, Space, Row, Col } from 'antd';
import { ReloadOutlined, ShopOutlined, UserOutlined, CarOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';

// --- QUAN TRỌNG: PHẢI IMPORT CSS CỦA LEAFLET NẾU KHÔNG MAP SẼ VỠ ---
import 'leaflet/dist/leaflet.css';

import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { getMyOrders, getMapLocations } from '../services/shipperService';

const { Title } = Typography;

// --- CẤU HÌNH ICON ---
// Icon cho Shipper (Màu xanh)
const shipperIcon = L.divIcon({
    className: 'custom-icon-shipper',
    html: `<div style="background-color: #1677ff; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
            <span style="color: white; font-size: 16px;">🛵</span>
           </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
});

// Icon cho Customer (Màu đỏ)
const customerIcon = L.divIcon({
    className: 'custom-icon-customer',
    html: `<div style="background-color: #ff4d4f; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
            <span style="color: white; font-size: 16px;">📍</span>
           </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
});

// Component con để tự động zoom bản đồ bao trọn các điểm
const FitBounds = ({ locations }) => {
    const map = useMap();
    useEffect(() => {
        if (locations.length > 0) {
            const markers = locations.map(loc => [loc.latitude, loc.longitude]);
            const bounds = L.latLngBounds(markers);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [locations, map]);
    return null;
};

const ShipperMap = () => {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const [locations, setLocations] = useState([]);
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(false);
    const [shipperId, setShipperId] = useState(null);

    // Tọa độ mặc định (Hà Nội) phòng khi chưa có dữ liệu
    const defaultCenter = [21.0285, 105.8542];

    useEffect(() => {
        if (user && user.id) {
            setShipperId(user.shipperId || user.id);
        }
    }, [user]);

    useEffect(() => {
        if (shipperId) {
            fetchData();
            // Auto refresh mỗi 30 giây
            const interval = setInterval(fetchData, 30000);
            return () => clearInterval(interval);
        }
    }, [shipperId]);

    useEffect(() => {
        // Nếu có orderId trong URL, tự động chọn đơn hàng đó
        const orderIdFromUrl = searchParams.get('orderId');
        if (orderIdFromUrl && orders.length > 0) {
            const order = orders.find(o => o.id === parseInt(orderIdFromUrl));
            if (order) {
                setSelectedOrder(order);
            }
        }
    }, [searchParams, orders]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Lấy dữ liệu song song
            const [locationsData, ordersData] = await Promise.all([
                getMapLocations(shipperId),
                getMyOrders(shipperId)
            ]);

            // Lọc và validate dữ liệu locations
            if (Array.isArray(locationsData)) {
                const validLocations = locationsData.filter(l =>
                    l.latitude && l.longitude && !isNaN(Number(l.latitude)) && !isNaN(Number(l.longitude))
                );
                setLocations(validLocations);
            } else {
                console.warn("API không trả về danh sách JSON hợp lệ:", locationsData);
            }

            // Lấy đơn hàng đang giao (SHIPPING)
            const activeOrders = ordersData.filter(o => o.status === 'SHIPPING');
            setOrders(activeOrders);
        } catch (error) {
            console.error("Lỗi tải map:", error);
            message.error('Không thể tải dữ liệu bản đồ!');
        } finally {
            setLoading(false);
        }
    };

    const calculateDistance = (order) => {
        const shipperLoc = locations.find(l => l.type === 'SHIPPER');
        if (!shipperLoc || !order.shippingLat || !order.shippingLong) {
            return 'N/A';
        }
        
        // Công thức Haversine để tính khoảng cách
        const R = 6371; // Bán kính Trái Đất (km)
        const dLat = (order.shippingLat - shipperLoc.latitude) * Math.PI / 180;
        const dLon = (order.shippingLong - shipperLoc.longitude) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(shipperLoc.latitude * Math.PI / 180) * 
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
    };

    if (loading && locations.length === 0) {
        return <div style={{ textAlign: 'center', marginTop: 50 }}><Spin size="large" /></div>;
    }

    return (
        <div style={{ padding: 20, height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Card
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={4} style={{ margin: 0 }}>🗺️ Bản đồ Giao hàng</Title>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <Tag color="blue">🛵 Shipper: {locations.filter(l => l.type === 'SHIPPER').length}</Tag>
                            <Tag color="red">📍 Khách hàng: {locations.filter(l => l.type === 'CUSTOMER').length}</Tag>
                            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading} type="primary">
                                Cập nhật
                            </Button>
                        </div>
                    </div>
                }
                bodyStyle={{ padding: 0, height: '600px' }}
            >
                <Row gutter={16} style={{ height: '100%' }}>
                    <Col span={16} style={{ height: '100%' }}>
                        {/* MapContainer bắt buộc phải có height rõ ràng */}
                        <MapContainer
                            center={defaultCenter}
                            zoom={12}
                            style={{ width: '100%', height: '100%' }}
                        >
                            <TileLayer
                                attribution='&copy; OpenStreetMap contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {/* Tự động zoom fit toàn bộ marker */}
                            <FitBounds locations={locations} />

                            {locations.map((loc) => (
                                <Marker
                                    key={`${loc.type}-${loc.id}`}
                                    position={[loc.latitude, loc.longitude]}
                                    icon={loc.type === 'SHIPPER' ? shipperIcon : customerIcon}
                                >
                                    <Popup>
                                        <div style={{ minWidth: 200 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                <Avatar
                                                    shape="square"
                                                    size={40}
                                                    src={loc.image}
                                                    icon={loc.type === 'SHIPPER' ? <CarOutlined /> : <UserOutlined />}
                                                    style={{ backgroundColor: loc.type === 'SHIPPER' ? '#1677ff' : '#ff4d4f' }}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>{loc.name}</div>
                                                    <Tag color={
                                                        loc.status === 'ONLINE' || loc.status === 'SHIPPING'
                                                            ? 'success'
                                                            : 'default'
                                                    }>
                                                        {loc.status}
                                                    </Tag>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 12 }}>📍 {loc.info}</div>
                                            {loc.restaurantName && (
                                                <div style={{ fontSize: 12, marginTop: 5 }}>
                                                    🏠 Nhà hàng: {loc.restaurantName}
                                                </div>
                                            )}
                                            <div style={{ fontSize: 11, color: '#888', marginTop: 5 }}>
                                                Lat: {loc.latitude.toFixed(4)}, Long: {loc.longitude.toFixed(4)}
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </Col>

                    <Col span={8} style={{ height: '100%', overflowY: 'auto' }}>
                        <Card title="Đơn hàng đang giao" style={{ height: '100%' }}>
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
                                                    <ShopOutlined /> {order.restaurantName}
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
            </Card>

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
        </div>
    );
};

export default ShipperMap;
