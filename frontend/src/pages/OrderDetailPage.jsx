import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  message,
  Modal,
  Rate,
  Input,
  Space,
  Row,
  Col,
  Select,
  DatePicker,
} from 'antd';
import {
  StarOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { getCustomerOrders, createFeedback } from '../services/orderService';
import dayjs from 'dayjs';
import OrderTrackingModal from '../components/OrderTrackingModal';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

const OrderDetailPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [shipperRating, setShipperRating] = useState(5);
  const [shipperComment, setShipperComment] = useState('');
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [orderToTrack, setOrderToTrack] = useState(null);

  // Filter và search states
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState(null);
  const [ratingFilter, setRatingFilter] = useState('ALL');

  useEffect(() => {
    if (user && user.id) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await getCustomerOrders(user.id);
      setOrders(data);
      setFilteredOrders(data);
    } catch (error) {
      message.error('Không thể tải danh sách đơn hàng!');
    } finally {
      setLoading(false);
    }
  };

  // Áp dụng filter và search
  useEffect(() => {
    applyFilters();
  }, [orders, searchText, statusFilter, dateRange, ratingFilter]);

  const applyFilters = () => {
    let filtered = [...orders];

    // Lọc theo từ khóa tìm kiếm
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((order) => {
        // Tìm theo mã đơn hàng
        const orderNumber = (
          order.orderNumber ||
          order.id?.toString() ||
          ''
        ).toLowerCase();
        // Tìm theo tên quán
        const restaurantName = (order.restaurantName || '').toLowerCase();
        // Tìm theo tên món
        const productNames =
          order.orderItems
            ?.map((item) => item.productName?.toLowerCase() || '')
            .join(' ') || '';

        return (
          orderNumber.includes(searchLower) ||
          restaurantName.includes(searchLower) ||
          productNames.includes(searchLower)
        );
      });
    }

    // Lọc theo trạng thái
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    // Lọc theo khoảng thời gian
    if (dateRange && dateRange.length === 2) {
      const startDate = dateRange[0].startOf('day');
      const endDate = dateRange[1].endOf('day');
      filtered = filtered.filter((order) => {
        const orderDate = dayjs(order.createdAt);
        return (
          orderDate.isAfter(startDate.subtract(1, 'day')) &&
          orderDate.isBefore(endDate.add(1, 'day'))
        );
      });
    }

    // Lọc theo đánh giá
    if (ratingFilter === 'HAS_RATING') {
      filtered = filtered.filter(
        (order) => order.hasFeedback && order.feedbackRating
      );
    } else if (ratingFilter === 'NO_RATING') {
      filtered = filtered.filter(
        (order) => !order.hasFeedback || !order.feedbackRating
      );
    }

    // Sắp xếp theo thời gian tạo mới nhất lên đầu
    filtered.sort((a, b) => {
      if (a.createdAt == null && b.createdAt == null) return 0;
      if (a.createdAt == null) return 1;
      if (b.createdAt == null) return -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    setFilteredOrders(filtered);
  };

  const handleResetFilters = () => {
    setSearchText('');
    setStatusFilter('ALL');
    setDateRange(null);
    setRatingFilter('ALL');
  };

  // Format số tiền
  const formatMoney = (amount) => {
    if (!amount) return '0 đ';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Format ngày tháng
  const formatDate = (dateString) => {
    if (!dateString) return 'Chưa có';
    return dayjs(dateString).format('DD/MM/YYYY HH:mm');
  };

  // Lấy màu tag theo status
  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'orange';
      case 'PAID':
        return 'purple';
      case 'PREPARING':
        return 'blue';
      case 'SHIPPING':
        return 'cyan';
      case 'COMPLETED':
        return 'green';
      case 'CANCELLED':
        return 'red';
      default:
        return 'default';
    }
  };

  // Dịch status sang tiếng Việt
  const getStatusText = (status) => {
    switch (status) {
      case 'PENDING':
        return 'Chờ xác nhận';
      case 'PAID':
        return 'Đã thanh toán';
      case 'PREPARING':
        return 'Đang chuẩn bị';
      case 'SHIPPING':
        return 'Đang giao';
      case 'COMPLETED':
        return 'Hoàn thành';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  // Mở modal đánh giá
  const handleOpenFeedback = (order) => {
    setSelectedOrder(order);
    // Nếu đã có feedback thì load dữ liệu cũ, nếu chưa thì để mặc định
    if (order.hasFeedback && order.feedbackRating) {
      setRating(order.feedbackRating);
      setComment(order.feedbackComment || '');
      setShipperRating(order.shipperRating || 5);
      setShipperComment(order.shipperComment || '');
    } else {
      setRating(5);
      setComment('');
      setShipperRating(5);
      setShipperComment('');
    }
    setFeedbackModalVisible(true);
  };

  // Xử lý đánh giá
  const handleSubmitFeedback = async () => {
    if (!rating) {
      message.warning('Vui lòng chọn số sao đánh giá nhà hàng!');
      return;
    }

    const hasShipper =
      selectedOrder.shipperName && selectedOrder.shipperName !== 'Chưa có';
    if (hasShipper && !shipperRating) {
      message.warning('Vui lòng chọn số sao đánh giá shipper!');
      return;
    }

    try {
      await createFeedback(
        selectedOrder.id,
        rating,
        comment,
        hasShipper ? shipperRating : null,
        hasShipper ? shipperComment : null
      );
      message.success('Đánh giá thành công!');
      setFeedbackModalVisible(false);
      setSelectedOrder(null);
      fetchOrders(); // Refresh danh sách
    } catch (error) {
      message.error(error.response?.data || 'Không thể gửi đánh giá!');
    }
  };

  const handleOpenTracking = async (orderSummary) => {
    try {
      message.loading({
        content: 'Đang tải dữ liệu đường đi...',
        key: 'tracking_load',
      });

      // Gọi API chi tiết đơn hàng để lấy đủ thông tin tọa độ (lat/long của quán và của đơn hàng)
      // Lưu ý: Bạn cần đảm bảo endpoint này trả về object restaurant có lat, long
      // Param shipperId=0 chỉ là giả định nếu API yêu cầu, nếu không cần thì bỏ qua
      const res = await axios.get(
        `http://localhost:8080/api/shipper/orders/${
          orderSummary.id
        }/detail?shipperId=${orderSummary.shipperId || 0}`
      );

      setOrderToTrack(res.data); // Set dữ liệu đầy đủ
      setTrackingModalVisible(true);
      message.success({ content: 'Đã tải xong!', key: 'tracking_load' });
    } catch (error) {
      console.error(error);
      // Fallback: Nếu lỗi API detail thì dùng tạm dữ liệu summary
      setOrderToTrack(orderSummary);
      setTrackingModalVisible(true);
      message.warning({
        content: 'Không tải được chi tiết bản đồ, dùng dữ liệu hiển thị.',
        key: 'tracking_load',
      });
    }
  };

  // Định nghĩa cột cho bảng
  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 50,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Chi tiết đơn',
      key: 'orderItems',
      width: 200,
      render: (_, record) => {
        if (!record.orderItems || record.orderItems.length === 0) {
          return 'Không có món';
        }
        return (
          <div>
            {record.orderItems.map((item, idx) => (
              <div key={idx} style={{ marginBottom: 4 }}>
                {item.productName} x {item.quantity}
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Tổng thanh toán',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 130,
      align: 'right',
      render: (amount) => formatMoney(amount),
    },
    {
      title: 'Tên quán',
      dataIndex: 'restaurantName',
      key: 'restaurantName',
      width: 120,
    },
    {
      title: 'Tên shipper',
      dataIndex: 'shipperName',
      key: 'shipperName',
      width: 140,
    },
    {
      title: 'Thời gian giao',
      dataIndex: 'deliveryTime',
      key: 'deliveryTime',
      width: 150,
      render: (time) => formatDate(time),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: 'Đánh giá',
      key: 'rating',
      width: 120,
      align: 'center',
      render: (_, record) => {
        if (record.hasFeedback && record.feedbackRating) {
          return (
            <Rate
              disabled
              value={record.feedbackRating}
              style={{ fontSize: 14 }}
            />
          );
        }
        return <span style={{ color: '#999' }}>Chưa đánh giá</span>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      fixed: 'right',
      render: (_, record) => {
        const actions = [];

        if (record.status === 'COMPLETED') {
          return (
            <Button
              type="primary"
              icon={<StarOutlined />}
              onClick={() => handleOpenFeedback(record)}
              size="small"
            >
              Đánh giá
            </Button>
          );
        }
        if (
          record.status === 'SHIPPING' ||
          (record.status === 'PREPARING' && record.shipperName)
        ) {
          actions.push(
            <Button
              key="track"
              icon={<EnvironmentOutlined />}
              onClick={() => handleOpenTracking(record)}
              size="small"
              style={{
                width: '100%',
                color: '#1890ff',
                borderColor: '#1890ff',
                backgroundColor: '#e6f7ff',
              }}
            >
              Theo dõi
            </Button>
          );
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {actions}
          </div>
        );
      },
    },
  ];

  return (
    <div
      style={{
        padding: '24px',
        minHeight: '100vh',
        backgroundColor: '#f0f2f5',
      }}
    >
      <Card
        title="Danh sách đơn hàng của tôi"
        bordered={false}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<BarChartOutlined />}
              onClick={() => navigate('/my-spending')}
              style={{ backgroundColor: '#ff6b35', borderColor: '#ff6b35' }}
            >
              Thống kê chi tiêu
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={fetchOrders}
              title="Làm mới"
            >
              Làm mới
            </Button>
          </Space>
        }
      >
        {/* Filter và Search Section */}
        <div
          style={{
            marginBottom: 16,
            padding: 16,
            backgroundColor: '#fafafa',
            borderRadius: 6,
          }}
        >
          <Row gutter={[16, 16]}>
            {/* Search */}
            <Col xs={24} sm={24} md={12} lg={8}>
              <Input
                placeholder="Tìm theo mã đơn, tên quán, món ăn..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>

            {/* Status Filter */}
            <Col xs={24} sm={12} md={6} lg={4}>
              <Select
                placeholder="Trạng thái"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
              >
                <Option value="ALL">Tất cả</Option>
                <Option value="PENDING">Chờ xác nhận</Option>
                <Option value="PAID">Đã thanh toán</Option>
                <Option value="PREPARING">Đang chuẩn bị</Option>
                <Option value="SHIPPING">Đang giao</Option>
                <Option value="COMPLETED">Hoàn thành</Option>
                <Option value="CANCELLED">Đã hủy</Option>
              </Select>
            </Col>

            {/* Rating Filter */}
            <Col xs={24} sm={12} md={6} lg={4}>
              <Select
                placeholder="Đánh giá"
                value={ratingFilter}
                onChange={setRatingFilter}
                style={{ width: '100%' }}
              >
                <Option value="ALL">Tất cả</Option>
                <Option value="HAS_RATING">Đã đánh giá</Option>
                <Option value="NO_RATING">Chưa đánh giá</Option>
              </Select>
            </Col>

            {/* Date Range */}
            <Col xs={24} sm={12} md={6} lg={6}>
              <RangePicker
                style={{ width: '100%' }}
                placeholder={['Từ ngày', 'Đến ngày']}
                value={dateRange}
                onChange={setDateRange}
                format="DD/MM/YYYY"
              />
            </Col>

            {/* Reset Button */}
            <Col xs={24} sm={12} md={6} lg={2}>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleResetFilters}
                style={{ width: '100%' }}
              >
                Reset
              </Button>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={filteredOrders}
          loading={loading}
          rowKey="id"
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 5,
            showSizeChanger: false,
            showTotal: (total) => `Tổng ${total} đơn hàng`,
          }}
        />
      </Card>

      {/* Modal đánh giá đơn hàng */}
      <Modal
        title="Đánh giá đơn hàng"
        open={feedbackModalVisible}
        onOk={handleSubmitFeedback}
        onCancel={() => {
          setFeedbackModalVisible(false);
          setSelectedOrder(null);
        }}
        okText="Gửi đánh giá"
        cancelText="Hủy"
        width={700}
      >
        {selectedOrder && (
          <div>
            <p>
              <strong>Mã đơn hàng:</strong>{' '}
              {selectedOrder.orderNumber || selectedOrder.id}
            </p>
            <p>
              <strong>Nhà hàng:</strong> {selectedOrder.restaurantName}
            </p>

            {/* Thông tin đơn hàng */}
            <div
              style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: '#fafafa',
                borderRadius: 6,
                border: '1px solid #e8e8e8',
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <strong>Món đã đặt:</strong>
              </div>
              <div style={{ marginBottom: 8 }}>
                {selectedOrder.orderItems &&
                selectedOrder.orderItems.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {selectedOrder.orderItems.map((item, idx) => (
                      <li key={idx} style={{ marginBottom: 4 }}>
                        {item.productName} x {item.quantity} -{' '}
                        {formatMoney(
                          item.price ? item.price * item.quantity : 0
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span style={{ color: '#999' }}>Không có món</span>
                )}
              </div>
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: '1px solid #e8e8e8',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <strong>Tổng thanh toán:</strong>
                <strong style={{ color: '#ff4d4f', fontSize: 16 }}>
                  {formatMoney(selectedOrder.totalAmount)}
                </strong>
              </div>
            </div>

            {/* Phần 1: Đánh giá món ăn, nhà hàng */}
            <div
              style={{
                marginTop: 24,
                padding: 16,
                backgroundColor: '#f5f5f5',
                borderRadius: 8,
                border: '1px solid #d9d9d9',
              }}
            >
              <h3
                style={{ marginBottom: 16, fontSize: 16, fontWeight: 'bold' }}
              >
                Đánh giá món ăn & nhà hàng
              </h3>
              <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <strong>Đánh giá:</strong>
                </div>
                <Rate value={rating} onChange={setRating} allowClear={false} />
              </div>
              <div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Nhận xét:</strong>
                </div>
                <TextArea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Nhập nhận xét của bạn về món ăn và nhà hàng..."
                />
              </div>
            </div>

            {/* Phần 2: Đánh giá shipper, thời gian giao */}
            {selectedOrder.shipperName &&
              selectedOrder.shipperName !== 'Chưa có' && (
                <div
                  style={{
                    marginTop: 24,
                    padding: 16,
                    backgroundColor: '#f5f5f5',
                    borderRadius: 8,
                    border: '1px solid #d9d9d9',
                  }}
                >
                  <h3
                    style={{
                      marginBottom: 16,
                      fontSize: 16,
                      fontWeight: 'bold',
                    }}
                  >
                    Đánh giá shipper & thời gian giao
                  </h3>
                  <p style={{ marginBottom: 12 }}>
                    <strong>Shipper:</strong> {selectedOrder.shipperName}
                  </p>
                  <p style={{ marginBottom: 12 }}>
                    <strong>Thời gian giao:</strong>{' '}
                    {formatDate(selectedOrder.deliveryTime)}
                  </p>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ marginBottom: 8 }}>
                      <strong>Đánh giá:</strong>
                    </div>
                    <Rate
                      value={shipperRating}
                      onChange={setShipperRating}
                      allowClear={false}
                    />
                  </div>
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <strong>Nhận xét:</strong>
                    </div>
                    <TextArea
                      rows={3}
                      value={shipperComment}
                      onChange={(e) => setShipperComment(e.target.value)}
                      placeholder="Nhập nhận xét của bạn về shipper và thời gian giao hàng..."
                    />
                  </div>
                </div>
              )}
          </div>
        )}
      </Modal>

      {/* Modal Tracking */}
      <OrderTrackingModal
        isOpen={trackingModalVisible}
        onClose={() => setTrackingModalVisible(false)}
        order={orderToTrack}
      />
    </div>
  );
};

export default OrderDetailPage;
