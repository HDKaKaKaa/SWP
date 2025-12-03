import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../css/LoginPage.css';
import { Form, Input, Button, message, Typography, Alert } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';

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
      <div className="auth-card">
        <Title level={3} className="auth-title">
          Khôi phục mật khẩu
        </Title>
        <Paragraph style={{ textAlign: 'center', marginBottom: 20 }}>
          Nhập email của bạn, chúng tôi sẽ gửi mật khẩu mới.
        </Paragraph>

        {successMsg && (
          <Alert
            message="Thành công"
            description={successMsg}
            type="success"
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        <Form name="forgot-password" onFinish={onFinish} size="large">
          <Form.Item
            name="email"
            rules={[
              { type: 'email', message: 'Email không đúng định dạng!' },
              { required: true, message: 'Vui lòng nhập Email!' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Nhập email của bạn" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Gửi yêu cầu
            </Button>
          </Form.Item>
        </Form>

        <div className="auth-footer">
          <Link to="/login" style={{ color: '#555' }}>
            <ArrowLeftOutlined /> Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
