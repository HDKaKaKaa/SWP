import React, { useContext, useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Typography,
  message,
  Space,
  Card,
  Image,
} from 'antd';
import {
  EditOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const { Title } = Typography;

const MyRegistrations = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const navigate = useNavigate();

  const fetchMyRestaurants = async () => {
    if (!user || !user.id) return;

    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:8080/api/restaurants/account/${user.id}`
      );
      setData(response.data);
    } catch (error) {
      console.error(error);
      message.error('Không thể tải lịch sử đăng ký!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMyRestaurants();
    } else {
      navigate('/login');
    }
  }, [user, navigate]);

  // Cấu hình các cột cho bảng
  const columns = [
    {
      title: 'Tên quán',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <b>{text}</b>,
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
          style={{ objectFit: 'cover', borderRadius: '4px' }}
          fallback="https://via.placeholder.com/60"
        />
      ),
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
    },
    {
      title: 'Ngày đăng ký',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (date ? new Date(date).toLocaleString('vi-VN') : 'N/A'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        let icon = null;
        let text = status;

        switch (status) {
          case 'PENDING':
            color = 'orange';
            icon = <ClockCircleOutlined />;
            text = 'Đang chờ duyệt';
            break;
          case 'ACTIVE':
            color = 'success';
            icon = <CheckCircleOutlined />;
            text = 'Đang hoạt động';
            break;
          case 'REJECTED':
            color = 'error';
            icon = <CloseCircleOutlined />;
            text = 'Bị từ chối';
            break;
          case 'BLOCKED':
            color = 'red';
            icon = <StopOutlined />;
            text = 'Đã bị khóa';
            break;
          default:
            break;
        }
        return (
          <Tag
            icon={icon}
            color={color}
            style={{ fontSize: '14px', padding: '5px 10px' }}
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
        <Space size="middle">
          {(record.status === 'PENDING' || record.status === 'REJECTED') && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                navigate(`/restaurant/edit/${record.id}`);
              }}
            >
              Sửa thông tin
            </Button>
          )}

          {record.status === 'ACTIVE' && (
            <Button type="link" onClick={() => navigate(`/owner/dashboard`)}>
              Quản lý
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card>
        <div style={{ marginBottom: 20 }}>
          <Title level={3}>Lịch sử đăng ký quán ăn</Title>
          <p style={{ color: '#888' }}>
            Theo dõi trạng thái duyệt các quán ăn bạn đã đăng ký
          </p>
        </div>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 5 }}
        />
      </Card>
    </div>
  );
};

export default MyRegistrations;
