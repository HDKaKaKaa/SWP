import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../css/App.css';

const RegisterPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    fullName: '',
    phone: '',
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
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
        textAlign: 'center',
      }}
    >
      <h2 style={{ color: '#ee4d2d' }}>Đăng ký tài khoản</h2>
      <form
        onSubmit={handleRegister}
        style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
      >
        <input
          name="username"
          type="text"
          placeholder="Tên đăng nhập"
          onChange={handleChange}
          required
          style={{ padding: '10px' }}
        />
        <input
          name="password"
          type="password"
          placeholder="Mật khẩu"
          onChange={handleChange}
          required
          style={{ padding: '10px' }}
        />
        <input
          name="fullName"
          type="text"
          placeholder="Họ và tên"
          onChange={handleChange}
          required
          style={{ padding: '10px' }}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          onChange={handleChange}
          required
          style={{ padding: '10px' }}
        />
        <input
          name="phone"
          type="text"
          placeholder="Số điện thoại"
          onChange={handleChange}
          required
          style={{ padding: '10px' }}
        />

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

      <p style={{ marginTop: '20px' }}>
        Đã có tài khoản?{' '}
        <Link to="/login" style={{ color: '#0288d1' }}>
          Đăng nhập ngay
        </Link>
      </p>
    </div>
  );
};

export default RegisterPage;
