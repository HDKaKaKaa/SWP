import React, { useState } from 'react';
import { Form, Input, Button, message, Card, Divider } from 'antd'; // Thay Modal bằng Card
import { LockOutlined, SaveOutlined } from '@ant-design/icons';
import { changePassword } from '../services/customerService';
import { useNavigate } from 'react-router-dom'; // Dùng để chuyển trang

const ChangePasswordPage = () => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const navigate = useNavigate(); // Hook để điều hướng

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await changePassword(values);
            message.success('Đổi mật khẩu thành công! Vui lòng đăng nhập lại.');

            // Đổi xong thì đá về trang login hoặc trang chủ
            // localStorage.removeItem('token'); // Nếu muốn bắt đăng nhập lại
            // navigate('/login');
            form.resetFields();
        } catch (error) {
            const errorMsg = error.response?.data || 'Có lỗi xảy ra!';
            message.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh', // Căn giữa màn hình
            backgroundColor: '#f0f2f5'
        }}>
            <Card
                title="Đổi Mật Khẩu"
                style={{ width: 500, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        name="oldPassword"
                        label="Mật khẩu hiện tại"
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu cũ" size="large"/>
                    </Form.Item>

                    <Form.Item
                        name="newPassword"
                        label="Mật khẩu mới"
                        hasFeedback
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu mới" size="large"/>
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        label="Xác nhận mật khẩu mới"
                        dependencies={['newPassword']}
                        hasFeedback
                        rules={[
                            { required: true, message: 'Vui lòng nhập lại mật khẩu mới' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('Mật khẩu xác nhận không khớp!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới" size="large"/>
                    </Form.Item>

                    <Form.Item style={{ marginTop: 24 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block // Nút full chiều rộng
                            size="large"
                            icon={<SaveOutlined />}
                        >
                            Lưu thay đổi
                        </Button>

                        <Button
                            type="link"
                            block
                            onClick={() => navigate('/')} // Nút quay về
                            style={{ marginTop: 10 }}
                        >
                            Quay về trang chủ
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default ChangePasswordPage;