import React from 'react';
import '../css/Footer.css';
import { Row, Col } from 'antd';
import {
  FacebookFilled,
  InstagramFilled,
  YoutubeFilled,
} from '@ant-design/icons';

const Footer = () => {
  return (
    <div className="footer-wrapper">
      <div className="footer-container">
        <Row gutter={[32, 32]}>
          <Col xs={24} sm={12} md={6}>
            <h4 className="footer-title">Công ty</h4>
            <ul className="footer-list">
              <li>
                <a href="#">Giới thiệu</a>
              </li>
              <li>
                <a href="#">Trung tâm trợ giúp</a>
              </li>
              <li>
                <a href="#">Quy chế</a>
              </li>
              <li>
                <a href="#">Điều khoản sử dụng</a>
              </li>
            </ul>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <h4 className="footer-title">Danh mục</h4>
            <ul className="footer-list">
              <li>
                <a href="#">Đồ ăn</a>
              </li>
              <li>
                <a href="#">Nước uống</a>
              </li>
              <li>
                <a href="#">Thực phẩm</a>
              </li>
              <li>
                <a href="#">Bia & Rượu</a>
              </li>
            </ul>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <h4 className="footer-title">Ứng dụng</h4>
            <ul className="footer-list">
              <li>
                <a href="#">Tải App iOS</a>
              </li>
              <li>
                <a href="#">Tải App Android</a>
              </li>
            </ul>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <h4 className="footer-title">Kết nối</h4>
            <div
              style={{
                display: 'flex',
                gap: '15px',
                fontSize: '24px',
                color: '#666',
                justifyContent: 'center',
              }}
            >
              <FacebookFilled />
              <InstagramFilled />
              <YoutubeFilled />
            </div>
            <div style={{ marginTop: '20px' }}>
              <p style={{ fontSize: '12px', color: '#999' }}>
                Địa chỉ: Trường Đại học FPT - Km29 Đại lộ Thăng Long, xã Hòa
                Lạc, TP. Hà Nội
              </p>
            </div>
          </Col>
        </Row>
        <div className="copyright">
          &copy; 2025 Food Order Corporation. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default Footer;
