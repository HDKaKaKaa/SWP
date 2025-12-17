import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Bảng màu hiện đại cho các chi nhánh
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff4d4f'];

const ContributionPieChart = ({ data }) => {
    // Nếu không có dữ liệu, hiển thị thông báo trống
    if (!data || data.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <p>Không có dữ liệu chi nhánh</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    dataKey="totalRevenue" // Tên field doanh thu từ API
                    nameKey="restaurantName" // Tên field tên nhà hàng từ API
                    cx="50%"
                    cy="50%"
                    innerRadius={60} // Tạo hình vòng nhẫn (Donut chart) cho hiện đại
                    outerRadius={80}
                    paddingAngle={5}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip 
                    formatter={(value) => `${value?.toLocaleString('vi-VN')}₫`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                />
                <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default ContributionPieChart;