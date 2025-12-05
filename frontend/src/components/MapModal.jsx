import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'antd';
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import useGeolocation from '../utils/useGeolocation';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl:
    'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Di chuyển map đến vị trí mới
const FlyToPosition = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16);
  }, [position, map]);
  return null;
};

// Xử lý click và drag marker
const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click: (e) => setPosition([e.latlng.lat, e.latlng.lng]),
  });

  return (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng();
          setPosition([lat, lng]);
        },
      }}
    />
  );
};

const MapModal = ({ isOpen, onClose, onConfirm }) => {
  const { location, fetchLocation } = useGeolocation();
  // Mặc định là Hà Nội nếu không lấy được vị trí
  const [position, setPosition] = useState([21.0285, 105.8542]);

  useEffect(() => {
    if (isOpen) {
      fetchLocation();
    }
  }, [isOpen]);

  useEffect(() => {
    if (location) {
      setPosition([location.latitude, location.longitude]);
    }
  }, [location]);

  const handleOk = () => {
    onConfirm(position);
  };

  return (
    <Modal
      title="Chọn vị trí quán ăn"
      open={isOpen}
      onCancel={onClose}
      onOk={handleOk}
      width={700}
      okText="Xác nhận vị trí này"
      cancelText="Hủy"
      centered
    >
      <div style={{ height: '400px', width: '100%' }}>
        {isOpen && (
          <MapContainer
            center={position}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FlyToPosition position={position} />
            <LocationMarker position={position} setPosition={setPosition} />
          </MapContainer>
        )}
      </div>
      <div style={{ marginTop: 10, fontStyle: 'italic', color: '#666' }}>
        * Click vào bản đồ hoặc kéo thả ghim để chọn vị trí chính xác.
      </div>
    </Modal>
  );
};

export default MapModal;
