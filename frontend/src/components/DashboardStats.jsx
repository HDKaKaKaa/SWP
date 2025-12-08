import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import {
    DollarCircleOutlined,
    ShoppingCartOutlined,
    ShopOutlined,
    CarOutlined
} from '@ant-design/icons';

const DashboardStats = ({ stats }) => {
    // Hàm format tiền VND
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    return (
        <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
                <Card bordered={false} hoverable>
                    <Statistic
                        title="Tổng doanh thu"
                        value={stats.totalRevenue}
                        formatter={formatCurrency}
                        prefix={<DollarCircleOutlined style={{ color: '#3f8600' }} />}
                        valueStyle={{ color: '#3f8600', fontWeight: 'bold' }}
                    />
                </Card>
            </Col>
            <Col span={6}>
                <Card bordered={false} hoverable>
                    <Statistic
                        title="Đơn hàng hôm nay"
                        value={stats.todayOrders}
                        prefix={<ShoppingCartOutlined style={{ color: '#1890ff' }} />}
                        valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                    />
                </Card>
            </Col>
            <Col span={6}>
                <Card bordered={false} hoverable>
                    <Statistic
                        title="Nhà hàng hoạt động"
                        value={stats.totalActiveRestaurants}
                        prefix={<ShopOutlined style={{ color: '#faad14' }} />}
                    />
                </Card>
            </Col>
            <Col span={6}>
                <Card bordered={false} hoverable>
                    <Statistic
                        title="Shipper Online"
                        value={stats.totalOnlineShippers}
                        prefix={<CarOutlined style={{ color: '#eb2f96' }} />}
                    />
                </Card>
            </Col>
        </Row>
    );
};

export default DashboardStats;