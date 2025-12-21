import React, { useEffect, useState, useMemo } from 'react';
import { Spin, message, DatePicker, Select, Card, Row, Col, Empty, Typography, List, Avatar, Tag } from 'antd';
import { getDashboardStats } from '../services/adminService'; // Giữ hàm cũ cho Stats Card
import axios from 'axios';
import { debounce } from 'lodash';
import dayjs from 'dayjs';
import { CrownOutlined, UserOutlined } from '@ant-design/icons'; // [NEW] Icons

// Import components con
import DashboardStats from '../components/DashboardStats';
import RevenueChart from '../components/RevenueChart';

const { RangePicker } = DatePicker;
const { Title } = Typography;

const API_URL = 'http://localhost:8080/api/admin/dashboard';

// --- Component Debounce Select để tìm nhà hàng ---
const DebounceSelect = ({ fetchOptions, debounceTimeout = 800, ...props }) => {
    const [fetching, setFetching] = useState(false);
    const [options, setOptions] = useState([]);

    const loadOptions = (value) => {
        setOptions([]);
        setFetching(true);
        fetchOptions(value).then((newOptions) => {
            setOptions(newOptions);
            setFetching(false);
        });
    };

    const debounceFetcher = useMemo(() => {
        return debounce(loadOptions, debounceTimeout);
    }, [fetchOptions, debounceTimeout]);

    return (
        <Select
            showSearch
            labelInValue
            filterOption={false}
            onSearch={debounceFetcher}
            notFoundContent={fetching ? <Spin size="small" /> : <Empty description="Không tìm thấy" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            {...props}
            options={options}
        />
    );
};

// --- Component Chính ---
const AdminDashboard = () => {
    // 1. State cho Tổng quan (Stats Cards)
    const [generalStats, setGeneralStats] = useState({
        totalRevenue: 0, todayOrders: 0, totalActiveRestaurants: 0, totalOnlineShippers: 0
    });

    // 2. State cho Filter Doanh thu
    const [revenueData, setRevenueData] = useState({ totalPeriodRevenue: 0, chartData: [] });
    const [loading, setLoading] = useState(false);

    // [NEW] 3. State cho Top Khách hàng
    const [topCustomers, setTopCustomers] = useState([]);

    // Filter values
    const [dateRange, setDateRange] = useState([dayjs().subtract(6, 'day'), dayjs()]); // Mặc định 7 ngày
    const [selectedRestaurant, setSelectedRestaurant] = useState(null); // { label, value }

    // --- Hàm gọi API ---

    // API 1 & 3: Lấy số liệu chung và Top Customers (chạy 1 lần đầu)
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Gọi song song
                const [statsRes, topRes] = await Promise.all([
                    getDashboardStats(),
                    axios.get(`${API_URL}/top-customers`)
                ]);

                setGeneralStats(statsRes);
                setTopCustomers(topRes.data);
            } catch (err) {
                console.error("Lỗi tải dữ liệu ban đầu", err);
            }
        };
        fetchInitialData();
    }, []);

    // API 2: Lấy dữ liệu Doanh thu (Chạy mỗi khi Filter thay đổi)
    useEffect(() => {
        const fetchRevenueAnalysis = async () => {
            setLoading(true);
            try {
                const params = {};
                if (dateRange) {
                    params.startDate = dateRange[0].format('YYYY-MM-DD');
                    params.endDate = dateRange[1].format('YYYY-MM-DD');
                }
                if (selectedRestaurant) {
                    params.restaurantId = selectedRestaurant.value; // value là ID
                }

                const res = await axios.get(`${API_URL}/revenue-analysis`, { params });
                setRevenueData(res.data);
            } catch (error) {
                message.error("Lỗi tải dữ liệu doanh thu");
            } finally {
                setLoading(false);
            }
        };

        fetchRevenueAnalysis();
    }, [dateRange, selectedRestaurant]);

    // Hàm search cho Select
    const fetchRestaurantList = async (username) => {
        try {
            const res = await axios.get(`${API_URL}/restaurants-search`, { params: { keyword: username } });
            return res.data.map((r) => ({
                label: r.name,
                value: r.id,
            }));
        } catch (error) {
            return [];
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    return (
        <div>
            <Title level={3} style={{ marginBottom: 20 }}>Tổng quan hệ thống</Title>

            {/* PHẦN 1: STATS CARD */}
            <DashboardStats stats={{
                ...generalStats,
                totalRevenue: revenueData.totalPeriodRevenue // Update theo filter
            }} />

            {/* PHẦN 2: CHIA CỘT (Biểu đồ & Top Khách hàng) */}
            <Row gutter={24} style={{ marginTop: 24 }}>

                {/* --- CỘT TRÁI: BIỂU ĐỒ DOANH THU (Chiếm 16/24 phần) --- */}
                <Col xs={24} lg={16}>
                    <Card title="Phân tích doanh thu chi tiết" bordered={false} style={{ height: '100%' }}>

                        {/* Filter */}
                        <Row gutter={16} style={{ marginBottom: 20 }}>
                            <Col span={12}>
                                <label style={{display: 'block', marginBottom: 5, fontWeight: 500}}>Khoảng thời gian:</label>
                                <RangePicker
                                    style={{ width: '100%' }}
                                    value={dateRange}
                                    onChange={(dates) => setDateRange(dates)}
                                    format="DD/MM/YYYY"
                                    allowClear={false}
                                />
                            </Col>
                            <Col span={12}>
                                <label style={{display: 'block', marginBottom: 5, fontWeight: 500}}>Lọc theo nhà hàng:</label>
                                <DebounceSelect
                                    mode="single"
                                    value={selectedRestaurant}
                                    placeholder="Gõ tên quán để tìm kiếm..."
                                    fetchOptions={fetchRestaurantList}
                                    onChange={(newValue) => setSelectedRestaurant(newValue)}
                                    style={{ width: '100%' }}
                                    allowClear
                                />
                            </Col>
                        </Row>

                        {/* Chart */}
                        <Spin spinning={loading}>
                            <RevenueChart data={revenueData.chartData} />
                            <div style={{ textAlign: 'center', marginTop: 15, color: '#666' }}>
                                Tổng doanh thu giai đoạn này:
                                <b style={{ color: '#3f8600', fontSize: 16, marginLeft: 8 }}>
                                    {formatCurrency(revenueData.totalPeriodRevenue)}
                                </b>
                            </div>
                        </Spin>
                    </Card>
                </Col>

                {/* --- CỘT PHẢI: TOP 3 KHÁCH HÀNG (Chiếm 8/24 phần) --- */}
                <Col xs={24} lg={8}>
                    <Card
                        title={<span><CrownOutlined style={{color: '#faad14', marginRight: 8}} />Top Khách Hàng VIP</span>}
                        bordered={false}
                        style={{ height: '100%' }}
                    >
                        <List
                            itemLayout="horizontal"
                            dataSource={topCustomers}
                            renderItem={(item, index) => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={
                                            <div style={{position: 'relative'}}>
                                                <Avatar
                                                    size={48}
                                                    style={{
                                                        backgroundColor: index === 0 ? '#f56a00' : index === 1 ? '#7265e6' : '#ffbf00',
                                                        verticalAlign: 'middle'
                                                    }}
                                                    icon={<UserOutlined />}
                                                />
                                                {/* Hiển thị vương miện cho Top 1 */}
                                                {index === 0 && (
                                                    <CrownOutlined style={{
                                                        position: 'absolute', top: -8, right: -4,
                                                        color: '#faad14', fontSize: 18,
                                                        transform: 'rotate(15deg)',
                                                        filter: 'drop-shadow(1px 1px 0 #fff)'
                                                    }} />
                                                )}
                                            </div>
                                        }
                                        title={<span style={{fontWeight: 600, fontSize: 15}}>{item.fullName}</span>}
                                        description={
                                            <div>
                                                <div style={{fontSize: 12, color: '#888'}}>{item.phone}</div>
                                                <div style={{marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                                    <Tag color="cyan">{item.totalOrders} đơn</Tag>
                                                    <b style={{color: '#cf1322'}}>{formatCurrency(item.totalSpent)}</b>
                                                </div>
                                            </div>
                                        }
                                    />
                                    {/* Số thứ tự hạng */}
                                    <div style={{fontSize: 24, fontWeight: 'bold', color: '#f0f0f0', fontStyle: 'italic'}}>
                                        #{index + 1}
                                    </div>
                                </List.Item>
                            )}
                        />
                        {topCustomers.length === 0 && <Empty description="Chưa có dữ liệu" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default AdminDashboard;