/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useContext, useMemo } from "react";
import axios from "axios";
import { Card, Spinner, Form, Row, Col, Button, Image, Badge, Alert } from "react-bootstrap"; // Thêm Alert
import { FaStore, FaPhoneAlt, FaImage, FaAlignLeft, FaExclamationCircle, FaCloudUploadAlt, FaCheckCircle, FaMapMarkerAlt } from 'react-icons/fa';
import { AuthContext } from "../context/AuthContext";
import { Switch, Select, message } from 'antd';
import { EnvironmentOutlined } from '@ant-design/icons';
import MapModal from '../components/MapModal';

// --- CONFIG & CONSTANTS ---
const API_BASE_URL = "http://localhost:8080/api";
const API_RESTAURANTS_URL = `${API_BASE_URL}/owner/restaurants`;
const UPLOAD_URL = `${API_BASE_URL}/upload/image`;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const SYSTEM_STATUS = {
    ACTIVE: 'ACTIVE', CLOSE: 'CLOSE', PENDING: 'PENDING',
    REJECTED: 'REJECTED', BLOCKED: 'BLOCKED'
};

const styles = {
    thumbnailContainer: {
        position: 'relative', width: '100px', height: '100px',
        borderRadius: '8px', border: '1px solid #dee2e6',
        padding: '3px', backgroundColor: '#fff'
    },
    thumbnailImg: { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '5px' },
    deleteBtn: {
        position: 'absolute', top: '-10px', right: '-10px',
        width: '24px', height: '24px', borderRadius: '50%',
        backgroundColor: '#ff4d4f', color: 'white', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)', zIndex: 10
    },
    mapBox: {
        cursor: 'pointer', backgroundColor: '#f8f9fa',
        border: '1px solid #ced4da', borderRadius: '0.375rem',
        padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center'
    }
};

// --- EDIT FORM COMPONENT ---
const RestaurantEditForm = ({ restaurant, isProcessing, onSave }) => {
    const [formData, setFormData] = useState({
        restaurantName: '', address: '', phone: '', description: '', image: '', licenseImages: []
    });
    const [newLicenseFiles, setNewLicenseFiles] = useState([]);
    const [newImageFile, setNewImageFile] = useState(null);
    const [errors, setErrors] = useState({}); // Lưu trữ lỗi validation
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [coords, setCoords] = useState({ latitude: 0, longitude: 0 });

    useEffect(() => {
        if (restaurant) {
            setFormData({
                restaurantName: restaurant.name || '',
                address: restaurant.address || '',
                phone: restaurant.phone || '',
                description: restaurant.description || '',
                image: restaurant.image || '',
                licenseImages: restaurant.licenseImages || [],
            });
            setCoords({ latitude: restaurant.latitude || 0, longitude: restaurant.longitude || 0 });
            setNewLicenseFiles([]);
            setNewImageFile(null);
            setErrors({});
        }
    }, [restaurant]);

    // Hàm validate tệp tin (Ảnh bìa & Giấy phép)
    const validateFile = (file) => {
        if (!VALID_IMAGE_TYPES.includes(file.type)) {
            message.error(`${file.name} không đúng định dạng (Chỉ nhận JPG/PNG/WebP)`);
            return false;
        }
        if (file.size > MAX_IMAGE_SIZE) {
            message.error(`${file.name} vượt quá 2MB`);
            return false;
        }
        return true;
    };

    const handleFileChange = (e, type) => {
        const files = Array.from(e.target.files);
        
        if (type === 'license') {
            const total = formData.licenseImages.length + newLicenseFiles.length + files.length;
            if (total > 5) return message.error("Tối đa 5 hình ảnh giấy phép!");
            
            const validFiles = files.filter(validateFile);
            const previewFiles = validFiles.map(f => { f.preview = URL.createObjectURL(f); return f; });
            setNewLicenseFiles(prev => [...prev, ...previewFiles]);
        }
        
        if (type === 'cover') {
            const f = files[0];
            if (f && validateFile(f)) {
                f.preview = URL.createObjectURL(f);
                setNewImageFile(f);
            }
        }
    };

    const validateAllFields = () => {
        let newErrors = {};

        // 1. Tên nhà hàng: Phải có chữ
        if (!/[a-zA-ZÀ-ỹ]/.test(formData.restaurantName)) {
            newErrors.restaurantName = "Tên nhà hàng phải chứa ít nhất một chữ cái.";
        }

        // 2. Số điện thoại: Chỉ số, đúng 10 số (theo chuẩn VN)
        if (!/^\d+$/.test(formData.phone)) {
            newErrors.phone = "Số điện thoại chỉ được chứa chữ số.";
        } else if (formData.phone.length !== 10) {
            newErrors.phone = "Số điện thoại phải có đúng 10 chữ số.";
        }

        // 3. Mô tả: Dưới 500 ký tự
        if (formData.description && formData.description.length >= 500) {
            newErrors.description = `Mô tả quá dài (${formData.description.length}/500). Vui lòng viết ngắn lại.`;
        }

        // 4. Địa chỉ: Bắt buộc
        if (!formData.address) {
            newErrors.address = "Vui lòng chọn địa chỉ trên bản đồ.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0; // Trả về true nếu không có lỗi
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateAllFields()) {
            onSave(formData, newImageFile, newLicenseFiles, coords);
        } else {
            message.error("Vui lòng kiểm tra lại thông tin nhập liệu!");
        }
    };

    const removeOldLicense = (idx) => setFormData(p => ({ ...p, licenseImages: p.licenseImages.filter((_, i) => i !== idx) }));
    const removeNewLicense = (idx) => setNewLicenseFiles(p => p.filter((_, i) => i !== idx));

    return (
        <Form onSubmit={handleSubmit}>
            <MapModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} onConfirm={(c) => {
                setCoords({ latitude: c[0], longitude: c[1] });
                setIsMapOpen(false);
                setErrors({...errors, address: null});
                fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${c[0]}&lon=${c[1]}`)
                    .then(r => r.json()).then(d => setFormData(p => ({ ...p, address: d.display_name })));
            }} />

            <Row className="mb-3">
                <Form.Label column sm={3} className="text-md-end fw-bold">Tên nhà hàng</Form.Label>
                <Col sm={9}>
                    <Form.Control 
                        value={formData.restaurantName} 
                        isInvalid={!!errors.restaurantName}
                        onChange={e => setFormData({...formData, restaurantName: e.target.value})} 
                    />
                    <Form.Control.Feedback type="invalid">{errors.restaurantName}</Form.Control.Feedback>
                </Col>
            </Row>

            <Row className="mb-3">
                <Form.Label column sm={3} className="text-md-end fw-bold">Số điện thoại</Form.Label>
                <Col sm={9}>
                    <Form.Control 
                        value={formData.phone} 
                        isInvalid={!!errors.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                    />
                    <Form.Control.Feedback type="invalid">{errors.phone}</Form.Control.Feedback>
                </Col>
            </Row>

            <Row className="mb-3">
                <Form.Label column sm={3} className="text-md-end fw-bold">Địa chỉ</Form.Label>
                <Col sm={9}>
                    <div style={{...styles.mapBox, borderColor: errors.address ? '#dc3545' : '#ced4da'}} onClick={() => setIsMapOpen(true)}>
                        <FaMapMarkerAlt className="text-danger me-2" />
                        <span className="text-truncate">{formData.address || "Chọn địa chỉ trên bản đồ"}</span>
                    </div>
                    {errors.address && <div className="text-danger small mt-1">{errors.address}</div>}
                </Col>
            </Row>

            <Row className="mb-3">
                <Form.Label column sm={3} className="text-md-end fw-bold">Mô tả</Form.Label>
                <Col sm={9}>
                    <Form.Control 
                        as="textarea" rows={3} 
                        value={formData.description} 
                        isInvalid={!!errors.description}
                        onChange={e => setFormData({...formData, description: e.target.value})} 
                    />
                    <div className="d-flex justify-content-between">
                        <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>
                        <small className={formData.description.length >= 500 ? "text-danger" : "text-muted"}>
                            {formData.description.length}/500
                        </small>
                    </div>
                </Col>
            </Row>

            <hr />
            <Row className="mb-3 align-items-center">
                <Form.Label column sm={3} className="text-md-end fw-bold">Ảnh bìa</Form.Label>
                <Col sm={4}><Form.Control type="file" accept="image/*" onChange={e => handleFileChange(e, 'cover')} size="sm" /></Col>
                <Col sm={5}><Image src={newImageFile ? newImageFile.preview : formData.image} height={80} rounded /></Col>
            </Row>

            <Row className="mb-3">
                <Form.Label column sm={3} className="text-md-end fw-bold">Giấy phép ({formData.licenseImages.length + newLicenseFiles.length}/5)</Form.Label>
                <Col sm={9}>
                    {formData.licenseImages.length + newLicenseFiles.length < 5 && (
                        <Form.Control type="file" multiple accept="image/*" onChange={e => handleFileChange(e, 'license')} size="sm" />
                    )}
                    <div className="d-flex flex-wrap gap-3 mt-3">
                        {formData.licenseImages.map((url, i) => (
                            <div key={i} style={styles.thumbnailContainer}>
                                <Image src={url} style={styles.thumbnailImg} />
                                <button type="button" style={styles.deleteBtn} onClick={() => removeOldLicense(i)}>&times;</button>
                            </div>
                        ))}
                        {newLicenseFiles.map((f, i) => (
                            <div key={i} style={{...styles.thumbnailContainer, border: '2px solid #28a745'}}>
                                <Image src={f.preview} style={styles.thumbnailImg} />
                                <button type="button" style={styles.deleteBtn} onClick={() => removeNewLicense(i)}>&times;</button>
                            </div>
                        ))}
                    </div>
                </Col>
            </Row>

            <div className="text-end border-top pt-3 mt-4">
                <Button variant="primary" type="submit" disabled={isProcessing} className="px-5 py-2 fw-bold">
                    {isProcessing ? <Spinner size="sm" /> : <><FaCheckCircle className="me-2"/>LƯU THÔNG TIN</>}
                </Button>
            </div>
        </Form>
    );
};

// --- MAIN COMPONENT (GIỮ NGUYÊN) ---
export default function RestaurantStatusToggle() {
    const { user } = useContext(AuthContext);
    const [allRestaurants, setAllRestaurants] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const restaurant = useMemo(() => allRestaurants.find(r => r.id === selectedId), [allRestaurants, selectedId]);

    const fetchData = useCallback(async () => {
        try {
            const res = await axios.get(API_RESTAURANTS_URL, { params: { accountId: user.id } });
            setAllRestaurants(res.data);
            if (res.data.length > 0) setSelectedId(res.data[0].id);
        } catch (e) { message.error("Lỗi tải dữ liệu"); } finally { setLoading(false); }
    }, [user.id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleUpdateStatus = async (checked) => {
        const status = checked ? SYSTEM_STATUS.ACTIVE : SYSTEM_STATUS.CLOSE;
        setIsProcessing(true);
        try {
            await axios.put(`${API_RESTAURANTS_URL}/${selectedId}/status`, { status }, { params: { accountId: user.id } });
            setAllRestaurants(prev => prev.map(r => r.id === selectedId ? { ...r, status } : r));
            message.success(`Đã ${checked ? 'mở cửa' : 'đóng cửa'} nhà hàng`);
        } catch (e) { message.error("Không thể đổi trạng thái"); } finally { setIsProcessing(false); }
    };

    const handleSave = async (form, cover, licenses, coords) => {
        setIsProcessing(true);
        const hide = message.loading("Đang lưu...", 0);
        try {
            let coverUrl = form.image;
            if (cover) {
                const d = new FormData(); d.append('file', cover);
                const res = await axios.post(UPLOAD_URL, d);
                coverUrl = res.data;
            }

            let licenseUrls = [...form.licenseImages];
            if (licenses.length > 0) {
                const responses = await Promise.all(licenses.map(f => {
                    const d = new FormData(); d.append('file', f);
                    return axios.post(UPLOAD_URL, d);
                }));
                licenseUrls = [...licenseUrls, ...responses.map(r => r.data)];
            }

            const payload = {
                ...form, 
                name: form.restaurantName, // Map lại key cho đúng API nếu cần
                accountId: user.id, coverImageUrl: coverUrl, licenseImages: licenseUrls,
                latitude: coords.latitude, longitude: coords.longitude,
                ownerFullName: restaurant.ownerFullName, idCardNumber: restaurant.idCardNumber
            };

            const res = await axios.put(`${API_RESTAURANTS_URL}/${selectedId}`, payload);
            setAllRestaurants(prev => prev.map(r => r.id === selectedId ? res.data : r));
            message.success("Cập nhật thành công!");
        } catch (e) { 
            console.error(e);
            message.error("Lỗi khi lưu dữ liệu lên máy chủ"); 
        } finally { setIsProcessing(false); hide(); }
    };

    if (loading) return <div className="text-center mt-5"><Spinner animation="border" variant="primary" /></div>;

    return (
        <div className="container py-4">
            <Card className="mb-4 shadow-sm border-0" style={{ borderRadius: '12px' }}>
                <Card.Body className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <h5 className="m-0 fw-bold text-primary"><FaStore /> NHÀ HÀNG:</h5>
                        <Select
                            style={{ width: 250 }}
                            value={selectedId}
                            onChange={setSelectedId}
                            options={allRestaurants.map(r => ({ value: r.id, label: r.name }))}
                        />
                    </div>

                    <div className="d-flex align-items-center gap-3">
                        <span className="fw-bold text-muted">Trạng thái:</span>
                        <Switch
                            checked={restaurant?.status === SYSTEM_STATUS.ACTIVE}
                            onChange={handleUpdateStatus}
                            checkedChildren="MỞ CỬA"
                            unCheckedChildren="ĐÓNG CỬA"
                            disabled={isProcessing || !restaurant || restaurant.status === 'PENDING'}
                            style={{ backgroundColor: restaurant?.status === SYSTEM_STATUS.ACTIVE ? '#52c41a' : '#ff4d4f', width: '110px' }}
                        />
                        {restaurant?.status === 'PENDING' && <Badge bg="warning">Đang chờ duyệt</Badge>}
                    </div>
                </Card.Body>
            </Card>

            <Card className="shadow-sm border-0" style={{ borderRadius: '12px' }}>
                <Card.Body className="p-4">
                    {restaurant ? (
                        <RestaurantEditForm restaurant={restaurant} isProcessing={isProcessing} onSave={handleSave} />
                    ) : (
                        <Alert variant="info">Vui lòng chọn nhà hàng để quản lý</Alert>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
}