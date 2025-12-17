import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Spin, Row, Col, Switch, Space, Upload, Avatar, Divider, Modal } from 'antd';
import { UserOutlined, CarOutlined, SaveOutlined, CameraOutlined, LockOutlined, UploadOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import {
    getShipperProfile,
    updateShipperProfile,
    updateShipperStatus,
    uploadAvatar,
    uploadLicenseImage,
    changePassword
} from '../services/shipperService';

const ShipperProfile = () => {
    const { user } = useAuth();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [shipperId, setShipperId] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [profile, setProfile] = useState(null);
    const [passwordForm] = Form.useForm();
    const [uploading, setUploading] = useState(false);
    const [uploadingLicense, setUploadingLicense] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);

    useEffect(() => {
        if (user && user.id) {
            setShipperId(user.shipperId || user.id);
        }
    }, [user]);

    useEffect(() => {
        if (shipperId) {
            fetchProfile();
        }
    }, [shipperId]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await getShipperProfile(shipperId);
            setProfile(data);
            setIsOnline(data.status === 'ONLINE');
            form.setFieldsValue({
                fullName: data.fullName,
                licensePlate: data.licensePlate,
                vehicleType: data.vehicleType,
                email: data.email,
                phone: data.phone,
            });
            passwordForm.resetFields();
        } catch (error) {
            message.error('Không thể tải thông tin!');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (values) => {
        try {
            setSaving(true);
            await updateShipperProfile(shipperId, values);
            message.success('Cập nhật thông tin thành công!');
            fetchProfile();
        } catch (error) {
            message.error('Không thể cập nhật thông tin!');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleStatus = async (checked) => {
        try {
            await updateShipperStatus(shipperId, checked ? 'ONLINE' : 'OFFLINE');
            setIsOnline(checked);
            message.success(checked ? 'Đã bật trạng thái ONLINE' : 'Đã tắt trạng thái ONLINE');
        } catch (error) {
            message.error('Không thể cập nhật trạng thái!');
        }
    };

    const handleUploadAvatar = async (file) => {
        try {
            setUploading(true);
            const result = await uploadAvatar(shipperId, file);
            message.success('Upload ảnh thành công!');
            await fetchProfile(); // Reload để hiển thị ảnh mới
        } catch (error) {
            message.error(error.response?.data || 'Không thể upload ảnh!');
        } finally {
            setUploading(false);
        }
        return false; // Prevent auto upload
    };

    const handleUploadLicenseImage = async (file) => {
        try {
            setUploadingLicense(true);
            const result = await uploadLicenseImage(shipperId, file);
            message.success('Upload ảnh giấy phép lái xe thành công!');
            await fetchProfile(); // Reload để hiển thị ảnh mới
        } catch (error) {
            message.error(error.response?.data || 'Không thể upload ảnh giấy phép lái xe!');
        } finally {
            setUploadingLicense(false);
        }
        return false; // Prevent auto upload
    };

    const handleChangePassword = async (values) => {
        try {
            setChangingPassword(true);
            await changePassword(user.id, values.oldPassword, values.newPassword, values.confirmPassword);
            message.success('Đổi mật khẩu thành công!');
            passwordForm.resetFields();
            setPasswordModalVisible(false); // Đóng modal sau khi đổi mật khẩu thành công
        } catch (error) {
            message.error(error.response?.data || 'Không thể đổi mật khẩu!');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleOpenPasswordModal = () => {
        setPasswordModalVisible(true);
        passwordForm.resetFields();
    };

    const handleClosePasswordModal = () => {
        setPasswordModalVisible(false);
        passwordForm.resetFields();
    };

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: 50 }}><Spin size="large" /></div>;
    }

    return (
        <div style={{ padding: 0, margin: 0, width: '100%' }}>
            <Row gutter={16}>
                <Col span={16}>
                    <Card
                        title={
                            <span>
                                <UserOutlined /> Thông tin cá nhân
                            </span>
                        }
                        style={{ marginBottom: 16 }}
                    >
                        {/* Phần hiển thị và upload ảnh đại diện */}
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <Avatar
                                size={120}
                                src={profile?.avatar}
                                icon={<UserOutlined />}
                                style={{ marginBottom: 16 }}
                            />
                            <div>
                                <Upload
                                    beforeUpload={handleUploadAvatar}
                                    showUploadList={false}
                                    accept="image/*"
                                >
                                    <Button
                                        icon={<CameraOutlined />}
                                        loading={uploading}
                                        disabled={uploading}
                                    >
                                        {uploading ? 'Đang upload...' : 'Thay đổi ảnh đại diện'}
                                    </Button>
                                </Upload>
                            </div>
                        </div>

                        <Divider />

                        {/* Phần hiển thị và upload ảnh giấy phép lái xe */}
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ marginBottom: 12 }}>
                                <strong>Giấy phép lái xe:</strong>
                            </div>
                            {profile?.licenseImage ? (
                                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                                    <img
                                        src={profile.licenseImage}
                                        alt="Giấy phép lái xe"
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '300px',
                                            border: '1px solid #d9d9d9',
                                            borderRadius: '8px',
                                            padding: '8px',
                                            backgroundColor: '#fafafa'
                                        }}
                                    />
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', marginBottom: 12, padding: '20px', border: '1px dashed #d9d9d9', borderRadius: '8px', backgroundColor: '#fafafa' }}>
                                    <p style={{ color: '#999', margin: 0 }}>Chưa có ảnh giấy phép lái xe</p>
                                </div>
                            )}
                            <div style={{ textAlign: 'center' }}>
                                <Upload
                                    beforeUpload={handleUploadLicenseImage}
                                    showUploadList={false}
                                    accept="image/*"
                                >
                                    <Button
                                        icon={<UploadOutlined />}
                                        loading={uploadingLicense}
                                        disabled={uploadingLicense}
                                    >
                                        {uploadingLicense ? 'Đang upload...' : profile?.licenseImage ? 'Thay đổi ảnh' : 'Upload ảnh giấy phép lái xe'}
                                    </Button>
                                </Upload>
                            </div>
                        </div>

                        <Divider />
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={handleSave}
                            initialValues={profile}
                        >
                            <Form.Item
                                label="Họ và tên"
                                name="fullName"
                                rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}
                            >
                                <Input prefix={<UserOutlined />} />
                            </Form.Item>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        label="Biển số xe"
                                        name="licensePlate"
                                    >
                                        <Input prefix={<CarOutlined />} placeholder="VD: 30A-12345" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Loại xe"
                                        name="vehicleType"
                                    >
                                        <Input placeholder="VD: Xe máy, Xe đạp" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        label="Email"
                                        name="email"
                                        rules={[
                                            { required: true, message: 'Vui lòng nhập email!' },
                                            { type: 'email', message: 'Email không hợp lệ!' }
                                        ]}
                                    >
                                        <Input />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Số điện thoại"
                                        name="phone"
                                        rules={[
                                            { required: true, message: 'Vui lòng nhập số điện thoại!' },
                                            { pattern: /^[0-9]{10,11}$/, message: 'Số điện thoại không hợp lệ!' }
                                        ]}
                                    >
                                        <Input />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    icon={<SaveOutlined />}
                                    loading={saving}
                                >
                                    Lưu thông tin
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Col>

                <Col span={8}>
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                        <Card title="Trạng thái hoạt động">
                            <Space direction="vertical" style={{ width: '100%' }}>
                                <div>
                                    <p><strong>Trạng thái hiện tại:</strong></p>
                                    <Switch
                                        checked={isOnline}
                                        onChange={handleToggleStatus}
                                        checkedChildren="ONLINE"
                                        unCheckedChildren="OFFLINE"
                                        size="large"
                                    />
                                </div>
                                <div style={{ marginTop: 16 }}>
                                    <p><strong>Hướng dẫn:</strong></p>
                                    <ul style={{ paddingLeft: 20 }}>
                                        <li>Bật ONLINE để nhận đơn hàng mới</li>
                                        <li>Trạng thái BUSY sẽ tự động bật khi bạn nhận đơn</li>
                                        <li>Trạng thái sẽ tự động về ONLINE khi hoàn thành đơn</li>
                                    </ul>
                                </div>
                            </Space>
                        </Card>

                        <Card>
                            <Button
                                type="primary"
                                icon={<LockOutlined />}
                                onClick={handleOpenPasswordModal}
                                block
                                size="large"
                            >
                                Đổi mật khẩu
                            </Button>
                        </Card>
                    </Space>
                </Col>
            </Row>

            {/* Modal đổi mật khẩu */}
            <Modal
                title={
                    <span>
                        <LockOutlined /> Đổi mật khẩu
                    </span>
                }
                open={passwordModalVisible}
                onCancel={handleClosePasswordModal}
                footer={null}
                width={500}
            >
                <Form
                    form={passwordForm}
                    layout="vertical"
                    onFinish={handleChangePassword}
                >
                    <Form.Item
                        label="Mật khẩu cũ"
                        name="oldPassword"
                        rules={[{ required: true, message: 'Vui lòng nhập mật khẩu cũ!' }]}
                    >
                        <Input.Password placeholder="Nhập mật khẩu cũ" />
                    </Form.Item>

                    <Form.Item
                        label="Mật khẩu mới"
                        name="newPassword"
                        rules={[
                            { required: true, message: 'Vui lòng nhập mật khẩu mới!' },
                            { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
                        ]}
                    >
                        <Input.Password placeholder="Nhập mật khẩu mới" />
                    </Form.Item>

                    <Form.Item
                        label="Xác nhận mật khẩu"
                        name="confirmPassword"
                        dependencies={['newPassword']}
                        rules={[
                            { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
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
                        <Input.Password placeholder="Xác nhận mật khẩu mới" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                            <Button onClick={handleClosePasswordModal}>
                                Hủy
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<LockOutlined />}
                                loading={changingPassword}
                            >
                                Đổi mật khẩu
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ShipperProfile;



