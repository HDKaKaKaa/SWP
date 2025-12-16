import React, { useEffect, useState, useRef } from 'react';
import { Modal, Card, Descriptions, Avatar, Tag, Spin, Button } from 'antd';
import {
  UserOutlined,
  CarOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import 'leaflet-routing-machine';
import axios from 'axios';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const shipperIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/171/171250.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

const customerIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/25/25694.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -35],
});

const MapInvalidator = () => {
  const map = useMap();
  useEffect(() => {
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    return () => clearTimeout(timeout);
  }, [map]);
  return null;
};

// Component vẽ đường đi
const RoutingMachine = ({ start, end }) => {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!map || !start || !end) return;

    // Xóa control cũ nếu tồn tại
    if (routingControlRef.current) {
      try {
        map.removeControl(routingControlRef.current);
      } catch (e) {
        // Bỏ qua lỗi nếu map đã bị hủy
      }
      routingControlRef.current = null;
    }

    const routingControl = L.Routing.control({
      waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
      // ... các config giữ nguyên ...
      routeWhileDragging: false,
      show: false,
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: true,
      lineOptions: { styles: [{ color: '#1890ff', weight: 5, opacity: 0.7 }] },
      createMarker: () => null,
    });

    try {
      routingControl.addTo(map);
      routingControlRef.current = routingControl;
    } catch (e) {
      console.error('Lỗi thêm routing control:', e);
    }

    // Cleanup function
    return () => {
      if (routingControlRef.current && map) {
        try {
          // Kiểm tra map còn tồn tại container không trước khi remove
          // (Một cách an toàn hơn là kiểm tra map._leaflet_id hoặc tương tự,
          // nhưng try-catch là cách đơn giản nhất để tránh crash)
          map.removeControl(routingControlRef.current);
        } catch (e) {
          console.warn(
            'Lỗi khi remove routing control (có thể map đã unmount):',
            e
          );
        }
        routingControlRef.current = null;
      }
    };
  }, [map, start, end]); // Dependency array chuẩn

  return null;
};

const OrderTrackingModal = ({ isOpen, onClose, order }) => {
  const [shipperInfo, setShipperInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchShipperLocation = async () => {
    if (!order?.shipperId) return;
    try {
      const res = await axios.get(
        `http://localhost:8080/api/shipper/public/${order.shipperId}`
      );
      setShipperInfo(res.data);
    } catch (error) {
      console.error('Lỗi lấy thông tin shipper', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && order?.shipperId) {
      setLoading(true);
      fetchShipperLocation();

      // Polling vị trí mỗi 10s
      const interval = setInterval(fetchShipperLocation, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen, order]);

  // Tọa độ khách
  const customerPos = [
    order?.shippingLat || 21.0285,
    order?.shippingLong || 105.8542,
  ];

  // Tọa độ Shipper
  const shipperPos =
    shipperInfo?.currentLat && shipperInfo?.currentLong
      ? [shipperInfo.currentLat, shipperInfo.currentLong]
      : null;

  return (
    <Modal
      title="Theo dõi đơn hàng & Tài xế"
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
      ]}
      width={900}
      centered
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ display: 'flex', height: '500px' }}>
        {/* Map */}
        <div style={{ flex: 2, position: 'relative' }}>
          <MapContainer
            center={customerPos}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <MapInvalidator />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {/* Marker Khách */}
            <Marker position={customerPos} icon={customerIcon}>
              <Popup>Điểm nhận hàng: {order?.shippingAddress}</Popup>
            </Marker>

            {/* Marker Shipper + Đường đi */}
            {shipperPos && (
              <>
                <Marker position={shipperPos} icon={shipperIcon}>
                  <Popup>
                    <b>{shipperInfo.fullName}</b>
                    <br />
                    Đang di chuyển...
                  </Popup>
                </Marker>
                <RoutingMachine start={shipperPos} end={customerPos} />
              </>
            )}
          </MapContainer>

          {/* Nút refresh thủ công trên map */}
          <Button
            icon={<ReloadOutlined />}
            style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}
            onClick={fetchShipperLocation}
          />
        </div>

        {/* Thông tin Shipper */}
        <div
          style={{
            flex: 1,
            padding: '20px',
            borderLeft: '1px solid #f0f0f0',
            overflowY: 'auto',
          }}
        >
          {loading && !shipperInfo ? (
            <Spin />
          ) : shipperInfo ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 15,
              }}
            >
              <Avatar
                size={80}
                src={shipperInfo.avatar}
                icon={<UserOutlined />}
              />
              <h3 style={{ margin: 0 }}>{shipperInfo.fullName}</h3>
              <Tag color={shipperInfo.status === 'BUSY' ? 'orange' : 'green'}>
                {shipperInfo.status === 'BUSY' ? 'Đang giao hàng' : 'Sẵn sàng'}
              </Tag>

              <div style={{ width: '100%', marginTop: 20 }}>
                <Descriptions
                  title="Chi tiết phương tiện"
                  column={1}
                  size="small"
                  bordered
                >
                  <Descriptions.Item label="SĐT">
                    <PhoneOutlined /> {shipperInfo.phone || 'N/A'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Loại xe">
                    <CarOutlined /> {shipperInfo.vehicleType || 'Xe máy'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Biển số">
                    <Tag color="blue" icon={<SafetyCertificateOutlined />}>
                      {shipperInfo.licensePlate || 'N/A'}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#999', marginTop: 50 }}>
              Chưa có thông tin tài xế
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OrderTrackingModal;
