import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        'http://localhost:8080/api/auth/forgot-password',
        { email }
      );
      setMessage(res.data);
    } catch (err) {
      setMessage('Lỗi: ' + (err.response?.data || 'Không thể reset mật khẩu'));
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
      <h2 style={{ color: '#ee4d2d' }}>Quên mật khẩu?</h2>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Nhập email bạn đã đăng ký để lấy lại mật khẩu.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
      >
        <input
          type="email"
          placeholder="Nhập email của bạn"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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
          Gửi yêu cầu
        </button>
      </form>

      {message && (
        <div
          style={{
            marginTop: '20px',
            padding: '10px',
            background: '#e6fffa',
            color: '#006644',
            borderRadius: '5px',
            border: '1px solid #006644',
          }}
        >
          {message}
        </div>
      )}

      <p style={{ marginTop: '20px' }}>
        <Link to="/login" style={{ color: '#0288d1' }}>
          Quay lại Đăng nhập
        </Link>
      </p>
    </div>
  );
};

export default ForgotPasswordPage;
