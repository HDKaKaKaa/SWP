import React, { useState, useEffect, useRef } from 'react';
import { Modal } from 'antd';
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

// --- XỬ LÝ ICON LEAFLET ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// --- HÀM KIỂM TRA TỌA ĐỘ HỢP LỆ (Quan trọng để tránh lỗi NaN) ---
const isValidCoordinate = (lat, lng) => {
  const isNumber = typeof lat === 'number' && typeof lng === 'number';
  const isNotNaN = !isNaN(lat) && !isNaN(lng);
  return isNumber && isNotNaN;
};

const MapController = ({ centerPosition, isModalOpen }) => {
  const map = useMap();

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }
  }, [isModalOpen, map]);

  useEffect(() => {
    // Chỉ bay nếu tọa độ HỢP LỆ (Fix lỗi Invalid LatLng object)
    if (
      centerPosition &&
      isValidCoordinate(centerPosition[0], centerPosition[1])
    ) {
      try {
        map.flyTo(centerPosition, 16, {
          animate: true,
          duration: 1.5,
        });
      } catch (error) {
        console.error('Lỗi khi di chuyển map:', error);
      }
    }
  }, [centerPosition, map]);

  return null;
};

const LocationMarker = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      if (isValidCoordinate(e.latlng.lat, e.latlng.lng)) {
        setPosition([e.latlng.lat, e.latlng.lng]);
      }
    },
  });

  // Chỉ render Marker nếu vị trí hợp lệ
  if (!position || !isValidCoordinate(position[0], position[1])) return null;

  return (
    <Marker
      position={position}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const { lat, lng } = e.target.getLatLng();
          if (isValidCoordinate(lat, lng)) {
            setPosition([lat, lng]);
          }
        },
      }}
    />
  );
};

const MapModal = ({ isOpen, onClose, onConfirm }) => {
  const { location, fetchLocation } = useGeolocation();

  // Mặc định Hà Nội
  const DEFAULT_POS = [21.0285, 105.8542];

  const [position, setPosition] = useState(DEFAULT_POS);
  const [mapCenter, setMapCenter] = useState(DEFAULT_POS);
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      hasCenteredRef.current = false;
      fetchLocation();
    }
  }, [isOpen]);

  useEffect(() => {
    // Kiểm tra kỹ location trước khi set state để tránh NaN
    if (isOpen && location && !hasCenteredRef.current) {
      const lat = parseFloat(location.latitude);
      const lng = parseFloat(location.longitude);

      if (isValidCoordinate(lat, lng)) {
        const newPos = [lat, lng];
        setPosition(newPos);
        setMapCenter(newPos);
        hasCenteredRef.current = true;
      }
    }
  }, [location, isOpen]);

  const handleOk = () => {
    // Nếu position lỗi thì trả về mặc định hoặc null
    if (position && isValidCoordinate(position[0], position[1])) {
      onConfirm(position);
    } else {
      onConfirm(DEFAULT_POS);
    }
    onClose();
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
      // Sửa warning: destroyOnClose -> destroyOnHidden (tùy version antd)
      destroyOnHidden={true}
      maskClosable={false} // Ngăn đóng khi click ra ngoài để tránh lỗi ngầm
    >
      <div style={{ height: '400px', width: '100%' }}>
        {isOpen && (
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController centerPosition={mapCenter} isModalOpen={isOpen} />
            <LocationMarker position={position} setPosition={setPosition} />
          </MapContainer>
        )}
      </div>
      <div style={{ marginTop: 10, fontStyle: 'italic', color: '#666' }}>
        * Click vào bản đồ hoặc kéo thả ghim để chọn vị trí chính xác.
        <br />
        Tọa độ:{' '}
        {position && isValidCoordinate(position[0], position[1])
          ? `${position[0].toFixed(4)}, ${position[1].toFixed(4)}`
          : 'Đang xác định...'}
      </div>
    </Modal>
  );
};

export default MapModal;
