import { useContext, useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { getCustomerProfile, updateCustomerProfile } from '../services/customerService';
import {
    Input,
    Button,
    Skeleton,
    Typography,
    message,
    Avatar,
    Tag,
} from 'antd';
import {
    UserOutlined,
    PhoneOutlined,
    MailOutlined,
    EnvironmentOutlined,
} from '@ant-design/icons';

import MapModal from '../components/MapModal';
import '../css/ProfilePage.css';

const { Title, Text } = Typography;

// Regex số điện thoại Việt Nam
const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;

// Regex email đơn giản (FE chỉ check format, unique để backend)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ProfilePage = () => {
    const { user, login } = useContext(AuthContext);
    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: '',
        role: '',
        fullName: '',
        email: '',
        phone: '',
        address: '',
        latitude: '',
        longitude: '',
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [isMapOpen, setIsMapOpen] = useState(false);

    // Tọa độ ban đầu cho MapModal (nếu đã có trong DB)
    const initialPosition = useMemo(() => {
        if (
            form.latitude === '' ||
            form.latitude == null ||
            form.longitude === '' ||
            form.longitude == null
        ) {
            return null;
        }
        const lat = Number(form.latitude);
        const lng = Number(form.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
        return [lat, lng];
    }, [form.latitude, form.longitude]);

    // Lấy profile khi vào trang
    useEffect(() => {
        let effectiveUser = user;

        if (!effectiveUser) {
            const stored = localStorage.getItem('user');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed && parsed.id) {
                        effectiveUser = parsed;
                        login(parsed);
                    }
                } catch (err) {
                    console.error('Lỗi parse user từ localStorage', err);
                }
            }
        }

        if (!effectiveUser) {
            navigate('/login');
            return;
        }

        const accountId = effectiveUser.id;

        const fetchProfile = async () => {
            try {
                const res = await getCustomerProfile(accountId);
                const data = res.data;

                setForm({
                    username: data.username || '',
                    role: data.role || '',
                    fullName: data.fullName || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    latitude: data.latitude ?? '',
                    longitude: data.longitude ?? '',
                });
            } catch (err) {
                console.error(err);
                message.error('Lỗi tải thông tin tài khoản. Vui lòng thử lại.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user, navigate, login]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
        setErrors((prev) => ({
            ...prev,
            [name]: undefined,
        }));
    };

    // Validate cơ bản cho Profile theo rule 2.1 (đã loại toạ độ & đổi mật khẩu)
    const validateForm = () => {
        const newErrors = {};

        // Họ tên: bắt buộc, không toàn space, 3–100 ký tự
        const name = form.fullName ? form.fullName.trim() : '';
        if (!name) {
            newErrors.fullName = 'Vui lòng nhập họ tên.';
        } else if (name.length < 3) {
            newErrors.fullName = 'Họ tên phải từ 3 ký tự trở lên.';
        } else if (name.length > 35) {
            newErrors.fullName = 'Họ tên không được dài quá 35 ký tự.';
        }

        // Số điện thoại: bắt buộc, pattern VN
        const phone = form.phone ? form.phone.trim() : '';
        if (!phone) {
            newErrors.phone = 'Vui lòng nhập số điện thoại.';
        } else if (!phoneRegex.test(phone)) {
            newErrors.phone = 'Số điện thoại không hợp lệ.';
        }

        // Email: nếu có thì phải đúng định dạng
        const email = form.email ? form.email.trim() : '';
        if (email && !emailRegex.test(email)) {
            newErrors.email = 'Email không đúng định dạng.';
        }

        // Địa chỉ: map đảm nhiệm – nhưng FE vẫn phải check đã có address
        const addr = form.address ? form.address.trim() : '';
        if (!addr) {
            newErrors.address =
                'Vui lòng chọn vị trí trên bản đồ để hệ thống lấy địa chỉ.';
        } else if (addr.length < 10) {
            // Cảnh báo địa chỉ quá ngắn (nhưng vẫn cho lưu)
            // Đặt dạng warning nhẹ (message) thay vì chặn lưu hoàn toàn
            message.warning(
                'Địa chỉ có vẻ hơi ngắn, bạn nên kiểm tra lại cho đủ phường/xã, quận/huyện, tỉnh.'
            );
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;

        if (!validateForm()) {
            message.error('Vui lòng kiểm tra lại các thông tin bắt buộc.');
            return;
        }

        setSaving(true);
        try {
            await updateCustomerProfile(user.id, {
                fullName: form.fullName,
                email: form.email,
                phone: form.phone,
                address: form.address,
                latitude: form.latitude !== '' ? Number(form.latitude) : null,
                longitude: form.longitude !== '' ? Number(form.longitude) : null,
            });

            const updatedUser = {
                ...user,
                fullName: form.fullName,
                email: form.email,
                phone: form.phone,
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            login(updatedUser);

            message.success('Cập nhật thông tin thành công');
        } catch (err) {
            console.error(err);
            if (err.response && err.response.data) {
                message.error(err.response.data);
            } else {
                message.error('Có lỗi xảy ra khi lưu. Vui lòng thử lại.');
            }
        } finally {
            setSaving(false);
        }
    };

    // Nhận tọa độ từ MapModal, tự xử lý address (map đảm nhiệm)
    const handleMapConfirm = async (position) => {
        if (!position || position.length !== 2) return;
        const [lat, lng] = position;

        // Cập nhật trước tọa độ
        setForm((prev) => ({
            ...prev,
            latitude: Number(lat.toFixed(6)),
            longitude: Number(lng.toFixed(6)),
        }));
        setIsMapOpen(false);

        // Reverse geocoding để lấy địa chỉ hiển thị
        message.loading({ content: 'Đang lấy địa chỉ từ bản đồ...', key: 'geo' });

        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
            );
            const data = await res.json();

            if (data.display_name) {
                setForm((prev) => ({
                    ...prev,
                    address: data.display_name,
                }));
                setErrors((prev) => ({
                    ...prev,
                    address: undefined,
                }));
                message.success({
                    content: 'Đã cập nhật địa chỉ từ bản đồ!',
                    key: 'geo',
                });
            } else {
                message.warning({
                    content:
                        'Không lấy được tên đường từ bản đồ, vui lòng chọn lại vị trí.',
                    key: 'geo',
                });
            }
        } catch (error) {
            console.error(error);
            message.error({
                content:
                    'Không thể lấy tên đường, vui lòng chọn lại vị trí trên bản đồ.',
                key: 'geo',
            });
        }
    };

    if (loading) {
        return (
            <div className="profile-page">
                <div className="profile-wrapper">
                    <Skeleton active paragraph={{ rows: 6 }} />
                </div>
            </div>
        );
    }

    const displayName = form.fullName || form.username || 'Người dùng';

    return (
        <div className="profile-page">
            <div className="profile-wrapper">
                {/* Header */}
                <div className="profile-header">
                    <div className="profile-header-left">
                        <Title level={3} className="profile-page-title">
                            Tài khoản của bạn
                        </Title>
                        <Text type="secondary" className="profile-page-subtitle">
                            Cập nhật thông tin cá nhân và địa chỉ giao hàng mặc định.
                        </Text>
                    </div>
                    <div className="profile-header-right">
                        <Avatar size={56} icon={<UserOutlined />} />
                        <div className="profile-header-info">
                            <Text strong>{displayName}</Text>
                            <div className="profile-header-tags">
                                {form.role && <Tag color="orange">{form.role}</Tag>}
                                {user && user.id && (
                                    <Tag color="blue">ID: {user.id}</Tag>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Layout 2 cột */}
                <div className="profile-layout">
                    {/* Cột trái: Form chính */}
                    <div className="profile-main">
                        {/* Thông tin đăng nhập */}
                        <section className="profile-section">
                            <div className="profile-section-header">
                                <Title level={5}>Thông tin đăng nhập</Title>
                                <Text type="secondary">
                                    Một số trường được tạo khi đăng ký và không thể thay đổi.
                                </Text>
                            </div>
                            <div className="profile-grid-2">
                                <div className="profile-form-group">
                                    <label>Tên đăng nhập</label>
                                    <Input value={form.username} disabled />
                                </div>
                                <div className="profile-form-group">
                                    <label>Vai trò</label>
                                    <Input value={form.role} disabled />
                                </div>
                            </div>
                        </section>

                        {/* Thông tin cá nhân */}
                        <section className="profile-section">
                            <div className="profile-section-header">
                                <Title level={5}>Thông tin cá nhân</Title>
                            </div>
                            <div className="profile-grid-2">
                                <div className="profile-form-group">
                                    <label>Họ và tên</label>
                                    <Input
                                        name="fullName"
                                        value={form.fullName}
                                        onChange={handleChange}
                                        placeholder="Nhập họ tên đầy đủ"
                                        prefix={<UserOutlined />}
                                    />
                                    {errors.fullName && (
                                        <p className="profile-error-text">{errors.fullName}</p>
                                    )}
                                </div>
                                <div className="profile-form-group">
                                    <label>Số điện thoại</label>
                                    <Input
                                        name="phone"
                                        value={form.phone}
                                        onChange={handleChange}
                                        placeholder="Nhập số điện thoại"
                                        prefix={<PhoneOutlined />}
                                    />
                                    {errors.phone && (
                                        <p className="profile-error-text">{errors.phone}</p>
                                    )}
                                </div>
                            </div>
                            <div className="profile-grid-2">
                                <div className="profile-form-group">
                                    <label>Email</label>
                                    <Input
                                        name="email"
                                        type="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="Nhập email"
                                        prefix={<MailOutlined />}
                                    />
                                    {errors.email && (
                                        <p className="profile-error-text">{errors.email}</p>
                                    )}
                                </div>
                            </div>
                        </section>

                        {/* Địa chỉ & Map – không còn input "Địa chỉ chi tiết", map lo hết */}
                        <section className="profile-section">
                            <div className="profile-section-header">
                                <Title level={5}>Địa chỉ giao hàng</Title>
                                <Text type="secondary">
                                    Chọn vị trí trên bản đồ, hệ thống sẽ tự lấy địa chỉ.
                                </Text>
                            </div>

                            <div className="profile-form-group">
                                <label>Vị trí trên bản đồ</label>
                                <Input
                                    readOnly
                                    onClick={() => setIsMapOpen(true)}
                                    placeholder="Nhấn để chọn vị trí trên bản đồ"
                                    prefix={<EnvironmentOutlined />}
                                    className="profile-map-input"
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: '#fafafa',
                                        borderColor: errors.address ? '#ff4d4f' : undefined,
                                    }}
                                />
                                {errors.address && (
                                    <p className="profile-error-text">{errors.address}</p>
                                )}
                            </div>

                            {form.address && (
                                <div className="profile-address-preview">
                                    <Text strong>Địa chỉ đã lưu:</Text>
                                    <Text className="profile-address-text">
                                        <EnvironmentOutlined style={{ marginRight: 4 }} />
                                        {form.address}
                                    </Text>
                                </div>
                            )}
                        </section>

                        {/* Nút lưu */}
                        <div className="profile-actions">
                            <Button
                                type="primary"
                                size="large"
                                onClick={handleSubmit}
                                loading={saving}
                            >
                                Lưu thay đổi
                            </Button>
                        </div>
                    </div>

                    {/* Cột phải: Tóm tắt */}
                    <aside className="profile-side">
                        <div className="profile-summary-card">
                            <Title level={5}>Tóm tắt tài khoản</Title>
                            <div className="profile-summary-row">
                                <Text type="secondary">Họ tên</Text>
                                <Text strong>{form.fullName || '—'}</Text>
                            </div>
                            <div className="profile-summary-row">
                                <Text type="secondary">Số điện thoại</Text>
                                <Text>
                                    {form.phone ? (
                                        <>
                                            <PhoneOutlined style={{ marginRight: 4 }} />
                                            {form.phone}
                                        </>
                                    ) : (
                                        '—'
                                    )}
                                </Text>
                            </div>
                            <div className="profile-summary-row">
                                <Text type="secondary">Email</Text>
                                <Text>
                                    {form.email ? (
                                        <>
                                            <MailOutlined style={{ marginRight: 4 }} />
                                            {form.email}
                                        </>
                                    ) : (
                                        '—'
                                    )}
                                </Text>
                            </div>
                            <div className="profile-summary-row">
                                <Text type="secondary">Địa chỉ mặc định</Text>
                                <Text>
                                    {form.address ? (
                                        <>
                                            <EnvironmentOutlined style={{ marginRight: 4 }} />
                                            {form.address}
                                        </>
                                    ) : (
                                        'Chưa thiết lập'
                                    )}
                                </Text>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            {/* MapModal: dùng lại MapModal cũ, không show lat/long, map tự xử lý */}
            <MapModal
                isOpen={isMapOpen}
                onClose={() => setIsMapOpen(false)}
                onConfirm={handleMapConfirm}
                initialPosition={initialPosition}
                title="Chọn vị trí giao hàng trên bản đồ"
            />
        </div>
    );
};

export default ProfilePage;