/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useContext } from "react";
import axios from "axios";
import { Row, Col, Card, Statistic, Switch,Select, DatePicker, Space, Typography, Spin, Empty, Table, notification } from 'antd';
import {
    DollarCircleOutlined,
    ShoppingCartOutlined,
    ShopOutlined,
    StarOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    CalendarOutlined,
    PieChartOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { AuthContext } from "../context/AuthContext";
import RevenueChart from "../components/RevenueChart";
import ContributionPieChart from "../components/ContributionPieChart";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const OwnerDashboard = () => {
    const API_BASE_URL = "http://localhost:8080/api/owner";
    const { user } = useContext(AuthContext);

    // --- States Quản lý ID & Filters ---
    const [ownerId, setOwnerId] = useState(null);
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null); // null = Tất cả
    const [dateRange, setDateRange] = useState([dayjs().subtract(6, 'day'), dayjs()]);

    // --- States Dữ liệu Dashboard ---
    const [data, setData] = useState({
        stats: {
            totalRevenue: 0,
            revenueGrowth: 0,
            totalOrders: 0,
            orderGrowth: 0,
            activeProducts: 0,
            avgRating: 0
        },
        chartData: [],
        branchComparison: [], // Dữ liệu cho biểu đồ tròn & bảng xếp hạng
        topProducts: []
    });

    // 1. Lấy OwnerId từ AccountId (Giống OwnerProducts)
    useEffect(() => {
        if (!user) return;
        const fetchOwnerId = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/byAccount/${user.id}`);
                setOwnerId(res.data);
            } catch (err) {
                console.error("Lỗi lấy ownerId:", err);
            }
        };
        fetchOwnerId();
    }, [user]);

    // 2. Lấy danh sách nhà hàng cho Dropdown
    useEffect(() => {
        if (!user) return;
        const loadRestaurants = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/restaurants`, {
                    params: { accountId: user.id },
                });
                setRestaurants(res.data);
            } catch (err) {
                console.error("Lỗi tải danh sách nhà hàng:", err);
            }
        };
        loadRestaurants();
    }, [user]);

    // 3. Hàm fetch dữ liệu tổng hợp
    const fetchDashboardData = useCallback(async () => {
        if (!ownerId) return;
        setLoading(true);

        try {
            const params = {
                ownerId,
                restaurantId: selectedRestaurant || null,
                startDate: dateRange[0].format('YYYY-MM-DD'),
                endDate: dateRange[1].format('YYYY-MM-DD'),
            };

            const response = await axios.get(`${API_BASE_URL}/dashboard/all-data`, { params });
            setData(response.data);
        } catch (error) {
            notification.error({ message: 'Lỗi', description: 'Không thể tải dữ liệu báo cáo.' });
        } finally {
            setLoading(false);
        }
    }, [ownerId, selectedRestaurant, dateRange]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // --- Helper render xu hướng tăng trưởng ---
    const renderTrend = (value) => {
        const isPositive = value >= 0;
        return (
            <div style={{ marginTop: 8 }}>
                <Text type={isPositive ? 'success' : 'danger'} strong>
                    {isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(value)}%
                </Text>
                <Text type="secondary" style={{ fontSize: '12px', marginLeft: 4 }}>so với kỳ trước</Text>
            </div>
        );
    };

    return (
        <div style={{ padding: '24px', background: '#f5f7fa', minHeight: '100vh' }}>
            {/* Header Area */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={2} style={{ margin: 0 }}>Báo cáo kinh doanh</Title>
                    <Text type="secondary">Theo dõi hiệu quả hoạt động của các nhà hàng</Text>
                </Col>
                <Col>
                    <Space size="middle" wrap>
                        <Select
                            showSearch
                            style={{ width: 250 }}
                            placeholder="Tất cả nhà hàng"
                            value={selectedRestaurant}
                            allowClear
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                            onChange={(val) => setSelectedRestaurant(val)}
                        >
                            <Option value={null}>Tất cả nhà hàng</Option>
                            {restaurants.map(r => <Option key={r.id} value={r.id}>{r.name}</Option>)}
                        </Select>
                        <RangePicker
                            value={dateRange}
                            onChange={(dates) => setDateRange(dates)}
                            format="DD/MM/YYYY"
                        />
                    </Space>
                </Col>
            </Row>

            {/* 4 Quick Stats Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} hoverable>
                        <Statistic
                            title="Doanh thu"
                            value={data.stats.totalRevenue}
                            suffix="đ"
                            valueStyle={{ color: '#3f8600' }}
                            prefix={<DollarCircleOutlined />}
                        />
                        {renderTrend(data.stats.revenueGrowth)}
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} hoverable>
                        <Statistic
                            title="Tổng đơn hàng"
                            value={data.stats.totalOrders}
                            prefix={<ShoppingCartOutlined />}
                        />
                        {renderTrend(data.stats.orderGrowth)}
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} hoverable>
                        <Statistic title="Sản phẩm hoạt động" value={data.stats.activeProducts} prefix={<ShopOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} hoverable>
                        <Statistic title="Đánh giá trung bình" value={data.stats.avgRating} precision={1} prefix={<StarOutlined style={{ color: '#fadb14' }} />} suffix="/ 5" />
                    </Card>
                </Col>
            </Row>

            {/* Main Charts Row */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} xl={16}>
                    <Card
                        title={<span><CalendarOutlined /> Biến động doanh thu</span>}
                        styles={{ body: { minHeight: 500, paddingBottom: 24 } }}
                    >
                        <Spin spinning={loading}>
                            <div style={{ height: 500 }}>
                                {data.chartData.length > 0 ? <RevenueChart data={data.chartData.map(item => ({
                                    label: item.date,
                                    value: item.revenue
                                }))} /> : <Empty />}
                            </div>
                        </Spin>
                    </Card>
                </Col>
                <Col xs={24} xl={8}>
                    <Card
                        title={<span><PieChartOutlined /> Tỉ trọng theo chi nhánh</span>}
                        bordered={false}
                        styles={{ body: { height: 400, overflow: 'hidden' } }}
                    >
                        <Spin spinning={loading}>
                            <div style={{ height: 350 }}>
                                {selectedRestaurant ? (
                                    <Empty description="Vui lòng chọn 'Tất cả nhà hàng' để xem tỉ trọng" />
                                ) : (
                                    <ContributionPieChart data={data.branchComparison} />
                                )}
                            </div>
                        </Spin>
                    </Card>
                </Col>
            </Row>

            {/* Bottom Tables Row */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title="Sản phẩm bán chạy nhất" bordered={false}>
                        <Table
                            dataSource={data.topProducts}
                            columns={[
                                { title: 'Món ăn', dataIndex: 'name', key: 'name' },
                                { title: 'Số lượng', dataIndex: 'soldCount', key: 'soldCount', align: 'center' },
                                { title: 'Doanh thu', dataIndex: 'revenue', key: 'revenue', align: 'right', render: v => `${v?.toLocaleString()}đ` }
                            ]}
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="Hiệu quả từng chi nhánh" bordered={false}>
                        <Table
                            dataSource={data.branchComparison}
                            columns={[
                                { title: 'Chi nhánh', dataIndex: 'restaurantName', key: 'restaurantName' },
                                { title: 'Đơn hàng', dataIndex: 'orderCount', key: 'orderCount', align: 'center' },
                                { title: 'Doanh thu', dataIndex: 'totalRevenue', key: 'totalRevenue', align: 'right', render: v => <strong>{v?.toLocaleString()}đ</strong> }
                            ]}
                            pagination={false}
                            size="small"
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default OwnerDashboard;