import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
    HomeOutlined,
    ShoppingOutlined,
    UserOutlined,
    HistoryOutlined,
    EnvironmentOutlined,
    LogoutOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Header, Content, Sider } = Layout;

const ShipperLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    // Danh sách menu bên trái
    const items = [
        { key: '/shipper', icon: <HomeOutlined />, label: 'Trang chủ' },
        { key: '/shipper/orders', icon: <ShoppingOutlined />, label: 'Quản lý đơn hàng' },
        { key: '/shipper/history', icon: <HistoryOutlined />, label: 'Lịch sử đơn hàng' },
        { key: '/shipper/map', icon: <EnvironmentOutlined />, label: 'Bản đồ giao hàng' },
        { key: '/shipper/profile', icon: <UserOutlined />, label: 'Thông tin cá nhân' },
        { 
            key: 'logout', 
            icon: <LogoutOutlined />, 
            label: 'Đăng xuất',
            onClick: () => {
                logout();
                navigate('/login');
            }
        },
    ];

    return (
        <Layout style={{ minHeight: '100vh', margin: 0, padding: 0 }}>
            {/* 1. THANH SIDEBAR BÊN TRÁI */}
            <Sider 
                collapsible 
                collapsed={collapsed} 
                onCollapse={(value) => setCollapsed(value)}
                style={{ margin: 0, padding: 0 }}
            >
                <div style={{
                    height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white', textAlign: 'center', lineHeight: '32px', fontWeight: 'bold'
                }}>
                    SHIPPER
                </div>
                <Menu
                    theme="dark"
                    defaultSelectedKeys={['/shipper']}
                    selectedKeys={[location.pathname]}
                    mode="inline"
                    items={items}
                    onClick={({ key }) => {
                        if (key !== 'logout') {
                            navigate(key);
                        }
                    }}
                />
            </Sider>

            {/* 2. PHẦN NỘI DUNG BÊN PHẢI */}
            <Layout style={{ margin: 0, padding: 0 }}>
                <Header style={{ padding: 0, margin: 0, background: colorBgContainer }} />

                <Content style={{ margin: 0, padding: 0 }}>
                    <div style={{
                        padding: '16px',
                        minHeight: '100vh',
                        background: colorBgContainer,
                        width: '100%',
                        boxSizing: 'border-box'
                    }}>
                        <Outlet />
                    </div>
                </Content>

            </Layout>
        </Layout>
    );
};

export default ShipperLayout;


