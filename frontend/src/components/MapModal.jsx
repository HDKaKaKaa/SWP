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

// --- HÀM KIỂM TRA TỌA ĐỘ HỢP LỆ ---
const isValidCoordinate = (lat, lng) => {
    const nLat = Number(lat);
    const nLng = Number(lng);
    return Number.isFinite(nLat) && Number.isFinite(nLng);
};

const MapController = ({ centerPosition, isModalOpen }) => {
    const map = useMap();

    // Fix map bị trắng khi mở modal
    useEffect(() => {
        if (isModalOpen) {
            setTimeout(() => {
                map.invalidateSize();
            }, 200);
        }
    }, [isModalOpen, map]);

    // Bay đến vị trí centerPosition nếu hợp lệ
    useEffect(() => {
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
            const { lat, lng } = e.latlng;
            if (isValidCoordinate(lat, lng)) {
                setPosition([lat, lng]);
            }
        },
    });

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

/**
 * MapModal dùng chung:
 * - isOpen: mở/đóng
 * - onClose: đóng modal
 * - onConfirm: trả về [lat, lng]
 * - initialPosition: [lat, lng] ban đầu (nếu có)
 * - title: tiêu đề modal (VD: "Chọn vị trí quán ăn" / "Chọn vị trí giao hàng")
 */
const MapModal = ({
                      isOpen,
                      onClose,
                      onConfirm,
                      initialPosition,
                      title = 'Chọn vị trí trên bản đồ',
                  }) => {
    const { location, fetchLocation } = useGeolocation();

    // Mặc định Hà Nội
    const DEFAULT_POS = [21.0285, 105.8542];

    const getInitialPos = () => {
        // Ưu tiên toạ độ truyền từ props
        if (
            initialPosition &&
            Array.isArray(initialPosition) &&
            isValidCoordinate(initialPosition[0], initialPosition[1])
        ) {
            return [Number(initialPosition[0]), Number(initialPosition[1])];
        }

        // Sau đó mới tới geolocation nếu có
        if (
            location &&
            isValidCoordinate(location.latitude, location.longitude)
        ) {
            return [
                Number(location.latitude),
                Number(location.longitude),
            ];
        }

        return DEFAULT_POS;
    };

    const [position, setPosition] = useState(DEFAULT_POS);
    const [mapCenter, setMapCenter] = useState(DEFAULT_POS);
    const hasCenteredRef = useRef(false);

    useEffect(() => {
        if (isOpen) {
            hasCenteredRef.current = false;

            // Set vị trí ban đầu theo initialPosition hoặc geolocation
            const initPos = getInitialPos();
            setPosition(initPos);
            setMapCenter(initPos);

            // Thử lấy lại vị trí hiện tại (nếu user cho phép)
            fetchLocation();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    // Nếu không có initialPosition, khi có geolocation mới thì cập nhật lại
    useEffect(() => {
        if (
            isOpen &&
            location &&
            !hasCenteredRef.current &&
            !initialPosition
        ) {
            const lat = Number(location.latitude);
            const lng = Number(location.longitude);

            if (isValidCoordinate(lat, lng)) {
                const newPos = [lat, lng];
                setPosition(newPos);
                setMapCenter(newPos);
                hasCenteredRef.current = true;
            }
        }
    }, [location, isOpen, initialPosition]);

    const handleOk = () => {
        let resultPos = position;

        if (!resultPos || !isValidCoordinate(resultPos[0], resultPos[1])) {
            resultPos = DEFAULT_POS;
        }

        if (onConfirm) {
            onConfirm(resultPos);
        }
        if (onClose) {
            onClose();
        }
    };

    return (
        <Modal
            title={title}
            open={isOpen}
            onCancel={onClose}
            onOk={handleOk}
            width={700}
            okText="Xác nhận vị trí này"
            cancelText="Hủy"
            centered
            maskClosable={true}
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
                        <MapController
                            centerPosition={mapCenter}
                            isModalOpen={isOpen}
                        />
                        <LocationMarker
                            position={position}
                            setPosition={setPosition}
                        />
                    </MapContainer>
                )}
            </div>
            <div style={{ marginTop: 10, fontStyle: 'italic', color: '#666' }}>
                * Click vào bản đồ hoặc kéo thả ghim để chọn vị trí chính xác.
                <br />
                Hệ thống sẽ tự lưu tọa độ, bạn không cần quan tâm đến con số.
            </div>
        </Modal>
    );
};

export default MapModal;