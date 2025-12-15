import React, { useEffect, useState, useMemo } from 'react';
import { Spin, message, DatePicker, Select, Card, Row, Col, Empty, Typography } from 'antd';
import { getDashboardStats } from '../services/adminService'; // Giữ hàm cũ cho Stats Card
import axios from 'axios';
import { debounce } from 'lodash';
import dayjs from 'dayjs';

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
    // 1. State cho Tổng quan (Stats Cards) - Dữ liệu tĩnh không đổi theo filter doanh thu
    const [generalStats, setGeneralStats] = useState({
        totalRevenue: 0, todayOrders: 0, totalActiveRestaurants: 0, totalOnlineShippers: 0
    });

    // 2. State cho Filter Doanh thu
    const [revenueData, setRevenueData] = useState({ totalPeriodRevenue: 0, chartData: [] });
    const [loading, setLoading] = useState(false);

    // Filter values
    const [dateRange, setDateRange] = useState([dayjs().subtract(6, 'day'), dayjs()]); // Mặc định 7 ngày
    const [selectedRestaurant, setSelectedRestaurant] = useState(null); // { label, value }

    // --- Hàm gọi API ---
    // API 1: Lấy số liệu chung (chạy 1 lần đầu)
    useEffect(() => {
        const fetchGeneralStats = async () => {
            try {
                const res = await getDashboardStats(); // Hàm cũ của bạn
                setGeneralStats(res);
            } catch (err) {
                console.error(err);
            }
        };
        fetchGeneralStats();
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

    return (
        <div>
            <Title level={3} style={{ marginBottom: 20 }}>Tổng quan hệ thống</Title>

            {/* PHẦN 1: STATS CARD (Luôn hiển thị tổng quan toàn sàn) */}
            {/* Lưu ý: Nếu bạn muốn ô "Tổng doanh thu" thay đổi theo filter, hãy truyền revenueData.totalPeriodRevenue vào đây */}
            <DashboardStats stats={{
                ...generalStats,
                // Nếu muốn ô Tổng doanh thu biến đổi theo filter thì dùng dòng dưới, không thì comment lại dùng generalStats.totalRevenue
                totalRevenue: revenueData.totalPeriodRevenue
            }} />

            {/* PHẦN 2: BỘ LỌC & BIỂU ĐỒ */}
            <Card title="Phân tích doanh thu chi tiết" bordered={false} style={{ marginTop: 24 }}>

                {/* --- THANH FILTER --- */}
                <Row gutter={16} style={{ marginBottom: 20 }}>
                    <Col span={8}>
                        <label style={{display: 'block', marginBottom: 5, fontWeight: 500}}>Khoảng thời gian:</label>
                        <RangePicker
                            style={{ width: '100%' }}
                            value={dateRange}
                            onChange={(dates) => setDateRange(dates)}
                            format="DD/MM/YYYY"
                            allowClear={false} // Không cho xóa để tránh lỗi null
                        />
                    </Col>
                    <Col span={8}>
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
                    <Col span={8} style={{ display: 'flex', alignItems: 'end' }}>
                        {selectedRestaurant && (
                            <div style={{ marginBottom: 5 }}>
                                Đang xem: <b style={{color: '#1677ff'}}>{selectedRestaurant.label}</b>
                            </div>
                        )}
                    </Col>
                </Row>

                {/* --- BIỂU ĐỒ --- */}
                <Spin spinning={loading}>
                    {/* Component Chart của bạn */}
                    <RevenueChart data={revenueData.chartData} />

                    {/* Hiển thị text tổng kết nhỏ bên dưới */}
                    <div style={{ textAlign: 'center', marginTop: 10, color: '#666' }}>
                        Tổng doanh thu trong giai đoạn này:
                        <b style={{ color: '#3f8600', fontSize: 16, marginLeft: 8 }}>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(revenueData.totalPeriodRevenue)}
                        </b>
                    </div>
                </Spin>
            </Card>
        </div>
    );
};

export default AdminDashboard;