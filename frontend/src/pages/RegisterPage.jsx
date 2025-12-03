import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../css/LoginPage.css'; // Tái sử dụng style của Login cho đồng bộ
import { Form, Input, Button, message, Typography } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SmileOutlined,
} from '@ant-design/icons';

const { Title } = Typography;

const RegisterPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // Loại bỏ confirmPassword trước khi gửi lên server
      const { confirmPassword, ...dataToSend } = values;

      const res = await axios.post(
        'http://localhost:8080/api/auth/register',
        dataToSend
      );
      message.success(res.data);
      navigate('/login');
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.response?.data || 'Đăng ký thất bại';
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-overlay"></div>
      <div className="auth-card" style={{ maxWidth: '500px' }}>
        {' '}
        {/* Form đăng ký rộng hơn chút */}
        <Title level={2} className="auth-title">
          Đăng ký tài khoản
        </Title>
        <Form
          name="register"
          onFinish={onFinish}
          size="large"
          layout="vertical" // Label nằm trên input
          scrollToFirstError
        >
          <Form.Item
            name="username"
            label="Tên đăng nhập"
            rules={[{ required: true, message: 'Vui lòng nhập Username!' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Ví dụ: user123" />
          </Form.Item>

          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[{ required: true, message: 'Vui lòng nhập Họ tên!' }]}
          >
            <Input
              prefix={<SmileOutlined />}
              placeholder="Ví dụ: Nguyễn Văn A"
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { type: 'email', message: 'Email không hợp lệ!' },
              { required: true, message: 'Vui lòng nhập Email!' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="user@example.com" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
            rules={[
              { required: true, message: 'Vui lòng nhập SĐT!' },
              {
                pattern: /^0\d{9}$/,
                message: 'SĐT phải bắt đầu bằng 0 và có 10 số!',
              },
            ]}
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="09xxx..."
              maxLength={10}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu!' },
              { min: 6, message: 'Mật khẩu ít nhất 6 ký tự!' },
            ]}
            hasFeedback
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Nhập lại mật khẩu"
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error('Mật khẩu nhập lại không khớp!')
                  );
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Đăng ký
            </Button>
          </Form.Item>
        </Form>
        <div className="auth-footer">
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ color: '#ee4d2d', fontWeight: 'bold' }}>
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
