import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Spin,
  Empty,
  Button,
} from 'antd';
import {
  ArrowLeftOutlined,
  WalletOutlined,
  ShoppingCartOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import '../css/CustomerStatsPage.css'; // Import file CSS riêng

const { RangePicker } = DatePicker;

const CustomerStatsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    trend: [],
    categories: [],
    summary: { totalSpent: 0, orderCount: 0, avgOrderValue: 0 },
  });
  const [dates, setDates] = useState([dayjs().subtract(30, 'days'), dayjs()]);

  const COLORS = ['#ff6b35', '#4CAF50', '#2196F3', '#722ed1', '#eb2f96'];

  const fetchStats = async () => {
    if (!user || !user.id) return;

    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:8080/api/orders/customer/${user.id}/analytics`,
        {
          params: {
            startDate: dates[0].format('YYYY-MM-DD'),
            endDate: dates[1].format('YYYY-MM-DD'),
          },
        }
      );
      setData(res.data);
    } catch (error) {
      console.error('Lỗi lấy thống kê', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dates, user]);

  return (
    <div className="stats-container">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Nút quay lại nằm riêng đầu dòng */}
        <div className="back-button-wrapper">
          <Button
            className="btn-back"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
          >
            Quay lại đơn hàng
          </Button>
        </div>

        <div className="stats-header">
          <h1 className="stats-title">Thống kê chi tiêu của tôi</h1>
          <RangePicker value={dates} onChange={setDates} format="DD/MM/YYYY" />
        </div>
      </motion.div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <Spin size="large" tip="Đang tải dữ liệu..." />
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            <Card className="stat-card orange">
              <Statistic
                title="Tổng chi tiêu"
                value={data.summary.totalSpent}
                suffix="đ"
                prefix={<WalletOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="stat-card green">
              <Statistic
                title="Số đơn hoàn thành"
                value={data.summary.orderCount}
                prefix={<ShoppingCartOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="stat-card blue">
              <Statistic
                title="Trung bình mỗi đơn"
                value={data.summary.avgOrderValue}
                suffix="đ"
                prefix={<FireOutlined />}
              />
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Card
              title="Biến động chi tiêu"
              variant="borderless"
              className="chart-card"
            >
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={data.trend}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ff6b35" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                  <Tooltip
                    formatter={(value) =>
                      new Intl.NumberFormat('vi-VN').format(value) + ' đ'
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#ff6b35"
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              title="Khẩu vị của bạn"
              variant="borderless"
              className="chart-card"
            >
              {data.categories.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={data.categories}
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.categories.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) =>
                        new Intl.NumberFormat('vi-VN').format(value) + ' đ'
                      }
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Empty description="Chưa có dữ liệu món ăn" />
              )}
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default CustomerStatsPage;
