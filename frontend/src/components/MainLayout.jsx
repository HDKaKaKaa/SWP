import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
    PieChartOutlined,
    ShopOutlined,
    UserOutlined,
    FileTextOutlined,
    CarOutlined,
    AppstoreOutlined,
    HomeOutlined,
    AuditOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Content, Sider } = Layout;

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    const items = [
        { key: '/admin', icon: <PieChartOutlined />, label: 'Tổng quan' },
        { key: '/admin/categories', icon: <AppstoreOutlined />, label: 'Danh mục món' },
        { key: '/admin/restaurant-approval', icon: <AuditOutlined />, label: 'Duyệt Nhà hàng' },
        { key: '/admin/restaurants', icon: <ShopOutlined />, label: 'Danh sách Nhà hàng' },
        { key: '/admin/orders', icon: <FileTextOutlined />, label: 'Đơn hàng' },
        { key: '/admin/users', icon: <UserOutlined />, label: 'Người dùng' },
        { key: '/admin/shippers', icon: <CarOutlined />, label: 'Tài xế' },

        { type: 'divider' },
        { key: '/', icon: <HomeOutlined />, label: 'Về trang chủ', danger: true },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
                <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', textAlign: 'center', color: '#fff', lineHeight: '32px', fontWeight: 'bold' }}>
                    ADMIN
                </div>
                <Menu
                    theme="dark"
                    defaultSelectedKeys={['/admin']}
                    selectedKeys={[location.pathname]}
                    mode="inline"
                    items={items}
                    onClick={({key}) => navigate(key)}
                />
            </Sider>
            <Layout>
                <Header style={{ padding: 0, background: colorBgContainer }} />
                <Content style={{ margin: '16px' }}>
                    <div style={{ padding: 24, minHeight: 360, background: colorBgContainer, borderRadius: borderRadiusLG }}>
                        <Outlet />
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;