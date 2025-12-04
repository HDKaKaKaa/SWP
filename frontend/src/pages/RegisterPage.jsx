import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../css/App.css';

const RegisterPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    fullName: '',
    phone: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const validateForm = () => {
    let newErrors = {};

    // 1. Check Username
    if (!formData.username.trim())
      newErrors.username = 'Vui lòng nhập tên đăng nhập';

    // 2. Check Password
    if (formData.password.length < 6)
      newErrors.password = 'Mật khẩu phải từ 6 ký tự trở lên';

    // 3. Check Confirm Password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu nhập lại không khớp';
    }

    // 4. Check Email (Regex đơn giản)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email))
      newErrors.email = 'Email không hợp lệ';

    // 5. Check Phone (Phải là số, 10 ký tự)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone))
      newErrors.phone = 'Số điện thoại phải có 10 chữ số';

    // 6. Check Fullname
    if (!formData.fullName.trim()) newErrors.fullName = 'Vui lòng nhập họ tên';

    setErrors(newErrors);
    // Nếu không có lỗi nào (Object rỗng) thì trả về true
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const { confirmPassword, ...dataToSend } = formData;

      await axios.post('http://localhost:8080/api/auth/register', formData);
      alert('Đăng ký thành công! Hãy đăng nhập ngay.');
      navigate('/login');
    } catch (err) {
      alert('Lỗi: ' + (err.response?.data || 'Đăng ký thất bại'));
    }
  };

  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '50px auto',
        padding: '20px',
        border: '1px solid #ddd',
        borderRadius: '8px',
      }}
    >
      <h2 style={{ textAlign: 'center', color: '#ee4d2d' }}>
        Đăng ký tài khoản
      </h2>
      <form
        onSubmit={handleRegister}
        style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
      >
        <div>
          <input
            name="username"
            type="text"
            placeholder="Tên đăng nhập"
            onChange={handleChange}
            style={{ width: '100%', padding: '10px' }}
          />
          {errors.username && (
            <span style={{ color: 'red', fontSize: '12px' }}>
              {errors.username}
            </span>
          )}
        </div>

        <div>
          <input
            name="password"
            type="password"
            placeholder="Mật khẩu"
            onChange={handleChange}
            style={{ width: '100%', padding: '10px' }}
          />
          {errors.password && (
            <span style={{ color: 'red', fontSize: '12px' }}>
              {errors.password}
            </span>
          )}
        </div>

        <div>
          <input
            name="confirmPassword"
            type="password"
            placeholder="Nhập lại mật khẩu"
            onChange={handleChange}
            style={{ width: '100%', padding: '10px' }}
          />
          {errors.confirmPassword && (
            <span style={{ color: 'red', fontSize: '12px' }}>
              {errors.confirmPassword}
            </span>
          )}
        </div>

        <div>
          <input
            name="fullName"
            type="text"
            placeholder="Họ và tên"
            onChange={handleChange}
            style={{ width: '100%', padding: '10px' }}
          />
          {errors.fullName && (
            <span style={{ color: 'red', fontSize: '12px' }}>
              {errors.fullName}
            </span>
          )}
        </div>

        <div>
          <input
            name="email"
            type="text"
            placeholder="Email"
            onChange={handleChange}
            style={{ width: '100%', padding: '10px' }}
          />
          {errors.email && (
            <span style={{ color: 'red', fontSize: '12px' }}>
              {errors.email}
            </span>
          )}
        </div>

        <div>
          <input
            name="phone"
            type="text"
            placeholder="Số điện thoại"
            onChange={handleChange}
            style={{ width: '100%', padding: '10px' }}
          />
          {errors.phone && (
            <span style={{ color: 'red', fontSize: '12px' }}>
              {errors.phone}
            </span>
          )}
        </div>

        <button
          type="submit"
          style={{
            padding: '12px',
            background: '#ee4d2d',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Đăng ký
        </button>
      </form>

      <p style={{ marginTop: '20px', textAlign: 'center' }}>
        Đã có tài khoản?{' '}
        <Link to="/login" style={{ color: '#0288d1' }}>
          Đăng nhập ngay
        </Link>
      </p>
    </div>
  );
};

export default RegisterPage;
