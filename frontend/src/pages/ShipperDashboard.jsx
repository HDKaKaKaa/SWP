import React, { useEffect, useState, useRef } from 'react';
import { Card, Row, Col, Statistic, Button, Switch, message, Spin, List, Tag, Space, Pagination } from 'antd';
import {
    ShoppingOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CarOutlined,
    EyeOutlined,
    EnvironmentOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    getAvailableOrders,
    getMyOrders,
    acceptOrder,
    updateShipperStatus,
    getShipperProfile,
    updateOrderStatus,
    startDelivery
} from '../services/shipperService';
import '../css/ShipperDashboard.css';

const ShipperDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [availableOrders, setAvailableOrders] = useState([]);
    const [myOrders, setMyOrders] = useState([]);
    const [shipperStatus, setShipperStatus] = useState('OFFLINE'); // ONLINE, BUSY, OFFLINE
    const [loading, setLoading] = useState(true);
    const [shipperId, setShipperId] = useState(null);
    const [acceptTime, setAcceptTime] = useState(null); // Thời gian shipper nhận đơn
    const [deliveryStartTime, setDeliveryStartTime] = useState(null); // Thời gian bắt đầu giao hàng
    const [elapsedAcceptTime, setElapsedAcceptTime] = useState(0); // Thời gian từ lúc nhận đơn (giây)
    const [elapsedDeliveryTime, setElapsedDeliveryTime] = useState(0); // Thời gian từ lúc bắt đầu giao (giây)
    const [currentPage, setCurrentPage] = useState(1); // Trang hiện tại của phân trang
    const pageSize = 2; // Số đơn hàng mỗi trang

    // Giả sử shipperId được lưu trong user object hoặc lấy từ API
    useEffect(() => {
        if (user && user.id) {
            // Nếu user có shipperId, dùng nó. Nếu không, dùng accountId
            setShipperId(user.shipperId || user.id);
        } else {
            // Nếu không có user, vẫn cho phép xem đơn hàng có sẵn
            setShipperId(null);
        }
    }, [user]);

    // Load dữ liệu
    useEffect(() => {
        fetchData();
    }, [shipperId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            
            // Gọi API song song để tăng tốc độ
            const promises = [getAvailableOrders()];
            if (shipperId) {
                promises.push(getMyOrders(shipperId), getShipperProfile(shipperId));
            }
            
            const results = await Promise.all(promises);
            const available = results[0];
            
            // Sắp xếp đơn hàng có sẵn (backend đã sort, nhưng đảm bảo)
            setAvailableOrders(available.sort((a, b) => 
                new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
            ));
            
            if (shipperId && results.length === 3) {
                const [my, profile] = [results[1], results[2]];
                setMyOrders(my);
                setShipperStatus(profile.status || 'OFFLINE');
                
                // Xử lý timer cho đơn đang giao
                const shippingOrder = my.find(o => o.status === 'SHIPPING');
                if (profile.status === 'BUSY' && shippingOrder) {
                    // Thời gian từ lúc nhận đơn (shippedAt)
                    if (shippingOrder.shippedAt) {
                        setAcceptTime(new Date(shippingOrder.shippedAt).getTime());
                    } else {
                        setAcceptTime(null);
                    }
                    
                    // Thời gian từ lúc bắt đầu giao hàng (deliveryStartedAt)
                    if (shippingOrder.deliveryStartedAt) {
                        setDeliveryStartTime(new Date(shippingOrder.deliveryStartedAt).getTime());
                    } else {
                        setDeliveryStartTime(null);
                    }
                } else {
                    setAcceptTime(null);
                    setDeliveryStartTime(null);
                    setElapsedAcceptTime(0);
                    setElapsedDeliveryTime(0);
                }
            } else {
                setMyOrders([]);
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu:', error);
            message.error('Không thể tải dữ liệu! ' + (error.response?.data || error.message));
            setAvailableOrders([]);
            setMyOrders([]);
        } finally {
            setLoading(false);
        }
    };

    // Timer đếm thời gian từ lúc nhận đơn
    useEffect(() => {
        let interval = null;
        if (shipperStatus === 'BUSY' && acceptTime) {
            interval = setInterval(() => {
                const now = Date.now();
                const elapsed = Math.floor((now - acceptTime) / 1000);
                setElapsedAcceptTime(elapsed);
            }, 1000);
        } else {
            setElapsedAcceptTime(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [shipperStatus, acceptTime]);

    // Timer đếm thời gian từ lúc bắt đầu giao hàng
    useEffect(() => {
        let interval = null;
        if (shipperStatus === 'BUSY' && deliveryStartTime) {
            interval = setInterval(() => {
                const now = Date.now();
                const elapsed = Math.floor((now - deliveryStartTime) / 1000);
                setElapsedDeliveryTime(elapsed);
            }, 1000);
        } else {
            setElapsedDeliveryTime(0);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [shipperStatus, deliveryStartTime]);

    // Format thời gian (giây -> mm:ss hoặc hh:mm:ss)
    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Toggle trạng thái ONLINE/OFFLINE (chỉ cho phép khi không BUSY)
    const handleToggleStatus = async (checked) => {
        if (!shipperId) {
            message.warning('Vui lòng đăng nhập để sử dụng chức năng này!');
            console.warn('shipperId is null or undefined:', { shipperId, user });
            return;
        }
        if (shipperStatus === 'BUSY') {
            message.warning('Không thể đổi trạng thái khi đang giao hàng!');
            return;
        }
        try {
            console.log('Updating shipper status:', { shipperId, status: checked ? 'ONLINE' : 'OFFLINE' });
            await updateShipperStatus(shipperId, checked ? 'ONLINE' : 'OFFLINE');
            setShipperStatus(checked ? 'ONLINE' : 'OFFLINE');
            message.success(checked ? 'Đã bật trạng thái ONLINE' : 'Đã tắt trạng thái ONLINE');
            // Chỉ fetch lại profile để cập nhật status, không cần fetch toàn bộ
            if (shipperId) {
                const profile = await getShipperProfile(shipperId);
                setShipperStatus(profile.status || 'OFFLINE');
            }
        } catch (error) {
            // Xử lý error message đúng cách
            let errorMsg = 'Không thể cập nhật trạng thái!';
            if (error.response?.data) {
                // Nếu response.data là string, dùng trực tiếp
                if (typeof error.response.data === 'string') {
                    errorMsg += ' ' + error.response.data;
                } 
                // Nếu là object, lấy message hoặc chuyển thành string
                else if (error.response.data.message) {
                    errorMsg += ' ' + error.response.data.message;
                } else {
                    errorMsg += ' ' + JSON.stringify(error.response.data);
                }
            } else if (error.message) {
                errorMsg += ' ' + error.message;
            }
            message.error(errorMsg);
            console.error('Error updating shipper status:', {
                error,
                shipperId,
                status: checked ? 'ONLINE' : 'OFFLINE',
                response: error.response,
                responseData: error.response?.data
            });
        }
    };

    // Nhận đơn hàng
    const handleAcceptOrder = async (orderId) => {
        if (!shipperId) {
            message.warning('Vui lòng đăng nhập để nhận đơn hàng!');
            return;
        }
        if (shipperStatus !== 'ONLINE') {
            message.warning('Chỉ có thể nhận đơn khi ở trạng thái ONLINE!');
            return;
        }
        try {
            await acceptOrder(orderId, shipperId);
            message.success('Nhận đơn hàng thành công!');
            // Cập nhật trạng thái thành BUSY
            setShipperStatus('BUSY');
            setAcceptTime(null);
            setDeliveryStartTime(null);
            setElapsedAcceptTime(0);
            setElapsedDeliveryTime(0);
            setShipperStatus('BUSY');
            await fetchData();
        } catch (error) {
            message.error(error.response?.data || 'Không thể nhận đơn hàng!');
        }
    };

    // Bắt đầu giao hàng
    const handleStartDelivery = async (orderId) => {
        if (!shipperId) {
            message.warning('Vui lòng đăng nhập để sử dụng chức năng này!');
            return;
        }
        try {
            await startDelivery(orderId, shipperId);
            message.success('Đã bắt đầu giao hàng!');
            await fetchData();
        } catch (error) {
            message.error(error.response?.data || 'Không thể bắt đầu giao hàng!');
        }
    };

    // Hoàn thành đơn hàng
    const handleCompleteOrder = async (orderId) => {
        if (!shipperId) {
            message.warning('Vui lòng đăng nhập để sử dụng chức năng này!');
            return;
        }
        try {
            await updateOrderStatus(orderId, 'COMPLETED');
            message.success('Đơn hàng đã được hoàn thành!');
            await fetchData();
        } catch (error) {
            message.error(error.response?.data || 'Không thể hoàn thành đơn hàng!');
        }
    };

    // Hủy đơn hàng
    const handleCancelOrder = async (orderId) => {
        if (!shipperId) {
            message.warning('Vui lòng đăng nhập để sử dụng chức năng này!');
            return;
        }
        try {
            await updateOrderStatus(orderId, 'CANCELLED');
            message.success('Đơn hàng đã được hủy!');
            await fetchData();
        } catch (error) {
            message.error(error.response?.data || 'Không thể hủy đơn hàng!');
        }
    };

    // Điều chỉnh trang khi danh sách đơn hàng thay đổi
    useEffect(() => {
        const totalPages = Math.ceil(availableOrders.length / pageSize);
        if (totalPages > 0 && currentPage > totalPages) {
            setCurrentPage(totalPages);
        } else if (availableOrders.length > 0 && currentPage < 1) {
            setCurrentPage(1);
        }
    }, [availableOrders.length]);

    // Format số tiền
    const formatMoney = (amount) => 
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

    // Format ngày tháng
    const formatDate = (dateString) => 
        dateString ? new Date(dateString).toLocaleString('vi-VN') : 'N/A';

    // Lọc chỉ lấy đơn hàng đang giao (SHIPPING) để hiển thị trong phần "Đơn hàng đang ship"
    const shippingOrders = (myOrders || []).filter(o => o.status === 'SHIPPING');
    
    // Tính toán danh sách đơn hàng có sẵn để hiển thị theo phân trang
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedAvailableOrders = availableOrders.slice(startIndex, endIndex);
    
    // Đếm số đơn hàng theo trạng thái
    const shippingCount = shippingOrders.length;
    const completedCount = (myOrders || []).filter(o => o.status === 'COMPLETED').length;

    // Không cần useEffect để tạo map nữa vì đã dùng iframe trực tiếp trong JSX

    if (loading) {
        return <div style={{ textAlign: 'center', marginTop: 50 }}><Spin size="large" /></div>;
    }

    return (
        <div style={{ padding: 0, margin: 0, width: '100%' }}>
            {!shipperId && (
                <Card style={{ marginBottom: 16, background: '#fff7e6', border: '1px solid #ffd591' }}>
                    <p style={{ margin: 0, color: '#d46b08' }}>
                        ⚠️ Bạn chưa đăng nhập. Vui lòng đăng nhập với tài khoản shipper để sử dụng đầy đủ chức năng.
                    </p>
                </Card>
            )}
            
            {shipperId && (
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={24}>
                        <Card>
                            <Space style={{ width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h2 style={{ margin: 0 }}>Trạng thái hoạt động</h2>
                                    <p style={{ margin: '8px 0 0 0' }}>
                                        {shipperStatus === 'ONLINE' && 'Bật trạng thái ONLINE để nhận đơn hàng mới'}
                                        {shipperStatus === 'BUSY' && 'Đang giao hàng - Không thể nhận đơn mới'}
                                        {shipperStatus === 'OFFLINE' && 'Bật trạng thái ONLINE để nhận đơn hàng mới'}
                                    </p>
                                    {shipperStatus === 'BUSY' && shippingOrders.length > 0 && (
                                        <div style={{ marginTop: '8px' }}>
                                            {elapsedAcceptTime > 0 && (
                                                <p style={{ 
                                                    margin: '4px 0', 
                                                    fontSize: '14px', 
                                                    color: '#1890ff'
                                                }}>
                                                    ⏱️ Thời gian từ lúc nhận đơn: {formatTime(elapsedAcceptTime)}
                                                </p>
                                            )}
                                            {elapsedDeliveryTime > 0 ? (
                                                <p style={{ 
                                                    margin: '4px 0', 
                                                    fontSize: '16px', 
                                                    fontWeight: 'bold', 
                                                    color: shippingOrders.some(o => o.isOverdue) ? '#ff4d4f' : '#52c41a'
                                                }}>
                                                    🚚 Thời gian giao hàng: {formatTime(elapsedDeliveryTime)}
                                                    {shippingOrders.some(o => o.isOverdue) && (
                                                        <span style={{ marginLeft: '12px', color: '#ff4d4f' }}>
                                                            ⚠️ Đơn hàng đang quá hạn!
                                                        </span>
                                                    )}
                                                </p>
                                            ) : elapsedAcceptTime > 0 && (
                                                <p style={{ 
                                                    margin: '4px 0', 
                                                    fontSize: '14px', 
                                                    color: '#faad14'
                                                }}>
                                                    ⏳ Chưa bắt đầu giao hàng
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <Space direction="vertical" align="end" size="small">
                                    {shipperStatus === 'BUSY' ? (
                                        <Tag color="orange" style={{ fontSize: '16px', padding: '8px 16px', margin: 0 }}>
                                            BUSY
                                        </Tag>
                                    ) : (
                                        <div>
                                            <Switch
                                                checked={shipperStatus === 'ONLINE'}
                                                onChange={handleToggleStatus}
                                                checkedChildren="ONLINE"
                                                unCheckedChildren="OFFLINE"
                                                size="large"
                                                className={shipperStatus === 'ONLINE' ? 'shipper-online-switch' : ''}
                                            />
                                        </div>
                                    )}
                                </Space>
                            </Space>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Thống kê */}
            {shipperId && (
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Đơn hàng chờ ship"
                                value={availableOrders.length}
                                prefix={<ShoppingOutlined />}
                                valueStyle={{ color: '#3f8600' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Đang giao hàng"
                                value={shippingCount}
                                prefix={<CarOutlined />}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Đã hoàn thành"
                                value={completedCount}
                                prefix={<CheckCircleOutlined />}
                                valueStyle={{ color: '#722ed1' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card>
                            <Statistic
                                title="Tổng đơn hàng"
                                value={myOrders.length}
                                prefix={<ClockCircleOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>
            )}

            <Row gutter={16}>
                {/* Đơn hàng chờ ship */}
                <Col span={shipperId ? 12 : 24}>
                    <Card title="Đơn hàng chờ ship" style={{ marginBottom: 16 }}>
                        <List
                            dataSource={paginatedAvailableOrders}
                            renderItem={(order) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            type="primary"
                                            onClick={() => handleAcceptOrder(order.id)}
                                            disabled={shipperStatus !== 'ONLINE' || !shipperId}
                                        >
                                            Nhận đơn
                                        </Button>
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={`Đơn #${order.id} - ${order.restaurantName}`}
                                        description={
                                            <div>
                                                <p><strong>Địa chỉ:</strong> {order.shippingAddress}</p>
                                                <p><strong>Tổng tiền:</strong> {formatMoney(order.totalAmount)}</p>
                                                <p><strong>Thanh toán:</strong> <Tag>{order.paymentMethod}</Tag></p>
                                                <p><strong>Thời gian:</strong> {formatDate(order.createdAt)}</p>
                                            </div>
                                        }
                                    />
                                </List.Item>
                            )}
                            locale={{ emptyText: 'Không có đơn hàng nào' }}
                        />
                        {availableOrders.length > pageSize && (
                            <div style={{ marginTop: 16, textAlign: 'center' }}>
                                <Pagination
                                    current={currentPage}
                                    total={availableOrders.length}
                                    pageSize={pageSize}
                                    onChange={(page) => setCurrentPage(page)}
                                    showSizeChanger={false}
                                    showTotal={(total, range) => `${range[0]}-${range[1]} của ${total} đơn hàng`}
                                />
                            </div>
                        )}
                    </Card>
                </Col>

                {/* Đơn hàng đang ship - Chỉ hiển thị đơn đang giao (SHIPPING) */}
                {shipperId && (
                    <Col span={12}>
                        <Card title="Đơn hàng đang ship" style={{ marginBottom: 16 }}>
                            {shippingOrders.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                                    Bạn chưa có đơn hàng đang giao nào
                                </div>
                            ) : (
                                <List
                                    dataSource={shippingOrders}
                                    renderItem={(order) => (
                                        <List.Item style={{ padding: '16px 0' }}>
                                            <Row gutter={16} style={{ width: '100%' }}>
                                                {/* Mini Map bên trái - Click để xem bản đồ chi tiết */}
                                                <Col span={12}>
                                                    <div
                                                        onClick={() => navigate(`/shipper/map?orderId=${order.id}`)}
                                                        style={{
                                                            width: '100%',
                                                            height: '250px',
                                                            borderRadius: '8px',
                                                            overflow: 'hidden',
                                                            border: '1px solid #d9d9d9',
                                                            cursor: 'pointer',
                                                            position: 'relative'
                                                        }}
                                                        title="Click để xem bản đồ chi tiết"
                                                    >
                                                        {order.shippingLat && order.shippingLong ? (
                                                            <iframe
                                                                id={`map-${order.id}`}
                                                                width="100%"
                                                                height="100%"
                                                                frameBorder="0"
                                                                scrolling="no"
                                                                style={{ border: 'none', pointerEvents: 'none' }}
                                                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${order.shippingLong - 0.01},${order.shippingLat - 0.01},${order.shippingLong + 0.01},${order.shippingLat + 0.01}&layer=mapnik&marker=${order.shippingLat},${order.shippingLong}`}
                                                            />
                                                        ) : (
                                                            <div style={{
                                                                width: '100%',
                                                                height: '100%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                backgroundColor: '#f5f5f5',
                                                                color: '#999'
                                                            }}>
                                                                <div style={{ textAlign: 'center' }}>
                                                                    <EnvironmentOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />
                                                                    <div>Không có tọa độ</div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Overlay để hiển thị hint */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            bottom: 8,
                                                            right: 8,
                                                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                                            color: 'white',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px',
                                                            pointerEvents: 'none'
                                                        }}>
                                                            Click để xem bản đồ
                                                        </div>
                                                    </div>
                                                </Col>
                                                {/* Thông tin đơn hàng bên phải */}
                                                <Col span={12}>
                                                    <div>
                                                        <Space style={{ marginBottom: 8 }}>
                                                            <strong>Đơn #{order.id} - {order.restaurantName}</strong>
                                                            <Tag color={order.isOverdue ? "red" : "blue"}>SHIPPING</Tag>
                                                            {order.isOverdue && (
                                                                <Tag color="red" style={{ fontSize: '12px', fontWeight: 'bold' }}>
                                                                    ⚠️ QUÁ HẠN
                                                                </Tag>
                                                            )}
                                                        </Space>
                                                        <div style={{ marginTop: 12 }}>
                                                            <p style={{ margin: '4px 0' }}>
                                                                <strong>Khách hàng:</strong> {order.customerName || 'N/A'}
                                                            </p>
                                                            <p style={{ margin: '4px 0' }}>
                                                                <strong>Địa chỉ:</strong> {order.shippingAddress}
                                                            </p>
                                                            <p style={{ margin: '4px 0' }}>
                                                                <strong>Tổng tiền:</strong> {formatMoney(order.totalAmount)}
                                                            </p>
                                                            <p style={{ margin: '4px 0' }}>
                                                                <strong>Thanh toán:</strong> <Tag>{order.paymentMethod}</Tag>
                                                            </p>
                                                            <div style={{ marginTop: 12 }}>
                                                                <Space direction="vertical" style={{ width: '100%' }} size="small">
                                                                    <Button
                                                                        type="primary"
                                                                        icon={<EyeOutlined />}
                                                                        onClick={() => navigate(`/shipper/history/${order.id}`)}
                                                                        block
                                                                    >
                                                                        Xem chi tiết
                                                                    </Button>
                                                                    {!order.deliveryStartedAt && (
                                                                        <Button
                                                                            type="primary"
                                                                            style={{ backgroundColor: '#1890ff', borderColor: '#1890ff' }}
                                                                            icon={<CarOutlined />}
                                                                            onClick={() => handleStartDelivery(order.id)}
                                                                            block
                                                                        >
                                                                            Bắt đầu giao hàng
                                                                        </Button>
                                                                    )}
                                                                    {order.deliveryStartedAt && (
                                                                        <p style={{ 
                                                                            margin: '8px 0', 
                                                                            fontSize: '12px', 
                                                                            color: '#52c41a',
                                                                            textAlign: 'center'
                                                                        }}>
                                                                            ✅ Đã bắt đầu giao hàng lúc: {formatDate(order.deliveryStartedAt)}
                                                                        </p>
                                                                    )}
                                                                    <Space style={{ width: '100%' }} size="small">
                                                                        {/* Chỉ hiển thị nút "Hoàn thành" khi đã bắt đầu giao hàng */}
                                                                        {order.deliveryStartedAt && (
                                                                            <Button
                                                                                type="primary"
                                                                                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                                                                                onClick={() => handleCompleteOrder(order.id)}
                                                                                block
                                                                            >
                                                                                Hoàn thành
                                                                            </Button>
                                                                        )}
                                                                        <Button
                                                                            danger
                                                                            onClick={() => handleCancelOrder(order.id)}
                                                                            block
                                                                        >
                                                                            Hủy
                                                                        </Button>
                                                                    </Space>
                                                                </Space>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </List.Item>
                                    )}
                                />
                            )}
                        </Card>
                    </Col>
                )}
            </Row>
        </div>
    );
};

export default ShipperDashboard;

