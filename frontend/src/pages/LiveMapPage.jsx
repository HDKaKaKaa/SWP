import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Tag, Avatar, message } from 'antd';
import { ReloadOutlined, ShopOutlined, UserOutlined } from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';

// --- QUAN TRỌNG: PHẢI IMPORT CSS CỦA LEAFLET NẾU KHÔNG MAP SẼ VỠ ---
import 'leaflet/dist/leaflet.css';

const { Title } = Typography;
const API_URL = 'http://localhost:8080/api/admin/map/locations';

// --- CẤU HÌNH ICON (Tận dụng logic Leaflet giống MapModal của bạn) ---
// Tạo icon riêng cho Nhà hàng (Màu đỏ)
const restaurantIcon = L.divIcon({
    className: 'custom-icon-restaurant',
    html: `<div style="background-color: #ff4d4f; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
            <span style="color: white; font-size: 16px;">🏠</span>
           </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
});

// Tạo icon riêng cho Shipper (Màu xanh)
const shipperIcon = L.divIcon({
    className: 'custom-icon-shipper',
    html: `<div style="background-color: #1677ff; width: 30px; height: 30px; border-radius: 50%; border: 2px solid white; display: flex; justify-content: center; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
            <span style="color: white; font-size: 16px;">🛵</span>
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

const LiveMapPage = () => {
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);

    // Tọa độ mặc định (Hà Nội) phòng khi chưa có dữ liệu
    const defaultCenter = [21.0285, 105.8542];

    useEffect(() => {
        fetchLocations();
        const interval = setInterval(fetchLocations, 30000); // 30s refresh 1 lần
        return () => clearInterval(interval);
    }, []);

    const fetchLocations = async () => {
        setLoading(true);
        try {
            const response = await axios.get(API_URL);

            // --- KIỂM TRA DỮ LIỆU TRƯỚC KHI DÙNG ---
            // Chỉ xử lý nếu response.data thực sự là một Mảng (Array)
            if (Array.isArray(response.data)) {
                const validData = response.data.filter(l =>
                    l.latitude && l.longitude && !isNaN(Number(l.latitude)) && !isNaN(Number(l.longitude))
                );
                setLocations(validData);
            } else {
                console.warn("API không trả về danh sách JSON hợp lệ:", response.data);
                // Có thể API đang trả về HTML lỗi hoặc trang login
            }
        } catch (error) {
            console.error("Lỗi tải map:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 20, height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Card
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={4} style={{ margin: 0 }}>🗺️ Bản đồ Hoạt động</Title>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <Tag color="red">🏠 Nhà hàng: {locations.filter(l => l.type === 'RESTAURANT').length}</Tag>
                            <Tag color="blue">🛵 Shipper: {locations.filter(l => l.type === 'SHIPPER').length}</Tag>
                            <Button icon={<ReloadOutlined />} onClick={fetchLocations} loading={loading} type="primary">Cập nhật</Button>
                        </div>
                    </div>
                }
                // --- QUAN TRỌNG: Set chiều cao cứng ở đây để Map không bị ẩn ---
                bodyStyle={{ padding: 0, height: '600px' }}
            >
                {/* MapContainer bắt buộc phải có height rõ ràng */}
                <MapContainer
                    center={defaultCenter}
                    zoom={12}
                    style={{ width: '100%', height: '100%' }} // Height 100% ăn theo bodyStyle của Card
                >
                    <TileLayer
                        attribution='&copy; Google Maps'
                        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi&gl=VN"
                    />

                    {/* Tự động zoom fit toàn bộ marker */}
                    <FitBounds locations={locations} />

                    {locations.map((loc) => (
                        <Marker
                            key={`${loc.type}-${loc.id}`}
                            position={[loc.latitude, loc.longitude]}
                            icon={loc.type === 'RESTAURANT' ? restaurantIcon : shipperIcon}
                        >
                            <Popup>
                                <div style={{ minWidth: 200 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                        <Avatar
                                            shape="square"
                                            size={40}
                                            src={loc.image}
                                            icon={loc.type === 'RESTAURANT' ? <ShopOutlined /> : <UserOutlined />}
                                            style={{ backgroundColor: loc.type === 'RESTAURANT' ? '#ff4d4f' : '#1677ff' }}
                                        />
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{loc.name}</div>
                                            {/* LOGIC MỚI: Đổi màu tag dựa theo trạng thái */}
                                            <Tag color={
                                                loc.status === 'ACTIVE' || loc.status === 'ONLINE'
                                                    ? 'success' // Màu xanh lá
                                                    : 'default' // Màu xám (cho CLOSE/BLOCKED)
                                            }>
                                                {loc.status}
                                            </Tag>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 12 }}>📍 {loc.info}</div>
                                    <div style={{ fontSize: 11, color: '#888', marginTop: 5 }}>
                                        Lat: {loc.latitude.toFixed(4)}, Long: {loc.longitude.toFixed(4)}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </Card>
        </div>
    );
};

export default LiveMapPage;