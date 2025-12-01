import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../css/Header.css';

const Header = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="header-container">
      <div className="header-logo" onClick={() => navigate('/')}>
        Foorder
      </div>

      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span>
            Xin chào, <b>{user.fullName || user.username}</b>
          </span>
          <button
            onClick={handleLogout}
            style={{ padding: '5px 10px', cursor: 'pointer' }}
          >
            Đăng xuất
          </button>
        </div>
      ) : (
        <Link to="/login">
          <button className="header-login-btn">Đăng nhập</button>
        </Link>
      )}
    </div>
  );
};

export default Header;
