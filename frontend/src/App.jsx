import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
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
import ChangePasswordPage from './pages/ChangePasswordPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage';
import CategoriesPage from './pages/CategoriesPage';
import OrdersPage from './pages/OrdersPage';
import OwnerRestaurantPage from './components/OwnerRestaurantPage';
import OwnerOrders from './components/OwnerOrders';
import OwnerLayout from './components/OwnerLayout';
import OwnerProducts from './components/OwnerProduct';
import ShipperLayout from './components/ShipperLayout';
import ShipperDashboard from './pages/ShipperDashboard';
import ShipperOrders from './pages/ShipperOrders';
import ShipperHistory from './pages/ShipperHistory';
import ShipperOrderDetail from './pages/ShipperOrderDetail';
import ShipperMap from './pages/ShipperMap';
import ShipperProfile from './pages/ShipperProfile';
import RestaurantRegistration from './pages/RestaurantRegistration';
import RestaurantApprovalPage from './pages/RestaurantApprovalPage';
import RestaurantPage from './pages/RestaurantPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import OrderDetailPage from './pages/OrderDetailPage';
import MyRegistrations from './pages/MyRegistrations';
import RestaurantEdit from './pages/RestaurantEdit';
import CustomerIssueCreate from './pages/CustomerIssueCreate';
import CustomerIssueHistory from './pages/CustomerIssueHistory';
import AdminIssuesPage from './pages/AdminIssuesPage.jsx';
import ShipperManagementPage from './pages/ShipperManagementPage.jsx';
import OwnerFeedbackPage from './components/OwnerFeedbackPage';
import LiveMapPage from './pages/LiveMapPage.jsx';
import OwnerIssues from './components/OwnerIssues.jsx';
import OwnerDashboard from './components/OwnerDashboard.jsx';
import CustomerStatsPage from './pages/CustomerStatsPage';

const ClientLayoutWithFooter = () => (
  <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    <Header />
    <div style={{ flex: 1 }}>
      <Outlet />
    </div>
    <Footer />
  </div>
);

const AuthLayoutNoFooter = () => (
  <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
    <Header />
    <div style={{ flex: 1 }}>
      <Outlet />
    </div>
  </div>
);

function App() {
  return (
    <Routes>
      {/* ======================================================= */}
      {/* NHÓM 1: ADMIN (Sử dụng MainLayout có Sidebar)           */}
      {/* ======================================================= */}
      <Route path="/admin" element={<MainLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route
          path="restaurant-approval"
          element={<RestaurantApprovalPage />}
        />
        <Route path="restaurants" element={<RestaurantPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="shippers" element={<ShipperManagementPage />} />
        <Route path="issues" element={<AdminIssuesPage />} />
        <Route path="map" element={<LiveMapPage />} />
      </Route>

      {/* ======================================================= */}
      {/* NHÓM 2: SHIPPER (Sử dụng ShipperLayout có Sidebar)       */}
      {/* ======================================================= */}
      <Route path="/shipper" element={<ShipperLayout />}>
        <Route index element={<ShipperDashboard />} />
        <Route path="orders" element={<ShipperOrders />} />
        <Route path="history" element={<ShipperHistory />} />
        <Route path="history/:orderId" element={<ShipperOrderDetail />} />
        <Route path="map" element={<ShipperMap />} />
        <Route path="profile" element={<ShipperProfile />} />
      </Route>

      {/* ======================================================= */}
      {/* NHÓM 3: KHÁCH HÀNG (Sử dụng Header & Footer cũ)         */}
      {/* ======================================================= */}
      {/* Ta tạo một Route không có path để bao bọc layout khách */}
      <Route element={<ClientLayoutWithFooter />}>
        {/* Các trang con của khách hàng nằm trong này */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/restaurant/:id" element={<RestaurantDetail />} />

        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-success" element={<OrderSuccessPage />} />
        <Route path="/orders" element={<OrderDetailPage />} />
        <Route path="/my-spending" element={<CustomerStatsPage />} />
        <Route
          path="/restaurant-registration"
          element={<RestaurantRegistration />}
        />
        <Route path="/my-registrations" element={<MyRegistrations />} />
        <Route path="/restaurant/edit/:id" element={<RestaurantEdit />} />
        <Route path="/support/new" element={<CustomerIssueCreate />} />
        <Route path="/support" element={<CustomerIssueHistory />} />
      </Route>

      <Route element={<AuthLayoutNoFooter />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      {/* ======================================================= */}
      {/* NHÓM 4: CỬA HÀNG (OWNER)                                 */}
      {/* ======================================================= */}

      <Route path="/owner" element={<OwnerLayout />}>
        <Route index element={<OwnerDashboard />} />
        <Route path="dashboard" element={<OwnerDashboard />} />
        <Route path="products" element={<OwnerProducts />} />
        <Route path="orders" element={<OwnerOrders />} />
        <Route path="feedback" element={<OwnerFeedbackPage />} />
        <Route path="issues" element={<OwnerIssues />} />
        <Route path="restaurants" element={<OwnerRestaurantPage />} />
      </Route>
    </Routes>
  );
}

export default App;
