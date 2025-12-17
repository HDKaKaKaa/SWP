import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Select,
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

const { RangePicker } = DatePicker;

const CustomerStatsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ trend: [], categories: [], summary: {} });
  const [dates, setDates] = useState([dayjs().subtract(30, 'days'), dayjs()]);

  useEffect(() => {
    fetchStats();
  }, [dates, user]);

  const fetchStats = async () => {
    if (!user || !user.id) {
      return;
    }

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

  const COLORS = ['#ff6b35', '#4CAF50', '#2196F3', '#722ed1', '#eb2f96'];

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: '#f9f9f9',
        minHeight: '100vh',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            variant="outlined"
          >
            Quay lại đơn hàng
          </Button>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 30,
          }}
        >
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>
            Thống kê chi tiêu của tôi
          </h1>
          <RangePicker value={dates} onChange={setDates} format="DD/MM/YYYY" />
        </div>
      </motion.div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Row gutter={[24, 24]}>
          {/* Summary Cards */}
          <Col xs={24} md={8}>
            <Card className="stat-card orange">
              <Statistic
                title={<span style={{ color: '#fff' }}>Tổng chi tiêu</span>}
                value={data.summary.totalSpent}
                suffix="đ"
                valueStyle={{ color: '#fff', fontWeight: 800 }}
                prefix={<WalletOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="stat-card green">
              <Statistic
                title={<span style={{ color: '#fff' }}>Số đơn hoàn thành</span>}
                value={data.summary.orderCount}
                valueStyle={{ color: '#fff', fontWeight: 800 }}
                prefix={<ShoppingCartOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card className="stat-card blue">
              <Statistic
                title={
                  <span style={{ color: '#fff' }}>Trung bình mỗi đơn</span>
                }
                value={data.summary.avgOrderValue}
                suffix="đ"
                valueStyle={{ color: '#fff', fontWeight: 800 }}
                prefix={<FireOutlined />}
              />
            </Card>
          </Col>

          {/* Trend Chart */}
          <Col xs={24} lg={16}>
            <Card
              title="Biến động chi tiêu"
              bordered={false}
              style={{ borderRadius: 15, height: 450 }}
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

          {/* Category Pie Chart */}
          <Col xs={24} lg={8}>
            <Card
              title="Khẩu vị của bạn"
              bordered={false}
              style={{ borderRadius: 15, height: 450 }}
            >
              {data.categories.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={data.categories}
                      innerRadius={60}
                      outerRadius={100}
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
                    <Tooltip />
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

      <style>{`
        .stat-card { border-radius: 15px; border: none; transition: transform 0.3s; }
        .stat-card:hover { transform: translateY(-5px); }
        .stat-card.orange { background: linear-gradient(135deg, #ff9c6e 0%, #ff6b35 100%); }
        .stat-card.green { background: linear-gradient(135deg, #95de64 0%, #4CAF50 100%); }
        .stat-card.blue { background: linear-gradient(135deg, #69c0ff 0%, #2196F3 100%); }
      `}</style>
    </div>
  );
};

export default CustomerStatsPage;
