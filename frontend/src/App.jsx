import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import "bootstrap/dist/css/bootstrap.min.css";
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import RestaurantDetail from './pages/RestaurantDetail';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import MainLayout from './components/MainLayout';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';
import AdminUsersPage from './pages/AdminUsersPage';
import CategoriesPage from './pages/CategoriesPage';
import OrdersPage from './pages/OrdersPage';
import OwnerDashboard from './pages/OwnerDashboard';
import OwnerOrders from './components/OwnerOrders';
import OwnerLayout from './components/OwnerLayout';

// Tạo nhanh component placeholder để menu admin bấm không bị lỗi
const RestaurantsPage = () => <h2>Quản lý Nhà hàng</h2>;
const ShippersPage = () => <h2>Quản lý Tài xế</h2>;

function App() {
    return (
        
            <Routes>

            {/* ======================================================= */}
            {/* NHÓM 1: ADMIN (Sử dụng MainLayout có Sidebar)           */}
            {/* ======================================================= */}
            <Route path="/admin" element={<MainLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="categories" element={<CategoriesPage />} />
                <Route path="restaurants" element={<RestaurantsPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="shippers" element={<ShippersPage />} />
            </Route>


                {/* ======================================================= */}
                {/* NHÓM 2: KHÁCH HÀNG (Sử dụng Header & Footer cũ)         */}
                {/* ======================================================= */}
                {/* Ta tạo một Route không có path để bao bọc layout khách */}
                <Route
                    element={
                        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                            <Header />
                            <div style={{ flex: 1 }}>
                                <Outlet /> {/* Nội dung các trang Landing, Login... sẽ hiện ở đây */}
                            </div>
                            <Footer />
                        </div>
                    }
                >
                    {/* Các trang con của khách hàng nằm trong này */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/restaurant/:id" element={<RestaurantDetail />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                </Route>
                {/* ======================================================= */}
                {/* NHÓM 3: Cửa hàng       */}
                {/* ======================================================= */}
                <Route path="/owner" element={<OwnerLayout />}>
                    <Route index element={<OwnerDashboard />} />
                    <Route path="dashboard" element={<OwnerDashboard />} />
                    {/* <Route path="products" element={<OwnerProducts />} />     */}
                    <Route path="orders" element={<OwnerOrders />} />
                    {/* <Route path="reports" element={<OwnerReports />} />       */}
                </Route>

            </Routes>
        
    );
}

export default App;