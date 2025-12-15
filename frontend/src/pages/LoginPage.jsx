import { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../css/LoginPage.css';
import { Form, Input, Button, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { FaUtensils } from 'react-icons/fa';

const { Title, Text } = Typography;

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
      } else if (res.data.role === 'SHIPPER') {
        navigate('/shipper');
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

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="auth-logo">
          <FaUtensils />
        </div>
        <Title level={2} className="auth-title">
          Chào mừng trở lại!
        </Title>
        <div className="auth-subtitle">
          Đăng nhập để tiếp tục thưởng thức món ngon
        </div>

        <Form
          name="login_form"
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="username"
            label="Tài khoản"
            rules={[{ required: true, message: 'Vui lòng nhập tài khoản!' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Tên đăng nhập hoặc Email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu của bạn"
            />
          </Form.Item>

          <div style={{ textAlign: 'right', marginBottom: '24px' }}>
            <Link
              to="/forgot-password"
              style={{ color: '#ff6b35', fontWeight: 500 }}
            >
              Quên mật khẩu?
            </Link>
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              ĐĂNG NHẬP
            </Button>
          </Form.Item>
        </Form>

        <div className="auth-footer">
          Chưa có tài khoản?
          <Link to="/register">Đăng ký ngay</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
