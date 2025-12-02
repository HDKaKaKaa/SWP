import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../css/ProfilePage.css';

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

    // Load thông tin profile khi mở trang
    useEffect(() => {
        // Ưu tiên lấy user từ context, nếu chưa có thì đọc thêm từ localStorage
        let effectiveUser = user;
        if (!effectiveUser) {
            const stored = localStorage.getItem('user');
            if (stored) {
                try {
                    effectiveUser = JSON.parse(stored);
                    // Đồng bộ lại vào context để các chỗ khác dùng
                    login(effectiveUser);
                } catch (e) {
                    console.error('Không parse được user từ localStorage', e);
                }
            }
        }

        // Sau khi kiểm tra mà vẫn không có user => bắt đăng nhập
        if (!effectiveUser) {
            setLoading(false);
            navigate('/login');
            return;
        }

        const accountId = effectiveUser.id;

        const fetchProfile = async () => {
            try {
                const res = await axios.get(
                    `http://localhost:8080/api/customer/profile/${accountId}`
                );
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
                alert('Lỗi tải thông tin tài khoản. Vui lòng thử lại.');
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
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;

        setSaving(true);
        try {
            await axios.put(
                `http://localhost:8080/api/customer/profile/${user.id}`,
                {
                    fullName: form.fullName,
                    email: form.email,
                    phone: form.phone,
                    address: form.address,
                    latitude: form.latitude !== '' ? Number(form.latitude) : null,
                    longitude: form.longitude !== '' ? Number(form.longitude) : null,
                }
            );

            // Cập nhật lại user trong context + localStorage cho đồng bộ
            const updatedUser = {
                ...user,
                email: form.email,
                phone: form.phone,
            };
            // login() trong AuthContext vốn dùng để set user + localStorage
            login(updatedUser);

            alert('Cập nhật thông tin thành công');
        } catch (err) {
            console.error(err);
            if (err.response && err.response.data) {
                alert(err.response.data);
            } else {
                alert('Có lỗi xảy ra khi lưu. Vui lòng thử lại.');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="profile-page">
                <div className="profile-card">
                    <p>Đang tải thông tin...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <div className="profile-card">
                <h2 className="profile-title">Thông tin tài khoản</h2>

                <form className="profile-form" onSubmit={handleSubmit}>
                    {/* Username (readonly) */}
                    <div className="profile-form-group">
                        <label>Tên đăng nhập</label>
                        <input
                            type="text"
                            name="username"
                            value={form.username}
                            readOnly
                        />
                    </div>

                    {/* Role (readonly) */}
                    <div className="profile-form-group">
                        <label>Vai trò</label>
                        <input type="text" name="role" value={form.role} readOnly />
                    </div>

                    {/* Họ tên */}
                    <div className="profile-form-group">
                        <label>Họ và tên</label>
                        <input
                            type="text"
                            name="fullName"
                            value={form.fullName}
                            onChange={handleChange}
                            placeholder="Nhập họ tên"
                        />
                    </div>

                    {/* Email */}
                    <div className="profile-form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="Nhập email"
                        />
                    </div>

                    {/* Số điện thoại */}
                    <div className="profile-form-group">
                        <label>Số điện thoại</label>
                        <input
                            type="text"
                            name="phone"
                            value={form.phone}
                            onChange={handleChange}
                            placeholder="Nhập số điện thoại"
                        />
                    </div>

                    {/* Địa chỉ */}
                    <div className="profile-form-group">
                        <label>Địa chỉ giao hàng</label>
                        <textarea
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Nhập địa chỉ cụ thể"
                        />
                    </div>

                    {/* Tọa độ (nếu có) */}
                    <div className="profile-grid-2">
                        <div className="profile-form-group">
                            <label>Vĩ độ (latitude)</label>
                            <input
                                type="number"
                                step="0.000001"
                                name="latitude"
                                value={form.latitude}
                                onChange={handleChange}
                                placeholder="VD: 21.027764"
                            />
                        </div>
                        <div className="profile-form-group">
                            <label>Kinh độ (longitude)</label>
                            <input
                                type="number"
                                step="0.000001"
                                name="longitude"
                                value={form.longitude}
                                onChange={handleChange}
                                placeholder="VD: 105.834160"
                            />
                        </div>
                    </div>

                    <div className="profile-actions">
                        <button
                            type="submit"
                            className="profile-save-btn"
                            disabled={saving}
                        >
                            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;
