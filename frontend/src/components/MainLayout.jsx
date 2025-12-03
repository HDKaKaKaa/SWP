import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
    PieChartOutlined,
    ShopOutlined,
    UserOutlined,
    FileTextOutlined,
    CarOutlined
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

    // Danh sách menu bên trái
    const items = [
        { key: '/admin', icon: <PieChartOutlined />, label: 'Tổng quan' },
        { key: '/admin/restaurants', icon: <ShopOutlined />, label: 'Quản lý Nhà hàng' },
        { key: '/admin/orders', icon: <FileTextOutlined />, label: 'Đơn hàng' },
        { key: '/admin/users', icon: <UserOutlined />, label: 'Người dùng' },
        { key: '/admin/shippers', icon: <CarOutlined />, label: 'Tài xế' },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            {/* 1. THANH SIDEBAR BÊN TRÁI */}
            <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
                <div style={{
                    height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white', textAlign: 'center', lineHeight: '32px', fontWeight: 'bold'
                }}>
                    SHOPEE ADMIN
                </div>
                <Menu
                    theme="dark"
                    defaultSelectedKeys={['/']}
                    selectedKeys={[location.pathname]} // Highlight menu đang chọn
                    mode="inline"
                    items={items}
                    onClick={({ key }) => navigate(key)} // Chuyển trang khi bấm
                />
            </Sider>

            {/* 2. PHẦN NỘI DUNG BÊN PHẢI */}
            <Layout>
                <Header style={{ padding: 0, background: colorBgContainer }} />

                <Content style={{ margin: '16px' }}>
                    <div style={{
                        padding: 24,
                        minHeight: 360,
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG
                    }}>
                        {/* QUAN TRỌNG: Outlet là nơi nội dung các trang con (Dashboard, User...) hiển thị */}
                        <Outlet />
                    </div>
                </Content>

            </Layout>
        </Layout>
    );
};

export default MainLayout;