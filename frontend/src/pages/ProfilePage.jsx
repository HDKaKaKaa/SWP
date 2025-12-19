import { useContext, useEffect, useState, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContext } from '../context/AuthContext';
import { getCustomerProfile, updateCustomerProfile } from '../services/customerService';
import { uploadImage } from '../services/categoryService';
import {
    Input,
    Button,
    Skeleton,
    Typography,
    message,
    Avatar,
    Tag,
    Upload,
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
    const location = useLocation();
    const fileInputRef = useRef(null);
    const debounceRef = useRef(null);

    const returnInfo = location.state?.returnTo || null;

    const [form, setForm] = useState({
        username: '',
        role: '',
        fullName: '',
        email: '',
        phone: '',
        image: '',
        address: '',
        latitude: '',
        longitude: '',
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState('');
    const [avatarCloudUrl, setAvatarCloudUrl] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const safeFullName = (form.fullName || '').trim();
    const safePhone = (form.phone || '').trim();
    const safeEmail = (form.email || '').trim();

    // ===== Validate/sanitize textbox (giống style ở CustomerIssueCreate) =====
    const PROFILE_LIMITS = {
        fullName: 25,
        phone: 10,
        email: 100,
    };

    const sanitizeByField = (name, value) => {
        const v = String(value ?? '');
        if (name === 'phone') {
            // chỉ cho số, cho phép rỗng để user xoá rồi nhập lại
            return v.replace(/\D/g, '').slice(0, PROFILE_LIMITS.phone);
        }
        if (name === 'fullName') return v.slice(0, PROFILE_LIMITS.fullName);
        if (name === 'email') return v.slice(0, PROFILE_LIMITS.email);
        return v;
    };

    const validateField = (name, value) => {
        setErrors((prev) => {
            const nextErrors = { ...prev };

            if (name === 'fullName') {
                const val = (value || '').trim();
                if (!val) nextErrors.fullName = 'Vui lòng nhập họ tên.';
                else if (val.length < 3) nextErrors.fullName = 'Họ tên phải từ 3 ký tự trở lên.';
                else if (val.length > PROFILE_LIMITS.fullName)
                    nextErrors.fullName = `Họ tên không được dài quá ${PROFILE_LIMITS.fullName} ký tự.`;
                else nextErrors.fullName = undefined;
            }

            if (name === 'phone') {
                const val = (value || '').trim();
                if (!val) nextErrors.phone = 'Vui lòng nhập số điện thoại.';
                else if (!phoneRegex.test(val)) nextErrors.phone = 'Số điện thoại không hợp lệ.';
                else nextErrors.phone = undefined;
            }

            if (name === 'email') {
                const val = (value || '').trim();
                if (!val) nextErrors.email = undefined;
                else if (val.length > PROFILE_LIMITS.email)
                    nextErrors.email = `Email không được dài quá ${PROFILE_LIMITS.email} ký tự.`;
                else if (!emailRegex.test(val)) nextErrors.email = 'Email không đúng định dạng.';
                else nextErrors.email = undefined;
            }

            return nextErrors;
        });
    };


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

    // lưu returnTo vào sessionStorage để dùng sau refresh
    useEffect(() => {
        if (returnInfo?.path) {
            sessionStorage.setItem("profile_returnTo", JSON.stringify(returnInfo));
        }
    }, [returnInfo]);

    const isAllowedReturnPath = (path) => {
        if (!path) return false;

        if (path === '/') return true;
        if (path === '/cart') return true;

        // match /restaurant/{id}
        return !!path.startsWith('/restaurant/');
    };

    const handleBack = () => {
        const saved = (() => {
            try {
                return JSON.parse(sessionStorage.getItem("profile_returnTo") || "null");
            } catch {
                return null;
            }
        })();

        const candidate = returnInfo?.path
            ? returnInfo
            : saved;

        if (candidate?.path && isAllowedReturnPath(candidate.path)) {
            navigate(candidate.path, { state: candidate.state });
        } else {
            navigate('/'); // fallback tuyệt đối
        }
    };


    // Nếu user refresh ở Profile rồi bấm nút Back của browser/mouse button 4
    // thì history có thể không còn state -> ta chủ động điều hướng về returnTo đã lưu
    useEffect(() => {
        const onPopState = () => {
            const saved = (() => {
                try {
                    return JSON.parse(sessionStorage.getItem("profile_returnTo") || "null");
                } catch {
                    return null;
                }
            })();

            if (saved?.path && isAllowedReturnPath(saved.path)) {
                navigate(saved.path, { state: saved.state, replace: true });
            } else {
                navigate('/', { replace: true });
            }
        };

        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, [navigate]);

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
                const data = await getCustomerProfile(accountId);

                setForm({
                    username: data.username || '',
                    role: data.role || '',
                    fullName: data.fullName || '',
                    email: data.email || '',
                    phone: data.phone || '',
                    image: data.image || JSON.parse(localStorage.getItem('user') || '{}')?.image || '',
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
        const nextValue = sanitizeByField(name, value);

        setForm((prev) => ({
            ...prev,
            [name]: nextValue,
        }));

        // clear error khi user bắt đầu sửa
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
        } else if (name.length > 25) {
            newErrors.fullName = 'Họ tên không được dài quá 25 ký tự.';
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

    const searchPlace = async (q) => {
        const query = (q || '').trim();
        if (!query) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=6`
            );
            const data = await res.json();
            setSearchResults(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            searchPlace(searchText);
        }, 350);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchText]);

    const beforeAvatarUpload = (file) => {
        const isImg = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
        if (!isImg) {
            message.error('Chỉ hỗ trợ ảnh JPG/PNG/WEBP!');
            return Upload.LIST_IGNORE;
        }
        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('Dung lượng ảnh phải nhỏ hơn 5MB!');
            return Upload.LIST_IGNORE;
        }
        return true;
    };

    const handlePickAvatar = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarFileSelected = async (e) => {
        const f = e.target.files?.[0];
        // reset input để chọn lại cùng 1 file vẫn trigger change
        e.target.value = '';
        if (!f) return;

        const ok = beforeAvatarUpload(f);
        if (ok !== true) return;

        // preview local ngay
        const localUrl = URL.createObjectURL(f);
        setAvatarPreview(localUrl);

        try {
            setUploadingAvatar(true);
            message.loading({ content: 'Đang tải ảnh...', key: 'avatar' });

            const res = await uploadImage(f);
            const cloudUrl =
                typeof res === 'string'
                    ? res
                    : (res?.imageUrl || res?.url || res?.secure_url || '');

            if (!cloudUrl) {
                message.error({ content: 'Không nhận được link ảnh từ server.', key: 'avatar' });
                return;
            }

            setAvatarCloudUrl(cloudUrl);
            setForm((prev) => ({ ...prev, image: cloudUrl }));

            message.success({ content: 'Tải ảnh thành công!', key: 'avatar' });
        } catch (err) {
            console.error(err);
            message.error({ content: 'Tải ảnh thất bại. Vui lòng thử lại.', key: 'avatar' });
        } finally {
            setUploadingAvatar(false);
            setTimeout(() => URL.revokeObjectURL(localUrl), 3000);
        }
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
                fullName: safeFullName,
                email: safeEmail || null,
                phone: safePhone,
                image: avatarCloudUrl || form.image || null,
                address: form.address,
                latitude: form.latitude !== '' ? Number(form.latitude) : null,
                longitude: form.longitude !== '' ? Number(form.longitude) : null,
            });

            const updatedUser = {
                ...user,
                fullName: form.fullName,
                email: form.email,
                phone: form.phone,
                image: form.image,
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
            <div className="profile-modern-page-container">
                <div className="profile-modern-card">
                    <div className="profile-modern-body">
                        <Skeleton active paragraph={{ rows: 6 }} />
                    </div>
                </div>
            </div>
        );
    }

    const displayName = form.fullName || form.username || 'Người dùng';

    return (
        <div className="profile-modern-page-container">
            <motion.div
                className="profile-modern-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
            >
                {/* Header style theo RestaurantRegistration */}
                <div className="profile-modern-header">
                    <div className="profile-modern-header-inner">
                        <Button className="profile-modern-back-btn" onClick={handleBack}>
                            ← Quay về
                        </Button>

                        <div className="profile-modern-title">
                            <h2>Tài khoản của bạn</h2>
                            <p>Cập nhật thông tin cá nhân và địa chỉ giao hàng mặc định.</p>
                        </div>

                        <div className="profile-modern-user">
                            <Avatar
                                size={56}
                                icon={<UserOutlined />}
                                src={avatarPreview || form.image || undefined}
                            />

                            <div className="profile-modern-user-meta">
                                <div className="profile-modern-avatar-actions">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        style={{ display: 'none' }}
                                        onChange={handleAvatarFileSelected}
                                    />
                                    <Button
                                        className="profile-modern-avatar-btn"
                                        onClick={handlePickAvatar}
                                        loading={uploadingAvatar}
                                    >
                                        {(avatarPreview || form.image) ? 'Đổi ảnh' : 'Tải ảnh'}
                                    </Button>
                                    <span className="profile-modern-avatar-hint">
                                      Ảnh dưới 5MB
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-modern-body">
                    {/* Thông tin đăng nhập */}
                    <section className="profile-modern-section">
                        <div className="profile-modern-section-title">Thông tin đăng nhập</div>
                        <div className="profile-grid-2" style={{ marginTop: 14 }}>
                            <div className="profile-form-group">
                                <label>Tên đăng nhập</label>
                                <Input value={form.username} disabled />
                            </div>
                        </div>
                    </section>

                    {/* Thông tin cá nhân */}
                    <section className="profile-modern-section">
                        <div className="profile-modern-section-title">Thông tin cá nhân</div>

                        <div className="profile-grid-2" style={{ marginTop: 14 }}>
                            <div className="profile-form-group">
                                <div className="profile-label-row">
                                    <label>Họ và tên</label>
                                    <span className="profile-count">
                  {(form.fullName || '').length}/{PROFILE_LIMITS.fullName}
                </span>
                                </div>
                                <Input
                                    name="fullName"
                                    value={form.fullName}
                                    onChange={handleChange}
                                    onBlur={(e) => validateField('fullName', e.target.value)}
                                    placeholder="Nhập họ tên đầy đủ"
                                    prefix={<UserOutlined />}
                                    maxLength={PROFILE_LIMITS.fullName}
                                    status={errors.fullName ? 'error' : ''}
                                />
                                {errors.fullName && (
                                    <p className="profile-error-text">{errors.fullName}</p>
                                )}
                            </div>

                            <div className="profile-form-group">
                                <div className="profile-label-row">
                                    <label>Số điện thoại</label>
                                    <span className="profile-count">
                  {(form.phone || '').length}/{PROFILE_LIMITS.phone}
                </span>
                                </div>
                                <Input
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    onBlur={(e) => validateField('phone', e.target.value)}
                                    placeholder="Nhập số điện thoại"
                                    prefix={<PhoneOutlined />}
                                    inputMode="numeric"
                                    maxLength={PROFILE_LIMITS.phone}
                                    status={errors.phone ? 'error' : ''}
                                />
                                {errors.phone && <p className="profile-error-text">{errors.phone}</p>}
                            </div>
                        </div>

                        <div className="profile-grid-2" style={{ marginTop: 14 }}>
                            <div className="profile-form-group">
                                <div className="profile-label-row">
                                    <label>Email</label>
                                    <span className="profile-count">
                  {(form.email || '').length}/{PROFILE_LIMITS.email}
                </span>
                                </div>
                                <Input
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    onBlur={(e) => validateField('email', e.target.value)}
                                    placeholder="Nhập email"
                                    prefix={<MailOutlined />}
                                    maxLength={PROFILE_LIMITS.email}
                                    status={errors.email ? 'error' : ''}
                                />
                                {errors.email && <p className="profile-error-text">{errors.email}</p>}
                            </div>
                        </div>
                    </section>

                    {/* Địa chỉ giao hàng */}
                    <section className="profile-modern-section">
                        <div className="profile-modern-section-title">Địa chỉ giao hàng</div>
                        <div className="profile-form-group" style={{ marginTop: 14 }}>
                            <label>Vị trí trên bản đồ</label>
                            <Input
                                readOnly
                                value={form.address || ''}
                                onClick={() => setIsMapOpen(true)}
                                placeholder="Nhấn để chọn vị trí trên bản đồ"
                                prefix={<EnvironmentOutlined />}
                                className="profile-map-input"
                                style={{
                                    cursor: 'pointer',
                                    borderColor: errors.address ? '#ff4d4f' : undefined,
                                }}
                            />
                            {errors.address && <p className="profile-error-text">{errors.address}</p>}
                        </div>
                    </section>

                    <div className="profile-actions">
                        <Button
                            type="primary"
                            size="large"
                            className="profile-modern-save-btn"
                            onClick={handleSubmit}
                            loading={saving}
                        >
                            Lưu thay đổi
                        </Button>
                    </div>
                </div>
            </motion.div>

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