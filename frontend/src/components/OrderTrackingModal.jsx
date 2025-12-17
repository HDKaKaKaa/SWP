import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  Avatar,
  Button,
  Spin,
  Tag,
  Descriptions,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  UserOutlined,
  PhoneOutlined,
  CarOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine';
import axios from 'axios';

// --- ICON SETUP (Giống trang đăng ký quán) ---
import iconMarker from 'leaflet/dist/images/marker-icon.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix icon mặc định bị lỗi trong React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetina,
  iconUrl: iconMarker,
  shadowUrl: iconShadow,
});

// Icon riêng cho Shipper, Quán, Khách
const restaurantIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/75/75825.png', // Icon cửa hàng
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const shipperIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/171/171250.png', // Icon xe máy
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

const customerIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/25/25694.png', // Icon người nhận
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

// --- COMPONENT XỬ LÝ MAP ---

// 1. Fix lỗi xám bản đồ khi mở Modal
const MapUpdater = () => {
  const map = useMap();
  useEffect(() => {
    // Đợi 300ms để Modal mở hẳn rồi mới tính toán lại kích thước map
    setTimeout(() => {
      map.invalidateSize();
    }, 300);
  }, [map]);
  return null;
};

// 2. Vẽ đường đi an toàn (Fix lỗi removeLayer null)
const RoutingMachine = ({ start, end, color, onRouteFound }) => {
  const map = useMap();
  const routingControlRef = useRef(null);

  const onRouteFoundRef = useRef(onRouteFound);
  useEffect(() => {
    onRouteFoundRef.current = onRouteFound;
  }, [onRouteFound]);

  useEffect(() => {
    if (!map || !start || !end) return;

    // --- FIX LỖI: Xóa control cũ an toàn ---
    if (routingControlRef.current) {
      try {
        map.removeControl(routingControlRef.current);
      } catch (error) {
        // Kệ nó, lỗi này do Leaflet dọn dẹp không sạch, không ảnh hưởng logic
      }
      routingControlRef.current = null;
    }
    // ---------------------------------------

    const routingControl = L.Routing.control({
      waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
      lineOptions: { styles: [{ color: color, weight: 6, opacity: 0.8 }] },
      routeWhileDragging: false,
      show: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      createMarker: () => null,
    });

    try {
      routingControl.addTo(map);
      routingControlRef.current = routingControl;
    } catch (e) {}

    return () => {
      if (routingControlRef.current && map) {
        try {
          map.removeControl(routingControlRef.current);
        } catch (e) {}
      }
    };
  }, [map, start, end, color]);

  return null;
};

const OrderTrackingModal = ({ isOpen, onClose, order }) => {
  const [shipperInfo, setShipperInfo] = useState(null);
  const [routeInfo, setRouteInfo] = useState({ distance: 0, time: 0 });

  // Lấy thông tin shipper realtime
  const fetchShipperLocation = async () => {
    if (!order?.shipperId) return;
    try {
      // Dùng endpoint public mà bạn đã có trong backend
      const res = await axios.get(
        `http://localhost:8080/api/shipper/public/${order.shipperId}`
      );
      setShipperInfo(res.data);
    } catch (error) {
      console.error('Lỗi lấy vị trí shipper', error);
    }
  };

  useEffect(() => {
    if (isOpen && order?.shipperId) {
      fetchShipperLocation();
      const interval = setInterval(fetchShipperLocation, 10000); // 10s cập nhật 1 lần
      return () => clearInterval(interval);
    }
  }, [isOpen, order]);

  // --- XỬ LÝ TỌA ĐỘ ---
  // Tọa độ khách: fallback về Hà Nội nếu không có
  const customerPos =
    order?.shippingLat && order?.shippingLong
      ? [Number(order.shippingLat), Number(order.shippingLong)]
      : [21.0285, 105.8542];

  // Tọa độ quán: Cần đảm bảo order object truyền vào có restaurant.lat/.long
  // Nếu backend chưa trả về, bạn cần sửa backend hoặc lấy tạm customerPos để test
  const restaurantPos =
    order?.restaurant?.lat && order?.restaurant?.long
      ? [Number(order.restaurant.lat), Number(order.restaurant.long)]
      : null;

  // Tọa độ Shipper
  const shipperPos =
    shipperInfo?.currentLat && shipperInfo?.currentLong
      ? [Number(shipperInfo.currentLat), Number(shipperInfo.currentLong)]
      : null;

  const formatDistance = (m) => {
    if (m >= 1000) return (m / 1000).toFixed(1) + ' km';
    return Math.round(m) + ' m';
  };

  const formatTime = (s) => {
    if (s > 60) return Math.round(s / 60) + ' phút';
    return Math.round(s) + ' giây';
  };

  return (
    <Modal
      title="Theo dõi đơn hàng trực tuyến"
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={1000}
      centered
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ display: 'flex', height: '550px', flexDirection: 'row' }}>
        {/* === CỘT BẢN ĐỒ === */}
        <div style={{ flex: 7, position: 'relative', height: '100%' }}>
          {isOpen && (
            <MapContainer
              center={customerPos}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <MapUpdater /> {/* Kích hoạt fix lỗi xám map */}
              <TileLayer
                attribution="&copy; Google Maps"
                url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
              />
              {/* Marker Khách */}
              <Marker position={customerPos} icon={customerIcon}>
                <Popup>
                  <b>Điểm nhận hàng:</b>
                  <br />
                  {order?.shippingAddress}
                </Popup>
              </Marker>
              {/* Marker Quán + Đường đi (Màu xanh nhạt) */}
              {restaurantPos && (
                <>
                  <Marker position={restaurantPos} icon={restaurantIcon}>
                    <Popup>
                      <b>Nhà hàng:</b>
                      <br />
                      {order?.restaurantName}
                    </Popup>
                  </Marker>
                  <RoutingMachine
                    start={restaurantPos}
                    end={customerPos}
                    color="#99ccff"
                  />
                </>
              )}
              {/* Marker Shipper + Đường đi (Màu xanh đậm) */}
              {shipperPos && (
                <>
                  <Marker
                    position={shipperPos}
                    icon={shipperIcon}
                    zIndexOffset={1000}
                  >
                    <Popup>
                      <b>{shipperInfo.fullName}</b>
                      <br />
                      {shipperInfo.licensePlate}
                    </Popup>
                  </Marker>
                  <RoutingMachine
                    start={shipperPos}
                    end={customerPos}
                    color="#1890ff"
                    onRouteFound={(info) => setRouteInfo(info)}
                  />
                </>
              )}
            </MapContainer>
          )}

          {/* Nút refresh thủ công */}
          <Button
            icon={<ReloadOutlined />}
            style={{ position: 'absolute', top: 10, right: 10, zIndex: 999 }}
            onClick={fetchShipperLocation}
          />
        </div>

        {/* === CỘT THÔNG TIN === */}
        <div
          style={{
            flex: 3,
            padding: '20px',
            borderLeft: '1px solid #f0f0f0',
            overflowY: 'auto',
            backgroundColor: '#fff',
          }}
        >
          <h3 style={{ marginBottom: 20 }}>Trạng thái</h3>

          <div style={{ marginBottom: 20 }}>
            <Tag
              color="blue"
              style={{
                fontSize: '14px',
                padding: '5px 10px',
                width: '100%',
                textAlign: 'center',
              }}
            >
              {order?.status === 'SHIPPING'
                ? 'Tài xế đang giao hàng'
                : order?.status}
            </Tag>
            {routeInfo.distance > 0 && (
              <div
                style={{
                  background: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  padding: '10px',
                  borderRadius: '6px',
                }}
              >
                <Row gutter={16}>
                  <Col
                    span={12}
                    style={{
                      textAlign: 'center',
                      borderRight: '1px solid #d9d9d9',
                    }}
                  >
                    <Statistic
                      title="Khoảng cách"
                      value={formatDistance(routeInfo.distance)}
                      valueStyle={{ fontSize: '16px', color: '#3f8600' }}
                      prefix={<EnvironmentOutlined />}
                    />
                  </Col>
                  <Col span={12} style={{ textAlign: 'center' }}>
                    <Statistic
                      title="Dự kiến"
                      value={formatTime(routeInfo.time)}
                      valueStyle={{ fontSize: '16px', color: '#3f8600' }}
                      prefix={<ClockCircleOutlined />}
                    />
                  </Col>
                </Row>
              </div>
            )}
          </div>

          {shipperInfo ? (
            <div style={{ textAlign: 'center' }}>
              <Avatar
                size={80}
                src={shipperInfo.avatar}
                icon={<UserOutlined />}
                style={{ border: '2px solid #1890ff' }}
              />
              <h4 style={{ marginTop: 10, fontSize: '18px' }}>
                {shipperInfo.fullName}
              </h4>
              <Tag color="green">Đang hoạt động</Tag>

              <Descriptions
                column={1}
                bordered
                size="small"
                style={{ marginTop: 20, textAlign: 'left' }}
              >
                <Descriptions.Item label="SĐT">
                  <PhoneOutlined /> {shipperInfo.phone || 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Xe">
                  <CarOutlined /> {shipperInfo.vehicleType}
                </Descriptions.Item>
                <Descriptions.Item label="Biển số">
                  <Tag color="orange">{shipperInfo.licensePlate}</Tag>
                </Descriptions.Item>
              </Descriptions>

              <Button
                type="primary"
                block
                href={`tel:${shipperInfo.phone}`}
                style={{ marginTop: 20 }}
              >
                <PhoneOutlined /> Gọi tài xế
              </Button>
            </div>
          ) : (
            <div style={{ color: '#999', textAlign: 'center', marginTop: 50 }}>
              {order?.shipperName ? (
                <>
                  <Spin />
                  <p style={{ marginTop: 10 }}>Đang định vị tài xế...</p>
                </>
              ) : (
                <p>Đang tìm tài xế...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OrderTrackingModal;
