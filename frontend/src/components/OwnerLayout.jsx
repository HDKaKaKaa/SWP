/* eslint-disable no-unused-vars */
import React, { useState, useContext } from 'react';
import { Layout, Menu, theme, Dropdown, Space } from 'antd';
import {
    PieChartOutlined, ShopOutlined, FileTextOutlined, CommentOutlined, IssuesCloseOutlined, UserOutlined, LogoutOutlined, DashOutlined, DownOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
const { Header, Content, Sider } = Layout;

const OwnerLayout = () => {
    const { user, logout } = useContext(AuthContext);
    const [collapsed, setCollapsed] = useState(false);

    // 1. STATE VÀ HOVER HANDLERS (Để xử lý hiệu ứng Hover)
    const [isHovered, setIsHovered] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const { token: { colorBgContainer } } = theme.useToken();

    // MENU DROP DOWN CHO SIDER HEADER
    const ownerMenuItems = [
        {
            key: '1',
            label: 'Tài khoản của tôi',
            icon: <UserOutlined />,
            onClick: () => navigate('/profile'),
        },
        { type: 'divider' },
        {
            key: '2',
            label: 'Đăng ký quán ăn',
            icon: <ShopOutlined />,
            onClick: () => navigate('/restaurant-registration'),
        },
        {
            key: '3',
            label: 'Đổi mật khẩu',
            icon: <DashOutlined />,
            onClick: () => navigate('/change-password'),
        },
        { type: 'divider' },
        {
            key: '4',
            label: 'Đăng xuất',
            icon: <LogoutOutlined />,
            danger: true,
            onClick: handleLogout,
        },
    ];

    // MENU CHÍNH CHO SIDER
    const items = [
        { key: '/owner/dashboard', icon: <PieChartOutlined />, label: 'Tổng quan' },
        { key: '/owner/restaurants', icon: <ShopOutlined />, label: 'Nhà hàng' },
        { key: '/owner/products', icon: <ShopOutlined />, label: 'Các món' },
        { key: '/owner/orders', icon: <FileTextOutlined />, label: 'Đơn hàng' },
        { key: '/owner/feedback', icon: <CommentOutlined />, label: 'Đánh giá' },
        { key: '/owner/issues', icon: <IssuesCloseOutlined />, label: 'Sự cố' },
    ];

    const menuProps = {
        items: ownerMenuItems,
    };

    return (
        <Layout style={{ minHeight: '100vh' }}>

            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
            >
                <Dropdown
                    menu={menuProps}
                    trigger={['click']}
                    placement={collapsed ? "rightTop" : "rightBottom"}
                >
                    <div
                        className="sider-header"
                        style={{
                            height: 48,
                            background: isHovered ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: collapsed ? 'center' : 'flex-start',
                            padding: collapsed ? '0' : '0 16px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'background 0.3s',
                        }}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                    >
                        <Space
                            size={collapsed ? 0 : 8}
                            style={{
                                width: '100%',
                                justifyContent: collapsed ? 'center' : 'space-between',
                            }}
                        >
                            <Space size={8}>
                                <UserOutlined style={{
                                    fontSize: '16px',
                                    opacity: collapsed ? 1 : 0.85
                                }} />
                                {!collapsed && user && (
                                    <span style={{ fontWeight: 600, fontSize: '14px' }}>
                                        {user.fullName || user.username}
                                    </span>
                                )}
                            </Space>
                            {!collapsed && (
                                <DownOutlined style={{ fontSize: '10px', opacity: 0.8 }} />
                            )}
                        </Space>
                    </div>
                </Dropdown>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={items}
                    onClick={({ key }) => navigate(key)}
                />
            </Sider>

            <Layout style={{ margin: 0, padding: 0 }}>
                <Header style={{ background: colorBgContainer, padding: 0 }} />
                <Content style={{}}>
                    <div style={{
                        padding: 24,
                        minHeight: '100%',
                        background: colorBgContainer
                    }}>
                        <Outlet />
                    </div>
                </Content>
            </Layout>

        </Layout >
    );
};

export default OwnerLayout;