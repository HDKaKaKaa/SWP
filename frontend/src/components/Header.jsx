import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../css/Header.css';
import { Button, Dropdown, Avatar, Space } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  ProfileOutlined,
  DownOutlined,
  ShopOutlined,
  DashOutlined,
  ShoppingCartOutlined,
  SaveOutlined,
} from '@ant-design/icons';

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Menu Dropdown cho User
  const items = [
    {
      key: '1',
      label: 'Tài khoản của tôi',
      icon: <ProfileOutlined />,
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider',
    },
    {
      key: '2',
      label: 'Xem chi tiết đơn hàng',
      icon: <ShoppingCartOutlined />,
      onClick: () => navigate('/orders'),
    },
    {
      type: 'divider',
    },
    {
      key: '3',
      label: 'Đổi mật khẩu',
      icon: <DashOutlined />,
      onClick: () => navigate('/change-password'),
    },
    {
      type: 'divider',
    },
    {
      key: '4',
      label: 'Đăng ký quán ăn',
      icon: <ShopOutlined />,
      onClick: () => navigate('/restaurant-registration'),
    },
    {
      type: 'divider',
    },
    {
      key: 'history-reg',
      label: 'Lịch sử đăng ký quán',
      icon: <SaveOutlined />,
      onClick: () => navigate('/my-registrations'),
    },
    {
      type: 'divider',
    },
    {
      key: 'support',
      label: 'Yêu cầu hỗ trợ / Khiếu nại',
      icon: <ProfileOutlined />,
      onClick: () => navigate('/support/new'),
    },
    {
      type: 'divider',
    },
    {
      key: 'support-history',
      label: 'Lịch sử yêu cầu hỗ trợ',
      icon: <ShoppingCartOutlined />,
      onClick: () => navigate('/support'),
    },
    {
      type: 'divider',
    },
    {
      key: '5',
      label: 'Đăng xuất',
      icon: <LogoutOutlined />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <div className="header-wrapper">
      <div className="header-container">
        {/* LOGO */}
        <div className="header-logo" onClick={() => navigate('/')}>
          <span style={{ fontSize: '30px' }}>🍲</span> Food Order
        </div>

        {/* USER INFO */}
        {user ? (
          <Dropdown menu={{ items }} trigger={['click']}>
            <div className="user-menu">
              <Avatar
                style={{ backgroundColor: '#ee4d2d' }}
                icon={<UserOutlined />}
              />
              <Space className="user-name">
                {user.fullName || user.username}{' '}
                <DownOutlined style={{ fontSize: '10px' }} />
              </Space>
            </div>
          </Dropdown>
        ) : (
          <div className="auth-buttons">
            <Button type="text" onClick={() => navigate('/login')}>
              Đăng nhập
            </Button>
            <Button type="primary" onClick={() => navigate('/register')}>
              Đăng ký
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
