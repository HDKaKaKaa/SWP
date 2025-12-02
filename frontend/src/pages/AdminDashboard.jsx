import React, { useEffect, useState } from 'react';
import { Spin, message } from 'antd';
import { getDashboardStats, getRevenueChart } from '../services/adminService';
import DashboardStats from '../components/DashboardStats';
import RevenueChart from '../components/RevenueChart';

const AdminDashboard = () => {
    // State lưu dữ liệu
    const [stats, setStats] = useState({
        totalRevenue: 0,
        todayOrders: 0,
        totalActiveRestaurants: 0,
        totalOnlineShippers: 0
    });
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Gọi API khi vào trang
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [statsRes, chartRes] = await Promise.all([
                    getDashboardStats(),
                    getRevenueChart()
                ]);
                setStats(statsRes);
                setChartData(chartRes);
            } catch (error) {
                message.error("Không thể tải dữ liệu dashboard!");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div style={{ textAlign: 'center', marginTop: 50 }}><Spin size="large" /></div>;

    return (
        <div>
            <h2 style={{ marginBottom: 20 }}>Tổng quan hệ thống</h2>

            {/* Component 1: Hiển thị 4 ô số liệu */}
            <DashboardStats stats={stats} />

            {/* Component 2: Hiển thị biểu đồ */}
            <RevenueChart data={chartData} />
        </div>
    );
};

export default AdminDashboard;