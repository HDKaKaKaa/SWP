import { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../css/LoginPage.css';
import { Form, Input, Button, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

const { Title } = Typography;

const LoginPage = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8080/api/auth/login', {
        username: values.username,
        password: values.password,
      });

      login(res.data);
      message.success('Đăng nhập thành công!');

      // Phân quyền điều hướng
      if (res.data.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      message.error(err.response?.data || 'Sai tên đăng nhập hoặc mật khẩu!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-overlay"></div>
      <div className="auth-card">
        <Title level={2} className="auth-title">
          Đăng nhập
        </Title>

        <Form
          name="login_form"
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="Tài khoản"
            rules={[
              { required: true, message: 'Vui lòng nhập Username hoặc Email!' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nhập tên đăng nhập" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu"
            />
          </Form.Item>

          {/* Chỉ giữ lại nút Quên mật khẩu nằm bên phải */}
          <div style={{ textAlign: 'right', marginBottom: '24px' }}>
            <Link to="/forgot-password" style={{ color: '#0288d1' }}>
              Quên mật khẩu?
            </Link>
          </div>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <div className="auth-footer">
          Chưa có tài khoản?{' '}
          <Link to="/register" style={{ color: '#ee4d2d', fontWeight: 'bold' }}>
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
