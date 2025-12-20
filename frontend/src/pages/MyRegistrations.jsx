import React, { useContext, useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Typography,
  message,
  Space,
  Image,
  Tooltip,
} from 'antd';
import {
  EditOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StopOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import '../css/RestaurantRegistration.css';

const MyRegistrations = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyRestaurants = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const response = await axios.get(
          `http://localhost:8080/api/restaurants/account/${user.id}`
        );
        setData(response.data);
      } catch (error) {
        message.error('Lỗi tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    fetchMyRestaurants();
  }, [user]);

  const columns = [
    {
      title: 'Tên quán',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text) => (
        <b style={{ fontSize: '16px', color: '#333' }}>{text}</b>
      ),
    },
    {
      title: 'Ảnh',
      dataIndex: 'coverImage',
      key: 'coverImage',
      render: (src) => (
        <Image
          width={60}
          height={60}
          src={src}
          style={{
            objectFit: 'cover',
            borderRadius: '12px',
            border: '1px solid #eee',
          }}
          fallback="https://via.placeholder.com/60"
        />
      ),
    },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address', ellipsis: true },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (status, record) => {
        let color = 'default';
        let icon = null;
        let text = status;
        if (status === 'PENDING') {
          color = 'orange';
          icon = <ClockCircleOutlined />;
          text = 'Chờ duyệt';
        }
        if (status === 'ACTIVE') {
          color = 'success';
          icon = <CheckCircleOutlined />;
          text = 'Hoạt động';
        }
        if (status === 'CLOSE') {
          color = 'default';
          icon = <StopOutlined />;
          text = 'Đã đóng';
        }
        if (status === 'REJECTED') {
          color = 'error';
          icon = <CloseCircleOutlined />;
          text = 'Từ chối';
          if (record.rejectionReason) {
            return (
              <Tooltip title={record.rejectionReason}>
                <Tag
                  icon={icon}
                  color={color}
                  style={{
                    fontSize: '13px',
                    padding: '5px 12px',
                    borderRadius: '20px',
                    cursor: 'pointer',
                  }}
                >
                  {text}
                </Tag>
              </Tooltip>
            );
          }
        }
        if (status === 'BLOCKED') {
          color = 'error';
          icon = <StopOutlined />;
          text = 'Đã khóa';
        }
        return (
          <Tag
            icon={icon}
            color={color}
            style={{
              fontSize: '13px',
              padding: '5px 12px',
              borderRadius: '20px',
            }}
          >
            {text}
          </Tag>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          {(record.status === 'PENDING' || record.status === 'REJECTED') && (
            <Tooltip title="Sửa thông tin">
              <Button
                type="text"
                shape="circle"
                icon={<EditOutlined style={{ color: '#1890ff' }} />}
                onClick={() => navigate(`/restaurant/edit/${record.id}`)}
                style={{ background: '#e6f7ff' }}
              />
            </Tooltip>
          )}
          {record.status === 'ACTIVE' && (
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/owner/dashboard`)}
              style={{ borderRadius: '20px' }}
            >
              Quản lý
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="modern-page-container">
      <motion.div
        className="modern-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className="modern-header"
          style={{ padding: '20px', background: 'white', justifyContent: 'space-between', alignItems: 'center', display: 'flex' }}
        >
          {/* Header riêng cho bảng: nền trắng, chữ cam */}
          <div>
            <h2 style={{ color: '#ff6b35', fontSize: '24px', textAlign: 'left' }}>
              Lịch sử đăng ký quán
            </h2>
            <p style={{ color: '#888', textAlign: 'left', margin: 0 }}>
              Theo dõi trạng thái các quán ăn của bạn
            </p>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/restaurant-registration')}
            style={{
              background: '#ff6b35',
              borderColor: '#ff6b35',
              borderRadius: '8px',
              fontWeight: 'bold',
              boxShadow: '0 4px 10px rgba(255, 107, 53, 0.3)',
            }}
          >
            ĐĂNG KÝ QUÁN MỚI
          </Button>
        </div>
        <div style={{ padding: '0 20px 40px 20px' }}>
          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 6 }}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default MyRegistrations;
