import React, { useState, useEffect, useRef } from 'react';
import { Modal, Input } from 'antd';
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
                const currentZoom = map.getZoom();
                map.flyTo(centerPosition, currentZoom, {
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

const MapBoundsListener = ({ onBoundsChange }) => {
    const map = useMap();

    useEffect(() => {
        const update = () => {
            const b = map.getBounds();
            onBoundsChange({
                west: b.getWest(),
                north: b.getNorth(),
                east: b.getEast(),
                south: b.getSouth(),
            });
        };

        update();
        map.on('moveend', update);
        return () => map.off('moveend', update);
    }, [map, onBoundsChange]);

    return null;
};

const ZoomControl = ({ position = 'bottomright' }) => {
    const map = useMap();

    useEffect(() => {
        const zoom = L.control.zoom({ position });
        zoom.addTo(map);
        return () => {
            zoom.remove();
        };
    }, [map, position]);

    return null;
};

const LocationMarker = ({ position, setPosition, setMapCenter }) => {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            if (isValidCoordinate(lat, lng)) {
                const newPos = [lat, lng];
                setPosition(newPos);
                setMapCenter(newPos);
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
                        const newPos = [lat, lng];
                        setPosition(newPos);
                        setMapCenter(newPos);
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
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const searchTimerRef = useRef(null);
    const [mapBounds, setMapBounds] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setSearchText('');
            setSearchResults([]);
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

    useEffect(() => {
        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        };
    }, []);

    const normalizeResults = (items) => {
        const out = (items || [])
            .filter((x) => isValidCoordinate(x.lat, x.lon))
            .slice(0, 6);
        return out;
    };

    const searchPhoton = async (query) => {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lang=vi`;
        const res = await fetch(url);
        const data = await res.json();

        const features = data?.features || [];
        const mapped = features.map((f) => {
            const p = f?.properties || {};
            const coords = f?.geometry?.coordinates; // [lon, lat]
            const lon = Number(coords?.[0]);
            const lat = Number(coords?.[1]);

            const nameParts = [
                p.name,
                p.housenumber,
                p.street,
                p.district,
                p.city,
                p.state,
                p.country,
            ].filter(Boolean);

            return {
                place_id: p.osm_id ? `photon_${p.osm_id}` : `photon_${Math.random()}`,
                display_name: nameParts.join(', ') || p.name || 'Unknown',
                lat,
                lon,
            };
        });

        return normalizeResults(mapped);
    };

    const searchNominatimBounded = async (query) => {
        if (!mapBounds) return [];

        const { west, north, east, south } = mapBounds;

        const url =
            `https://nominatim.openstreetmap.org/search?format=jsonv2` +
            `&q=${encodeURIComponent(query)}` +
            `&limit=6` +
            `&countrycodes=vn` +
            `&accept-language=vi` +
            `&addressdetails=1` +
            `&viewbox=${west},${north},${east},${south}` +
            `&bounded=1`;

        const res = await fetch(url);
        const data = await res.json();

        const mapped = (Array.isArray(data) ? data : []).map((r) => ({
            place_id: r.place_id,
            display_name: r.display_name,
            lat: Number(r.lat),
            lon: Number(r.lon),
        }));

        return normalizeResults(mapped);
    };

    const searchNominatimGlobal = async (query) => {
        const url =
            `https://nominatim.openstreetmap.org/search?format=jsonv2` +
            `&q=${encodeURIComponent(query)}` +
            `&limit=6` +
            `&countrycodes=vn` +
            `&accept-language=vi` +
            `&addressdetails=1`;

        const res = await fetch(url);
        const data = await res.json();

        const mapped = (Array.isArray(data) ? data : []).map((r) => ({
            place_id: r.place_id,
            display_name: r.display_name,
            lat: Number(r.lat),
            lon: Number(r.lon),
        }));

        return normalizeResults(mapped);
    };

    const doSearch = async (q) => {
        const query = (q || '').trim();
        if (!query) {
            setSearchResults([]);
            return;
        }

        // gợi ý: bias Việt Nam để tăng độ đúng
        const qVN = query.toLowerCase().includes('việt nam') ? query : `${query}, Việt Nam`;

        try {
            // 1) Photon
            let results = await searchPhoton(qVN);

            // 2) Nominatim bounded theo bounds hiện tại
            if (!results || results.length < 3) {
                const bounded = await searchNominatimBounded(qVN);
                results = [...(results || []), ...(bounded || [])];
            }

            // 3) Nominatim global fallback
            if (!results || results.length < 3) {
                const global = await searchNominatimGlobal(qVN);
                results = [...(results || []), ...(global || [])];
            }

            // dedupe + limit 6
            const seen = new Set();
            const final = [];
            for (const r of results) {
                if (final.length >= 6) break;
                const key = (r.display_name || '').toLowerCase();
                if (!key || seen.has(key)) continue;
                seen.add(key);
                final.push(r);
            }

            setSearchResults(final);
        } catch (err) {
            console.error('Search location error:', err);
            setSearchResults([]);
        }
    };

    const onSearchChange = (e) => {
        const val = e.target.value;
        setSearchText(val);

        // debounce để tránh spam API
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => {
            doSearch(val);
        }, 400);
    };

    const handleSelectResult = (r) => {
        const lat = Number(r?.lat);
        const lng = Number(r?.lon);
        if (!isValidCoordinate(lat, lng)) return;

        const newPos = [lat, lng];
        setPosition(newPos);
        setMapCenter(newPos);

        setSearchText(r.display_name || '');
        setSearchResults([]);
    };

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
            <div style={{ height: '400px', width: '100%', position: 'relative' }}>
                {/* Search overlay */}
                <div
                    style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        right: 12,
                        zIndex: 999,
                    }}
                >
                    <Input
                        value={searchText}
                        onChange={onSearchChange}
                        placeholder="Tìm vị trí (gõ tên đường/phường/quận...)"
                        allowClear
                    />

                    {searchResults.length > 0 && (
                        <div
                            style={{
                                marginTop: 6,
                                background: '#fff',
                                border: '1px solid #eee',
                                borderRadius: 8,
                                maxHeight: 220,
                                overflow: 'auto',
                                boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                            }}
                        >
                            {searchResults.map((r) => (
                                <div
                                    key={r.place_id}
                                    onClick={() => handleSelectResult(r)}
                                    style={{
                                        padding: '10px 12px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #f2f2f2',
                                    }}
                                >
                                    {r.display_name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {isOpen && (
                    <MapContainer
                        center={mapCenter}
                        zoom={13}
                        zoomControl={false}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; Google Maps'
                            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi&gl=VN"
                        />
                        <ZoomControl position="bottomright" />
                        <MapBoundsListener onBoundsChange={setMapBounds} />
                        <MapController
                            centerPosition={mapCenter}
                            isModalOpen={isOpen}
                        />
                        <LocationMarker
                            position={position}
                            setPosition={setPosition}
                            setMapCenter={setMapCenter}
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