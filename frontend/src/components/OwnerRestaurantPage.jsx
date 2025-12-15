import React, { useState, useEffect, useCallback, useContext } from "react";
import axios from "axios";
import { Card, Spinner, Alert, Form, Row, Col, Button, Image } from "react-bootstrap";
import { FaStore, FaMapMarkerAlt, FaPhoneAlt, FaRegClock, FaImage, FaAlignLeft, FaExclamationCircle } from 'react-icons/fa';
import { AuthContext } from "../context/AuthContext";
import { Switch, Space } from 'antd';

// --- CẤU HÌNH API ---
const API_BASE_URL = "http://localhost:8080/api";
const RESTAURANT_BY_ACCOUNT_URL = `${API_BASE_URL}/owner/byAccount`;
const API_RESTAURANTS_URL = `${API_BASE_URL}/owner/restaurants`;

const SYSTEM_STATUS = {
    ACTIVE: 'ACTIVE',
    CLOSE: 'CLOSE',
    PENDING: 'PENDING',
    REJECTED: 'REJECTED',
    BLOCKED: 'BLOCKED'
};

// Hàm kiểm tra số điện thoại cơ bản
const isValidPhoneNumber = (phone) => {
    // Cho phép 8-15 ký tự số, có thể có dấu cộng ở đầu (+84...)
    return /^\+?\d{10,11}$/.test(phone);
};

// --- ĐỊNH NGHĨA COMPONENT CON BÊN NGOÀI ĐỂ TRÁNH LỖI HOOKS ---
const FormRow = ({
    label,
    children,
    required = false,
    icon = null,
    controlId,
    type = "text",
    formData,
    handleChange,
    isProcessing,
    error,
    validateOnBlur = false
}) => {
    const fieldName = controlId.replace('restaurant', '').toLowerCase();

    const handleBlur = (e) => {
        if (validateOnBlur) {
            handleChange(e, true);
        }
    };

    return (
        <Form.Group as={Row} className="mb-3 align-items-center" controlId={controlId}>
            <Form.Label column sm={3} className="fw-bold text-md-end">
                {icon} {label} {required && <span className="text-danger">*</span>}
            </Form.Label>
            <Col sm={9}>
                {children || (
                    <>
                        <Form.Control
                            type={type}
                            name={fieldName}
                            value={formData[fieldName] || ''}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            required={required}
                            disabled={isProcessing}
                            isInvalid={!!error} // Đánh dấu invalid nếu có lỗi
                        />
                        {error && (
                            <Form.Text className="text-danger">
                                <FaExclamationCircle className="me-1" />{error}
                            </Form.Text>
                        )}
                    </>
                )}
            </Col>
        </Form.Group>
    );
};

// Component con cho phép chỉnh sửa thông tin nhà hàng
const RestaurantEditForm = ({ restaurant, isProcessing, onSave }) => {
    const [formData, setFormData] = useState({
        name: restaurant.name || '',
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        description: restaurant.description || '',
        coverImage: restaurant.coverImage || '',
    });
    const [newImageFile, setNewImageFile] = useState(null);
    const [errors, setErrors] = useState({});
    const [formAlert, setFormAlert] = useState(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData({
            name: restaurant.name || '',
            address: restaurant.address || '',
            phone: restaurant.phone || '',
            description: restaurant.description || '',
            coverImage: restaurant.coverImage || '',
        });
        setNewImageFile(null);
        setErrors({}); // Reset lỗi khi đổi nhà hàng
        setFormAlert(null);
    }, [restaurant]);

    // Hàm kiểm tra form và trả về object lỗi
    const validateForm = (data) => {
        let newErrors = {};

        // 1. Tên nhà hàng (Required, min length)
        if (!data.name.trim() || data.name.trim().length < 5) {
            newErrors.name = "Tên nhà hàng phải có ít nhất 5 ký tự.";
        }

        // 2. Địa chỉ (Required)
        if (!data.address.trim()) {
            newErrors.address = "Địa chỉ nhà hàng không được để trống.";
        }

        // 3. Số điện thoại (Optional, nhưng nếu có thì phải hợp lệ)
        if (data.phone.trim() && !isValidPhoneNumber(data.phone.trim())) {
            newErrors.phone = "Số điện thoại không hợp lệ (Chỉ chứa số, từ 10 đến 11 ký tự).";
        }

        return newErrors;
    };

    const handleChange = (e, validate = false) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (validate || (errors[name] && value.trim())) {
            const updatedData = { ...formData, [name]: value };
            const newErrors = validateForm(updatedData);
            setErrors(prev => ({ ...prev, [name]: newErrors[name] || null }));
        } else if (!value.trim()) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
        setFormAlert(null);
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setNewImageFile(e.target.files[0]);
        }
    };

    const handleSave = (e) => {
        e.preventDefault();

        // Chạy validation cho toàn bộ form
        const newErrors = validateForm(formData);
        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            setFormAlert({
                variant: 'danger',
                message: "Vui lòng kiểm tra lại các trường thông tin bị lỗi."
            });
            return;
        }

        // Nếu hợp lệ, gọi hàm onSave từ component cha
        onSave(formData, newImageFile);
        setFormAlert(null);
    };

    const imageUrl = newImageFile ? URL.createObjectURL(newImageFile) : formData.coverImage;

    return (
        <Form onSubmit={handleSave}>
            <h5 className="fw-bold text-primary mb-4 border-bottom pb-2">
                <FaStore className="me-2" />Chỉnh sửa Thông tin Nhà hàng
            </h5>

            {/* Hiển thị Alert chung cho form nếu có lỗi validation tổng quát */}
            {formAlert && (
                <Alert variant={formAlert.variant} onClose={() => setFormAlert(null)} dismissible>
                    {formAlert.message}
                </Alert>
            )}

            {/* Tên Nhà hàng */}
            <FormRow
                label="Tên Nhà hàng"
                required
                controlId="restaurantName"
                formData={formData}
                handleChange={handleChange}
                isProcessing={isProcessing}
                error={errors.name}
                validateOnBlur={true}
            />

            {/* Điện thoại */}
            <FormRow
                label="Điện thoại"
                controlId="restaurantPhone"
                icon={<FaPhoneAlt className="text-muted" />}
                formData={formData}
                handleChange={handleChange}
                isProcessing={isProcessing}
                error={errors.phone}
                validateOnBlur={true}
            />

            {/* Địa chỉ */}
            <FormRow
                label="Địa chỉ"
                required
                controlId="restaurantAddress"
                icon={<FaMapMarkerAlt className="text-muted" />}
                formData={formData}
                handleChange={handleChange}
                isProcessing={isProcessing}
                error={errors.address}
                validateOnBlur={true}
            />

            {/* Mô tả (Giữ nguyên cấu trúc tùy chỉnh vì là textarea) */}
            <Form.Group as={Row} className="mb-3" controlId="restaurantDescription">
                <Form.Label column sm={3} className="fw-bold text-md-end">
                    Mô tả <FaAlignLeft className="text-muted ms-1" />
                </Form.Label>
                <Col sm={9}>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        disabled={isProcessing}
                    />
                </Col>
            </Form.Group>

            {/* Ảnh Đại diện (Giữ nguyên cấu trúc tùy chỉnh) */}
            <Form.Group as={Row} className="mb-4 pt-3 border-top" controlId="restaurantCoverImage">
                <Form.Label column sm={3} className="fw-bold text-md-end">
                    <FaImage className="text-muted me-1" /> Ảnh Đại diện
                    <p className="text-muted mt-1 mb-0 fw-normal" style={{ fontSize: '0.75rem' }}>
                        (1200x600px)
                    </p>
                </Form.Label>
                <Col sm={5}>
                    <Form.Control
                        type="file"
                        onChange={handleImageChange}
                        accept="image/*"
                        disabled={isProcessing}
                    />
                </Col>
                <Col sm={4} className="text-center">
                    {imageUrl ? (
                        <Image
                            src={imageUrl}
                            fluid
                            rounded
                            style={{ maxHeight: '100px', width: 'auto', objectFit: 'cover' }}
                            alt="Ảnh đại diện nhà hàng"
                        />
                    ) : (
                        <div className="border p-2 text-center text-muted rounded bg-light" style={{ fontSize: '0.8rem' }}>Chưa có ảnh</div>
                    )}
                </Col>
            </Form.Group>

            {/* Vị trí hiển thị trạng thái hệ thống và nút lưu */}
            <div className="d-flex justify-content-between align-items-center pt-3 border-top mt-4">
                <div className="text-muted" style={{ fontSize: '0.9rem' }}>
                    <FaRegClock className="me-1" /> Trạng thái hệ thống:
                    <span className={`badge ms-2 fw-bold ${restaurant.status === SYSTEM_STATUS.ACTIVE ? 'bg-success' :
                        restaurant.status === SYSTEM_STATUS.CLOSE ? 'bg-secondary' :
                            restaurant.status === SYSTEM_STATUS.PENDING ? 'bg-warning' : 'bg-danger'}`}>
                        {restaurant.status}
                    </span>
                </div>
                <Button variant="primary" type="submit" disabled={isProcessing}>
                    {isProcessing ? <Spinner animation="border" size="sm" className="me-2" /> : 'Lưu thông tin'}
                </Button>
            </div>
        </Form>
    );
};

export default function RestaurantStatusToggle() {
    const { user } = useContext(AuthContext);

    const [allRestaurants, setAllRestaurants] = useState([]);
    const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [variant, setVariant] = useState(null);
    const [isProcessingToggle, setIsProcessingToggle] = useState(false);
    const [isProcessingSave, setIsProcessingSave] = useState(false);
    const [currentOwnerId, setCurrentOwnerId] = useState(null);

    const isProcessing = isProcessingToggle || isProcessingSave;

    const selectedRestaurant = allRestaurants.find(r => r.id === selectedRestaurantId);

    const fetchRestaurantData = useCallback(async () => {
        if (!user || !user.id) {
            setLoading(false);
            setMessage("Không tìm thấy thông tin tài khoản người dùng.");
            setVariant('warning');
            return;
        }

        setLoading(true);
        setMessage(null);
        try {
            const ownerIdRes = await axios.get(`${RESTAURANT_BY_ACCOUNT_URL}/${user.id}`);
            const fetchedOwnerId = ownerIdRes.data;
            setCurrentOwnerId(fetchedOwnerId);

            if (fetchedOwnerId) {
                const res = await axios.get(API_RESTAURANTS_URL, {
                    params: { accountId: user.id }
                });

                const restaurants = res.data;

                if (restaurants && restaurants.length > 0) {
                    setAllRestaurants(restaurants);
                    setSelectedRestaurantId(prevId => prevId && restaurants.find(r => r.id === prevId) ? prevId : restaurants[0].id);
                    setMessage(null);
                } else {
                    setAllRestaurants([]);
                    setSelectedRestaurantId(null);
                    setMessage("Bạn chưa có nhà hàng nào. Vui lòng thêm nhà hàng mới.");
                    setVariant('info');
                }
            } else {
                setAllRestaurants([]);
                setSelectedRestaurantId(null);
                setMessage("Không tìm thấy Owner ID cho tài khoản này.");
                setVariant('danger');
            }
        } catch (error) {
            console.error("Lỗi khi tải thông tin nhà hàng:", error.response || error);
            setMessage("Lỗi khi tải thông tin nhà hàng.");
            setVariant('danger');
            setAllRestaurants([]);
            setSelectedRestaurantId(null);
        } finally {
            setLoading(false);
        }
    }, [user]);

    const handleRestaurantChange = (event) => {
        setSelectedRestaurantId(parseInt(event.target.value));
        setMessage(null);
    };

    useEffect(() => {
        fetchRestaurantData();
    }, [fetchRestaurantData]);

    const handleToggleStatus = async (checked) => {
        if (!selectedRestaurant || isProcessing || !currentOwnerId) return;

        if (![SYSTEM_STATUS.ACTIVE, SYSTEM_STATUS.CLOSE].includes(selectedRestaurant.status)) {
            setMessage(`Nhà hàng đang ở trạng thái "${selectedRestaurant.status}". Không thể chuyển đổi Online/Offline.`);
            setVariant('warning');
            return;
        }

        const newStatus = checked ? SYSTEM_STATUS.ACTIVE : SYSTEM_STATUS.CLOSE;
        const statusText = newStatus === SYSTEM_STATUS.ACTIVE ? "ONLINE" : "OFFLINE";
        const actionText = newStatus === SYSTEM_STATUS.ACTIVE ? "mở ONLINE" : "đóng (CLOSE)";

        setIsProcessingToggle(true);
        setMessage(null);

        try {
            await axios.put(
                `${API_RESTAURANTS_URL}/${selectedRestaurant.id}/status`,
                { status: newStatus },
                { params: { accountId: user.id } }
            );

            setAllRestaurants(prev => prev.map(r =>
                r.id === selectedRestaurant.id ? { ...r, status: newStatus } : r
            ));

            setMessage(`Đã ${actionText} nhà hàng "${selectedRestaurant.name}" thành công. Trạng thái mới: ${statusText}`);
            setVariant('success');

        } catch (error) {
            console.error(`Lỗi khi ${actionText} nhà hàng:`, error.response || error);
            const errorMsg = error.response?.data?.message || `Thao tác ${actionText} nhà hàng thất bại.`;
            setMessage(errorMsg);
            setVariant('danger');
            fetchRestaurantData();
        } finally {
            setIsProcessingToggle(false);
        }
    };

    const handleSaveRestaurantDetails = async (formData, newImageFile) => {
        if (isProcessing || !selectedRestaurant || !user || !user.id) return;

        setIsProcessingSave(true);
        setMessage(null);

        // Chuẩn bị FormData để gửi dữ liệu multipart
        const data = new FormData();

        // Thêm các trường thông tin Nhà hàng
        data.append('restaurantName', formData.name);
        data.append('address', formData.address);
        data.append('phone', formData.phone);
        data.append('description', formData.description || '');

        // THÊM CÁC TRƯỜNG BẮT BUỘC CỦA OWNER VÀ ACCOUNTID (backend yêu cầu)
        data.append('accountId', user.id);
        data.append('ownerFullName', selectedRestaurant.ownerName || 'Chủ quán');
        data.append('idCardNumber', selectedRestaurant.ownerIdCard || '000000000000');

        if (newImageFile) {
            data.append('imageFile', newImageFile);
        } else {
            // Gửi URL ảnh cũ nếu không có file mới, để backend giữ lại ảnh cũ
            data.append('coverImageUrl', formData.coverImage || '');
        }

        try {
            const response = await axios.put(
                `${API_RESTAURANTS_URL}/${selectedRestaurant.id}`,
                data,
                {
                    headers: {
                    },
                }
            );

            const updatedRestaurant = response.data;

            // Cập nhật state với dữ liệu mới từ response
            setAllRestaurants(prev => prev.map(r =>
                r.id === selectedRestaurant.id ? updatedRestaurant : r
            ));

            // THÔNG BÁO: Đã cập nhật thành công và status đã chuyển về PENDING 
            setMessage(`Đã cập nhật thông tin nhà hàng "${updatedRestaurant.name}" thành công! Nhà hàng đã được chuyển sang trạng thái PENDING để chờ duyệt lại.`);
            setVariant('success');

        } catch (error) {
            console.error("Lỗi khi cập nhật thông tin:", error.response || error);
            const errorMsg = error.response?.data?.message || `Lỗi khi cập nhật thông tin nhà hàng.`;
            setMessage(errorMsg);
            setVariant('danger');
            fetchRestaurantData();
        } finally {
            setIsProcessingSave(false);
        }
    };
    const isOnline = selectedRestaurant && selectedRestaurant.status === SYSTEM_STATUS.ACTIVE;
    const isFixedStatus = [SYSTEM_STATUS.PENDING, SYSTEM_STATUS.REJECTED, SYSTEM_STATUS.BLOCKED].includes(selectedRestaurant?.status);

    if (loading) {
        return (
            <Card className="p-4 shadow-sm">
                <div className="d-flex align-items-center">
                    <Spinner animation="border" size="sm" className="me-2" />
                    <span>Đang tải thông tin hoạt động của nhà hàng...</span>
                </div>
            </Card>
        );
    }

    if (allRestaurants.length === 0) {
        return <Alert variant={variant || 'info'}>{message || "Không tìm thấy thông tin nhà hàng."}</Alert>;
    }

    if (!selectedRestaurant) {
        return <Alert variant="danger">Lỗi: Không tìm thấy dữ liệu cho Nhà hàng đã chọn.</Alert>;
    }

    return (
        <Row className="g-4">
            {/* Thanh tiêu đề: Dropdown và Switch */}
            <Col xs={12}>
                <Card className="p-3 shadow-sm">
                    <Row className="align-items-center">
                        <Col md={6}>
                            <div className="d-flex align-items-center">
                                <label className="text-muted mb-0 me-3 fw-bold" htmlFor="restaurant-select">
                                    Chọn Nhà hàng:
                                </label>
                                <Form.Select
                                    id="restaurant-select"
                                    value={selectedRestaurantId || ''}
                                    onChange={handleRestaurantChange}
                                    disabled={isProcessing}
                                >
                                    {allRestaurants.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </div>
                        </Col>

                        <Col md={6} className="text-end">
                            <Space align="center" size="middle">
                                <span className="fw-bold text-dark me-2">
                                    <FaRegClock className="me-1" /> ONLINE/OFFLINE:
                                </span>
                                {isProcessingToggle ? (
                                    <Spinner animation="border" size="sm" className="me-3" />
                                ) : (
                                    <Switch
                                        checked={isOnline}
                                        onChange={handleToggleStatus}
                                        checkedChildren="ONLINE"
                                        unCheckedChildren="OFFLINE"
                                        size="default"
                                        disabled={isFixedStatus}
                                    />
                                )}
                            </Space>
                        </Col>
                    </Row>
                </Card>
            </Col>

            {/* Alert nếu nhà hàng ở trạng thái cố định hoặc thông báo lỗi/thành công */}
            <Col xs={12}>
                {isFixedStatus && (
                    <Alert variant="danger" className="mb-0">
                        Nhà hàng {selectedRestaurant.name} đang chờ duyệt lại. Bạn không thể tự chuyển đổi Online/Offline.
                    </Alert>
                )}
                {message && (
                    <Alert variant={variant} onClose={() => setMessage(null)} dismissible className="mb-0">
                        {message}
                    </Alert>
                )}
            </Col>

            {/* Cột Thông tin chi tiết Nhà hàng (Form Chỉnh sửa - Full width) */}
            <Col xs={12}>
                <Card className="p-4 shadow-sm h-100">
                    <RestaurantEditForm
                        restaurant={selectedRestaurant}
                        isProcessing={isProcessing}
                        onSave={handleSaveRestaurantDetails}
                    />
                </Card>
            </Col>
        </Row>
    );
}