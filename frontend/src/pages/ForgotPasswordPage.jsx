import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../css/LoginPage.css';
import { Form, Input, Button, message, Typography, Alert } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Title, Paragraph } = Typography;

const ForgotPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const onFinish = async (values) => {
    setLoading(true);
    setSuccessMsg('');
    try {
      const res = await axios.post(
        'http://localhost:8080/api/auth/forgot-password',
        {
          email: values.email,
        }
      );
      setSuccessMsg(res.data);
      message.success('Đã gửi email thành công!');
    } catch (err) {
      message.error(err.response?.data || 'Lỗi hệ thống');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-overlay"></div>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Title level={2} className="auth-title">
          Khôi phục mật khẩu
        </Title>
        <Paragraph
          style={{ textAlign: 'center', marginBottom: 30, color: '#666' }}
        >
          Đừng lo lắng! Hãy nhập email của bạn, chúng tôi sẽ gửi hướng dẫn khôi
          phục mật khẩu.
        </Paragraph>

        {successMsg && (
          <Alert
            message="Thành công"
            description={successMsg}
            type="success"
            showIcon
            style={{ marginBottom: 20, borderRadius: '12px' }}
          />
        )}

        <Form
          name="forgot-password"
          onFinish={onFinish}
          size="large"
          layout="vertical"
        >
          <Form.Item
            name="email"
            label="Email đăng ký"
            rules={[
              { type: 'email', message: 'Email không hợp lệ!' },
              { required: true, message: 'Vui lòng nhập Email!' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Nhập email của bạn" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              GỬI YÊU CẦU
            </Button>
          </Form.Item>
        </Form>

        <div
          className="auth-footer"
          style={{ borderTop: 'none', paddingTop: 10 }}
        >
          <Link
            to="/login"
            style={{
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
            }}
          >
            <ArrowLeftOutlined /> Quay lại đăng nhập
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
