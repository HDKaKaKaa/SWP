import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
// import { GoogleLogin } from '@react-oauth/google';
// import { jwtDecode } from 'jwt-decode';
import '../css/App.css';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:8080/api/auth/login', {
        username,
        password,
      });
      login(res.data); // Lưu user vào context
      alert('Đăng nhập thành công!');
        // --- LOGIC PHÂN QUYỀN ĐIỀU HƯỚNG ---
        // Giả sử backend trả về: { username: "admin", role: "ADMIN", ... }
        if (res.data.role === 'ADMIN') {
            navigate('/admin'); // Vào thẳng Dashboard Admin
        } else if (res.data.role === 'SHIPPER') {
            navigate('/shipper'); // (Ví dụ) Trang shipper
        } else {
            navigate('/'); // Khách hàng thường thì về trang chủ
        }
        // ------------------------------------
    } catch (err) {
      alert('Đăng nhập thất bại: ' + (err.response?.data || 'Lỗi server'));
    }
  };

  //   const handleGoogleSuccess = (credentialResponse) => {
  //     const decoded = jwtDecode(credentialResponse.credential);
  //     console.log('Google Info:', decoded);
  //     // Ở đây bạn nên gọi API backend để lưu user Google vào DB
  //     // Tạm thời mình giả lập login thành công luôn
  //     const fakeUser = {
  //       username: decoded.email,
  //       fullName: decoded.name,
  //       role: 'CUSTOMER',
  //     };
  //     login(fakeUser);
  //     navigate('/');
  //   };

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
      <h2>Đăng nhập</h2>
      <form
        onSubmit={handleLogin}
        style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
      >
        <input
          type="text"
          placeholder="Username/Email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: '10px' }}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '10px' }}
          required
        />
        <div style={{ textAlign: 'right' }}>
          <Link
            to="/forgot-password"
            style={{
              color: '#0288d1',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            Quên mật khẩu?
          </Link>
        </div>
        <button
          type="submit"
          style={{
            padding: '10px',
            background: '#ee4d2d',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Đăng nhập
        </button>
      </form>

      {/* <div style={{ margin: '20px 0' }}>Hoặc</div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => alert('Login Failed')}
        />
      </div> */}

      <p style={{ marginTop: '20px' }}>
        Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
      </p>
    </div>
  );
};

export default LoginPage;
