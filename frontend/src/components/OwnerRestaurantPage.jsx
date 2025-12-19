/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useContext, useMemo } from "react";
import axios from "axios";
import { Card, Spinner, Alert, Form, Row, Col, Button, Image } from "react-bootstrap";
import { FaStore, FaMapMarkerAlt, FaPhoneAlt, FaRegClock, FaImage, FaAlignLeft, FaExclamationCircle } from 'react-icons/fa';
import { AuthContext } from "../context/AuthContext";
// Sử dụng Select, Switch, Space từ Ant Design
import { Switch, Space, Select } from 'antd';

// --- CONFIG & CONSTANTS ---
const API_BASE_URL = "http://localhost:8080/api";
const API_RESTAURANTS_URL = `${API_BASE_URL}/owner/restaurants`;
const UPLOAD_URL = "http://localhost:8080/api/upload/image";

const SYSTEM_STATUS = {
    ACTIVE: 'ACTIVE', CLOSE: 'CLOSE', PENDING: 'PENDING',
    REJECTED: 'REJECTED', BLOCKED: 'BLOCKED'
};

// --- HELPERS ---
const isValidPhoneNumber = (phone) => /^\+?\d{10,11}$/.test(phone);

// --- SUB-COMPONENT: FORM ROW (Giữ nguyên) ---
const FormRow = ({ label, children, required, icon, controlId, type = "text", formData, handleChange, isProcessing, error, validateOnBlur }) => {
    const fieldName = controlId.replace('restaurant', '').toLowerCase();
    const handleBlur = (e) => validateOnBlur && handleChange(e, true);

    return (
        <Form.Group as={Row} className="mb-3 align-items-center" controlId={controlId}>
            <Form.Label column sm={3} className="fw-bold text-md-end">
                {icon} {label} {required && <span className="text-danger">*</span>}
            </Form.Label>
            <Col sm={9}>
                {children || (
                    <Form.Control
                        type={type}
                        name={fieldName}
                        value={formData[fieldName] || ''}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        required={required}
                        disabled={isProcessing}
                        isInvalid={!!error}
                    />
                )}
                {error && <Form.Text className="text-danger"><FaExclamationCircle /> {error}</Form.Text>}
            </Col>
        </Form.Group>
    );
};

// --- SUB-COMPONENT: EDIT FORM (Giữ nguyên) ---
const RestaurantEditForm = ({ restaurant, isProcessing, onSave }) => {
    const [formData, setFormData] = useState({ ...restaurant });
    const [newLicenseFiles, setNewLicenseFiles] = useState([]);
    const [newImageFile, setNewImageFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [formAlert, setFormAlert] = useState(null);

    useEffect(() => {
        setFormData({
            name: restaurant.name || '',
            address: restaurant.address || '',
            phone: restaurant.phone || '',
            description: restaurant.description || '',
            image: restaurant.image || '',
            licenseImages: restaurant.licenseImages || [],
        });
        setNewImageFile(null);
        setNewLicenseFiles([]);
        setErrors({});
    }, [restaurant]);

    const validateForm = (data) => {
        let errs = {};
        if (!data.name?.trim() || data.name.trim().length < 5) errs.name = "Tên phải ít nhất 5 ký tự.";
        if (!data.address?.trim()) errs.address = "Địa chỉ không được để trống.";
        if (!isValidPhoneNumber(data.phone)) errs.phone = "Số điện thoại không hợp lệ (10-11 số).";
        return errs;
    };

    const handleChange = (e, validate = false) => {
        const { name, value } = e.target;
        const updated = { ...formData, [name]: value };
        setFormData(updated);
        if (validate) {
            const vErrors = validateForm(updated);
            setErrors(prev => ({ ...prev, [name]: vErrors[name] }));
        }
    };

    const handleFileChange = (e, type) => {
        const files = Array.from(e.target.files);
        const MAX_SIZE = 5 * 1024 * 1024;
        if (files.some(f => f.size > MAX_SIZE)) {
            setFormAlert({ variant: 'danger', message: "File không được vượt quá 5MB." });
            return;
        }
        type === 'cover' ? setNewImageFile(files[0]) : setNewLicenseFiles(prev => [...prev, ...files]);
    };

    return (
        <Form onSubmit={(e) => {
            e.preventDefault();
            const vErrors = validateForm(formData);
            if (Object.keys(vErrors).length > 0) { setErrors(vErrors); return; }
            onSave(formData, newImageFile, newLicenseFiles);
        }}>

            {formAlert && <Alert variant={formAlert.variant} dismissible>{formAlert.message}</Alert>}
            <FormRow label="Tên Nhà hàng" required controlId="restaurantName" formData={formData} handleChange={handleChange} isProcessing={isProcessing} error={errors.name} validateOnBlur />
            <FormRow label="Điện thoại" required controlId="restaurantPhone" icon={<FaPhoneAlt />} formData={formData} handleChange={handleChange} isProcessing={isProcessing} error={errors.phone} validateOnBlur />
            <FormRow label="Địa chỉ" required controlId="restaurantAddress" icon={<FaMapMarkerAlt />} formData={formData} handleChange={handleChange} isProcessing={isProcessing} error={errors.address} validateOnBlur />

            <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3} className="fw-bold text-md-end">Mô tả <FaAlignLeft /></Form.Label>
                <Col sm={9}>
                    <Form.Control as="textarea" rows={3} name="description" value={formData.description} onChange={handleChange} disabled={isProcessing} />
                </Col>
            </Form.Group>

            <Form.Group as={Row} className="mb-4 pt-3 border-top">
                <Form.Label column sm={3} className="fw-bold text-md-end"><FaImage /> Ảnh đại diện</Form.Label>
                <Col sm={5}><Form.Control type="file" onChange={(e) => handleFileChange(e, 'cover')} accept="image/*" disabled={isProcessing} /></Col>
                <Col sm={4}>
                    <Image src={newImageFile ? URL.createObjectURL(newImageFile) : formData.image} fluid rounded style={{ maxHeight: '80px' }} />
                </Col>
            </Form.Group>

            <Form.Group as={Row} className="mb-4 pt-3 border-top">
                <Form.Label column sm={3} className="fw-bold text-md-end">Giấy phép</Form.Label>
                <Col sm={5}>
                    <Form.Control type="file" multiple onChange={(e) => handleFileChange(e, 'license')} accept="image/*" disabled={isProcessing} />
                    <div className="d-flex flex-wrap mt-2 gap-2">
                        {formData.licenseImages.map((url, i) => <Image key={i} src={url} thumbnail style={{ width: '60px' }} />)}
                        {newLicenseFiles.map((f, i) => <Image key={i} src={URL.createObjectURL(f)} thumbnail style={{ width: '60px', border: '2px solid green' }} />)}
                    </div>
                </Col>
            </Form.Group>

            <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                <div className="badge bg-info">{restaurant.status}</div>
                <Button variant="primary" type="submit" disabled={isProcessing}>
                    {isProcessing ? <Spinner size="sm" /> : 'Lưu thay đổi'}
                </Button>
            </div>
        </Form>
    );
};

// --- MAIN COMPONENT ---
export default function RestaurantStatusToggle() {
    const { user } = useContext(AuthContext);
    const [allRestaurants, setAllRestaurants] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [globalMsg, setGlobalMsg] = useState({ text: null, variant: 'info' });
    const [isProcessing, setIsProcessing] = useState(false);

    const selectedRestaurant = useMemo(() => allRestaurants.find(r => r.id === selectedId), [allRestaurants, selectedId]);
    const isOnline = selectedRestaurant?.status === SYSTEM_STATUS.ACTIVE;
    const isFixed = [SYSTEM_STATUS.PENDING, SYSTEM_STATUS.REJECTED, SYSTEM_STATUS.BLOCKED].includes(selectedRestaurant?.status);

    // 1. Fetch Data
    const fetchData = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const res = await axios.get(API_RESTAURANTS_URL, { params: { accountId: user.id } });
            setAllRestaurants(res.data);
            if (res.data.length > 0) setSelectedId(res.data[0].id);
        } catch (err) {
            setGlobalMsg({ text: "Lỗi tải dữ liệu", variant: 'danger' });
        } finally { setLoading(false); }
    }, [user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // 2. Toggle Status Online/Offline
    const handleToggleStatus = async (checked) => {
        const newStatus = checked ? SYSTEM_STATUS.ACTIVE : SYSTEM_STATUS.CLOSE;
        setIsProcessing(true);
        try {
            await axios.put(`${API_RESTAURANTS_URL}/${selectedId}/status`, { status: newStatus }, { params: { accountId: user.id } });
            setAllRestaurants(prev => prev.map(r => r.id === selectedId ? { ...r, status: newStatus } : r));
            setGlobalMsg({ text: "Cập nhật trạng thái thành công", variant: 'success' });
        } catch (err) {
            setGlobalMsg({ text: "Lỗi cập nhật trạng thái", variant: 'danger' });
        } finally { setIsProcessing(false); }
    };

    // 3. Save Details
    const handleSaveDetails = async (formData, newCover, newLicenses) => {
        setIsProcessing(true);
        try {
            let coverUrl = formData.image;
            if (newCover) {
                const data = new FormData(); data.append('file', newCover);
                const res = await axios.post(UPLOAD_URL, data);
                coverUrl = res.data;
            }

            let licenseUrls = [...formData.licenseImages];
            if (newLicenses.length > 0) {
                const uploads = newLicenses.map(file => {
                    const data = new FormData(); data.append('file', file);
                    return axios.post(UPLOAD_URL, data);
                });
                const responses = await Promise.all(uploads);
                licenseUrls = [...licenseUrls, ...responses.map(r => r.data)];
            }

            const finalData = {
                restaurantName: formData.name,
                address: formData.address,
                phone: formData.phone,
                description: formData.description,
                accountId: user.id,
                coverImageUrl: coverUrl,
                licenseImages: licenseUrls,
                ownerFullName: selectedRestaurant.ownerFullName,
                idCardNumber: selectedRestaurant.idCardNumber,
                latitude: selectedRestaurant.latitude || 0,
                longitude: selectedRestaurant.longitude || 0
            };

            const response = await axios.put(`${API_RESTAURANTS_URL}/${selectedId}`, finalData);
            setAllRestaurants(prev => prev.map(r => r.id === selectedId ? response.data : r));
            setGlobalMsg({ text: "Đã lưu thông tin nhà hàng", variant: 'success' });
        } catch (err) {
            setGlobalMsg({ text: "Lỗi khi lưu thông tin", variant: 'danger' });
        } finally { setIsProcessing(false); }
    };

    if (loading) return <Spinner animation="grow" className="d-block mx-auto mt-5" />;

    return (
        <Row className="g-4">
            {globalMsg.text && (
                <Col xs={12}>
                    <Alert variant={globalMsg.variant} dismissible onClose={() => setGlobalMsg({ text: null, variant: 'info' })}>
                        {globalMsg.text}
                    </Alert>
                </Col>
            )}
            <Col xs={12}>
                <Card className="p-3 shadow-sm border-0">
                    <Row className="align-items-center">
                        <h5 className="fw-bold text-primary mb-4 border-bottom pb-2">
                            <FaStore className="me-2" />Thông tin Nhà hàng</h5>
                        <Col md={3} className="text-md-end mb-2 mb-md-0">
                            <span className="fw-bold">Chọn nhà hàng:</span>
                        </Col>
                        <Col md={6}>
                            <Select
                                showSearch
                                style={{ width: '100%' }}
                                placeholder="Nhập tên để tìm kiếm nhà hàng..."
                                value={selectedId}
                                onChange={(value) => setSelectedId(value)}
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={allRestaurants.map(r => ({
                                    value: r.id,
                                    label: r.name
                                }))}
                            />
                        </Col>
                        <Col md={3} className="d-flex justify-content-end">
                            <Space align="center">
                                <Switch
                                    checked={isOnline}
                                    onChange={handleToggleStatus}
                                    disabled={isFixed || isProcessing}
                                    checkedChildren="Mở cửa"
                                    unCheckedChildren="Đóng cửa"
                                    size="large"
                                    style={{
                                        backgroundColor: isOnline ? '#47a717' : '#ff4d4f',
                                    }}
                                />
                            </Space>
                        </Col>
                    </Row>
                </Card>
            </Col>

            

            <Col xs={12}>
                <Card className="p-4 shadow-sm border-0">
                    {selectedRestaurant ? (
                        <RestaurantEditForm
                            restaurant={selectedRestaurant}
                            isProcessing={isProcessing}
                            onSave={handleSaveDetails}
                        />
                    ) : (
                        <div className="text-center py-5 text-muted">Vui lòng chọn một nhà hàng để quản lý.</div>
                    )}
                </Card>
            </Col>
        </Row>
    );
}