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
    const { name, value } = e.target;

    if (name === 'phone') {
      if (!/^\d*$/.test(value)) return;
    }

    // CẬP NHẬT DỮ LIỆU VÀO STATE
    // Tạo biến tạm để validate chính xác giá trị mới nhất
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);

    // Real-time Validation
    let errorMsg = '';

    switch (name) {
      case 'username':
        if (!value.trim()) errorMsg = 'Vui lòng nhập tên đăng nhập';
        break;

      case 'email':
        // Chỉ báo lỗi nếu đã nhập ít nhất 1 ký tự (để tránh vừa click vào đã báo lỗi)
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errorMsg = 'Email chưa đúng định dạng';
        }
        break;

      case 'password':
        if (value.length > 0 && value.length < 6) {
          errorMsg = 'Mật khẩu phải từ 6 ký tự trở lên';
        }
        if (
          newFormData.confirmPassword &&
          value !== newFormData.confirmPassword
        ) {
          setErrors((prev) => ({
            ...prev,
            confirmPassword: 'Mật khẩu nhập lại không khớp',
          }));
        } else {
          setErrors((prev) => ({ ...prev, confirmPassword: '' }));
        }
        break;

      case 'confirmPassword':
        if (value && value !== newFormData.password) {
          errorMsg = 'Mật khẩu nhập lại không khớp';
        }
        break;

      case 'phone':
        if (value && !/^0[0-9]{9}$/.test(value)) {
          if (!value.startsWith('0')) errorMsg = 'SĐT phải bắt đầu bằng số 0';
          else if (value.length < 10) errorMsg = 'SĐT phải đủ 10 số';
        }
        break;

      case 'fullName':
        if (!value.trim()) errorMsg = 'Vui lòng nhập họ tên';
        break;

      default:
        break;
    }

    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: errorMsg,
    }));
  };

  const validateFormOnSubmit = () => {
    // Kiểm tra xem object errors có còn lỗi nào không
    const hasError = Object.values(errors).some((err) => err !== '');
    // Kiểm tra xem có ô nào bị bỏ trống không
    const isMissing = Object.values(formData).some((val) => val === '');

    if (hasError || isMissing) {
      alert('Vui lòng kiểm tra lại thông tin nhập!');
      return false;
    }
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validateFormOnSubmit()) return;

    try {
      const { confirmPassword, ...dataToSend } = formData;
      const response = await axios.post(
        'http://localhost:8080/api/auth/register',
        dataToSend
      );
      alert(response.data);
      navigate('/login');
    } catch (err) {
      console.error('Lỗi đăng ký:', err);
      let message = 'Đăng ký thất bại. Vui lòng thử lại sau.';

      if (err.response) {
        if (typeof err.response.data === 'string') {
          message = err.response.data;
        } else if (err.response.data && err.response.data.message) {
          message = err.response.data.message;
        }
      } else if (err.request) {
        message = 'Không thể kết nối đến Server. Vui lòng kiểm tra mạng.';
      }

      alert(message);
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
            value={formData.username}
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
            value={formData.password}
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
            value={formData.confirmPassword}
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
            value={formData.fullName}
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
            type="email"
            placeholder="Email"
            value={formData.email}
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
            type="tel"
            placeholder="Số điện thoại"
            value={formData.phone}
            onChange={handleChange}
            maxLength={10}
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
