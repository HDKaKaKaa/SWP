import React, { useEffect, useState } from 'react';
import { Card, Form, Input, Button, message, Spin, Row, Col, Switch, Space } from 'antd';
import { UserOutlined, CarOutlined, SaveOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import {
    getShipperProfile,
    updateShipperProfile,
    updateShipperStatus
} from '../services/shipperService';

const ShipperProfile = () => {
    const { user } = useAuth();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [shipperId, setShipperId] = useState(null);
    const [isOnline, setIsOnline] = useState(false);
    const [profile, setProfile] = useState(null);

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
                                    >
                                        <Input disabled />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Số điện thoại"
                                        name="phone"
                                    >
                                        <Input disabled />
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
                </Col>
            </Row>
        </div>
    );
};

export default ShipperProfile;



