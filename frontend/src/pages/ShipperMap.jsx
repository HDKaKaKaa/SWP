import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Tag, Avatar, message, Spin, Space, Row, Col } from 'antd';
import { ReloadOutlined, ShopOutlined, UserOutlined, CarOutlined, HomeOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';

// --- QUAN TRỌNG: PHẢI IMPORT CSS CỦA LEAFLET NẾU KHÔNG MAP SẼ VỠ ---
import 'leaflet/dist/leaflet.css';

import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { getMyOrders, getMapLocations, getAvailableOrders } from '../services/shipperService';

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

// Icon cho Restaurant (Màu cam)
const restaurantIcon = L.divIcon({
    className: 'custom-icon-restaurant',
    html: `<div style="background-color: #fa8c16; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
            <span style="color: white; font-size: 16px;">🏠</span>
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

    // Fetch available order khi có orderId trong URL (chạy độc lập với shipperId)
    useEffect(() => {
        const orderIdFromUrl = searchParams.get('orderId');
        if (orderIdFromUrl) {
            const orderId = parseInt(orderIdFromUrl);
            console.log("🔍 Checking for orderId in URL:", orderId);
            console.log("Current locations:", locations);
            console.log("Current orders:", orders);
            
            // Kiểm tra xem đã có locations cho order này chưa
            const hasOrderLocations = locations.some(loc => loc.orderId === orderId);
            console.log("Has order locations:", hasOrderLocations);
            
            if (!hasOrderLocations) {
                // Tìm trong danh sách đơn hàng đang giao
                const order = orders.find(o => o.id === orderId);
                console.log("Found in orders:", order);
                
                if (!order) {
                    // Nếu không tìm thấy trong đơn hàng đang giao, fetch từ available orders
                    console.log("🚀 Fetching available order for map...");
                    fetchAvailableOrderForMap(orderId);
                }
            } else {
                console.log("✅ Order locations already exist");
            }
        }
    }, [searchParams, locations, orders]);

    // Tự động chọn order khi orders thay đổi
    useEffect(() => {
        const orderIdFromUrl = searchParams.get('orderId');
        if (orderIdFromUrl) {
            const orderId = parseInt(orderIdFromUrl);
            const order = orders.find(o => o.id === orderId);
            if (order) {
                setSelectedOrder(order);
            }
        }
    }, [searchParams, orders]);

    const fetchAvailableOrderForMap = async (orderId) => {
        try {
            console.log("=== Fetching available order for map ===");
            console.log("OrderId:", orderId);
            const availableOrders = await getAvailableOrders();
            console.log("Available orders:", availableOrders);
            const order = availableOrders.find(o => o.id === orderId);
            console.log("Found order:", order);
            console.log("Order shippingLat:", order?.shippingLat);
            console.log("Order shippingLong:", order?.shippingLong);
            console.log("Order restaurantLat:", order?.restaurantLat);
            console.log("Order restaurantLong:", order?.restaurantLong);
            
            if (order) {
                // Tạo locations cho restaurant và customer của đơn hàng này
                const newLocations = [];
                
                // Thêm restaurant location
                if (order.restaurantLat && order.restaurantLong) {
                    const restaurantLoc = {
                        id: `restaurant-${order.id}`,
                        name: order.restaurantName || 'Nhà hàng',
                        type: 'RESTAURANT',
                        latitude: parseFloat(order.restaurantLat),
                        longitude: parseFloat(order.restaurantLong),
                        status: 'ACTIVE',
                        info: order.restaurantName || '',
                        image: null,
                        phone: '',
                        orderId: order.id
                    };
                    newLocations.push(restaurantLoc);
                    console.log("✅ Added restaurant location:", restaurantLoc);
                } else {
                    console.warn("⚠️ Restaurant location missing - restaurantLat:", order.restaurantLat, "restaurantLong:", order.restaurantLong);
                }
                
                // Thêm customer location - QUAN TRỌNG: Phải luôn thêm nếu có tọa độ
                if (order.shippingLat && order.shippingLong) {
                    const customerLoc = {
                        id: `customer-${order.id}`,
                        name: 'Khách hàng',
                        type: 'CUSTOMER',
                        latitude: parseFloat(order.shippingLat),
                        longitude: parseFloat(order.shippingLong),
                        status: 'PREPARING',
                        info: order.shippingAddress || '',
                        image: null,
                        phone: '',
                        orderId: order.id,
                        restaurantName: order.restaurantName || ''
                    };
                    newLocations.push(customerLoc);
                    console.log("✅ Added customer location:", customerLoc);
                } else {
                    console.warn("⚠️ Customer location missing - shippingLat:", order.shippingLat, "shippingLong:", order.shippingLong);
                    // Nếu không có tọa độ trong order, thử lấy từ customer nếu có
                    if (order.customerLat && order.customerLong) {
                        const customerLoc = {
                            id: `customer-${order.id}`,
                            name: 'Khách hàng',
                            type: 'CUSTOMER',
                            latitude: parseFloat(order.customerLat),
                            longitude: parseFloat(order.customerLong),
                            status: 'PREPARING',
                            info: order.shippingAddress || '',
                            image: null,
                            phone: '',
                            orderId: order.id,
                            restaurantName: order.restaurantName || ''
                        };
                        newLocations.push(customerLoc);
                        console.log("✅ Added customer location from customer coordinates:", customerLoc);
                    }
                }
                
                console.log("Total new locations to add:", newLocations.length);
                
                // Thêm vào locations hiện tại - Đảm bảo không bị ghi đè
                setLocations(prev => {
                    console.log("Previous locations count:", prev.length);
                    // Loại bỏ locations cũ của đơn hàng này nếu có (để tránh duplicate)
                    const filtered = prev.filter(loc => {
                        // Giữ lại locations không thuộc đơn hàng này
                        // Và giữ lại locations từ getMapLocations (không có orderId hoặc orderId khác)
                        if (!loc.orderId) return true; // Giữ locations từ getMapLocations (shipper location)
                        if (loc.orderId !== orderId) return true; // Giữ locations từ đơn hàng khác
                        return false; // Loại bỏ locations cũ của đơn hàng này
                    });
                    const updated = [...filtered, ...newLocations];
                    console.log("Updated locations count:", updated.length);
                    console.log("All locations:", updated);
                    // Đảm bảo có customer location
                    const hasCustomer = updated.some(loc => loc.type === 'CUSTOMER' && loc.orderId === orderId);
                    console.log("Has customer location:", hasCustomer);
                    return updated;
                });
                
                // Set selected order với format tương tự
                setSelectedOrder({
                    ...order,
                    status: 'PREPARING',
                    restaurantLat: order.restaurantLat,
                    restaurantLong: order.restaurantLong,
                    shippingLat: order.shippingLat,
                    shippingLong: order.shippingLong
                });
            } else {
                console.warn("❌ Order not found in available orders");
            }
        } catch (error) {
            console.error("❌ Lỗi khi tải đơn hàng available:", error);
            message.error('Không thể tải thông tin đơn hàng!');
        }
    };

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
                
                // Merge với locations hiện tại (giữ lại locations từ available orders)
                setLocations(prev => {
                    // Lấy các locations từ available orders (có orderId và không phải từ getMapLocations)
                    // Đảm bảo giữ lại tất cả locations có orderId (từ available orders)
                    // Đặc biệt là customer locations từ available orders
                    const availableOrderLocations = prev.filter(loc => {
                        // Giữ lại nếu có orderId (từ available orders)
                        if (loc.orderId) {
                            // Kiểm tra xem location này có trong validLocations không (từ getMapLocations)
                            // Nếu không có thì giữ lại (đây là location từ available orders)
                            const existsInValidLocations = validLocations.some(vl => 
                                vl.id === loc.id || (vl.orderId && vl.orderId === loc.orderId && vl.type === loc.type)
                            );
                            return !existsInValidLocations;
                        }
                        return false;
                    });
                    
                    // Merge: locations từ API + locations từ available orders
                    const merged = [...validLocations, ...availableOrderLocations];
                    console.log("Merged locations after fetchData:", merged);
                    console.log("Customer locations count:", merged.filter(l => l.type === 'CUSTOMER').length);
                    return merged;
                });
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
        // Tính khoảng cách từ nhà hàng đến địa chỉ giao hàng (khoảng cách thực tế của đơn hàng)
        if (!order.restaurantLat || !order.restaurantLong || !order.shippingLat || !order.shippingLong) {
            return 'N/A';
        }
        
        // Công thức Haversine để tính khoảng cách
        const R = 6371; // Bán kính Trái Đất (km)
        const dLat = (order.shippingLat - order.restaurantLat) * Math.PI / 180;
        const dLon = (order.shippingLong - order.restaurantLong) * Math.PI / 180;
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(order.restaurantLat * Math.PI / 180) * 
            Math.cos(order.shippingLat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        
        // Hiển thị khoảng cách, nếu < 1km thì hiển thị bằng mét
        if (distance < 1) {
            return (distance * 1000).toFixed(0) + ' m';
        }
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
                            <Tag color="orange">🏠 Nhà hàng: {locations.filter(l => l.type === 'RESTAURANT').length}</Tag>
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
                                attribution='&copy; Google Maps'
                                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi&gl=VN"
                            />

                            {/* Tự động zoom fit toàn bộ marker */}
                            <FitBounds locations={locations} />

                            {locations.filter(loc => 
                                loc.latitude && loc.longitude && 
                                !isNaN(Number(loc.latitude)) && !isNaN(Number(loc.longitude))
                            ).map((loc) => {
                                // Chọn icon dựa trên type
                                let icon;
                                if (loc.type === 'SHIPPER') {
                                    icon = shipperIcon;
                                } else if (loc.type === 'RESTAURANT') {
                                    icon = restaurantIcon;
                                } else {
                                    icon = customerIcon;
                                }
                                
                                // Chọn avatar icon dựa trên type
                                let avatarIcon;
                                let avatarBgColor;
                                if (loc.type === 'SHIPPER') {
                                    avatarIcon = <CarOutlined />;
                                    avatarBgColor = '#1677ff';
                                } else if (loc.type === 'RESTAURANT') {
                                    avatarIcon = <HomeOutlined />;
                                    avatarBgColor = '#fa8c16';
                                } else {
                                    avatarIcon = <UserOutlined />;
                                    avatarBgColor = '#ff4d4f';
                                }
                                
                                return (
                                    <Marker
                                        key={`${loc.type}-${loc.id}`}
                                        position={[loc.latitude, loc.longitude]}
                                        icon={icon}
                                    >
                                        <Popup>
                                            <div style={{ minWidth: 200 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                    <Avatar
                                                        shape="square"
                                                        size={40}
                                                        src={loc.image}
                                                        icon={avatarIcon}
                                                        style={{ backgroundColor: avatarBgColor }}
                                                    />
                                                    <div>
                                                        <div style={{ fontWeight: 'bold' }}>{loc.name}</div>
                                                        <Tag color={
                                                            loc.status === 'ONLINE' || loc.status === 'SHIPPING' || loc.status === 'ACTIVE'
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
                                                {loc.phone && (
                                                    <div style={{ fontSize: 12, marginTop: 5 }}>
                                                        📞 {loc.phone}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: 11, color: '#888', marginTop: 5 }}>
                                                    Lat: {loc.latitude.toFixed(4)}, Long: {loc.longitude.toFixed(4)}
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
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
