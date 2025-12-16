import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../css/LoginPage.css';
import { Form, Input, Button, message, Typography } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  SmileOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Title } = Typography;

const RegisterPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const normalizeNoSpace = (value) => {
    if (!value) return value;
    return value.replace(/\s/g, '');
  };

  const normalizeNumber = (value) => {
    if (!value) return value;
    return value.replace(/[^0-9]/g, '');
  };

  const normalizeName = (value) => {
    if (!value) return value;
    let result = value.trimStart();
    result = result.replace(
      /[^a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]/g,
      ''
    );
    return result;
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const cleanData = {
        username: values.username.trim(),
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone,
        password: values.password,
      };

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

      <motion.div
        className="auth-card"
        style={{ maxWidth: '500px' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Title level={2} className="auth-title">
          Tạo tài khoản mới
        </Title>
        <div className="auth-subtitle">Tham gia cộng đồng ẩm thực lớn nhất</div>

        <Form
          name="register"
          onFinish={onFinish}
          size="large"
          layout="vertical"
          scrollToFirstError
        >
          <Form.Item
            name="username"
            label="Tên đăng nhập"
            normalize={normalizeNoSpace}
            rules={[
              { required: true, message: 'Vui lòng nhập Tên đăng nhập' },
              { min: 4, message: 'Tối thiểu 4 ký tự' },
              { max: 30, message: 'Tối đa 30 ký tự' },
              {
                pattern: /^[a-zA-Z0-9.]+$/,
                message: 'Chỉ chứa chữ không dấu, số hoặc dấu chấm',
              },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="user123"
              maxLength={30}
            />
          </Form.Item>

          <Form.Item
            name="fullName"
            label="Họ và tên"
            normalize={normalizeName}
            rules={[
              { required: true, message: 'Vui lòng nhập Họ tên' },
              { min: 2, message: 'Họ tên quá ngắn' },
              { max: 50, message: 'Họ tên quá dài' },
            ]}
          >
            <Input
              prefix={<SmileOutlined />}
              placeholder="Nguyễn Văn A"
              maxLength={50}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            normalize={(v) => v?.trim()}
            rules={[
              { required: true, message: 'Vui lòng nhập Email' },
              { type: 'email', message: 'Email không đúng định dạng' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="user@example.com" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
            normalize={normalizeNumber}
            rules={[
              { required: true, message: 'Vui lòng nhập SĐT' },
              {
                pattern: /^0\d{9}$/,
                message: 'SĐT không hợp lệ (10 số, bắt đầu bằng 0)',
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
            normalize={normalizeNoSpace}
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 6, message: 'Mật khẩu ít nhất 6 ký tự' },
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu"
            />
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
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập lại mật khẩu"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              ĐĂNG KÝ NGAY
            </Button>
          </Form.Item>
        </Form>

        <div className="auth-footer">
          Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
