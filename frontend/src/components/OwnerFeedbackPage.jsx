/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import {
    Table,
    Select,
    Button,
    Space,
    Spin,
    message,
    Tag,
    Rate,
    Drawer,
    Typography,
    Card,
    Input,
    DatePicker,
    Descriptions,
    List,
} from 'antd';
import { StarFilled, ReloadOutlined, PhoneOutlined, ShoppingOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { AuthContext } from '../context/AuthContext';

const { Option } = Select;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// --- Cấu hình API Base URL ---
const API_BASE_URL = 'http://localhost:8080/api/owner';
const DISPLAY_DATE_FORMAT = 'DD/MM/YYYY HH:mm:ss';
const FILTER_DATE_FORMAT = 'DD/MM/YYYY';
const API_DATE_FORMAT = 'YYYY-MM-DD';

// Hàm định dạng tiền tệ
const formatCurrency = (amount) => {
    // Chuyển đổi sang số nếu cần, nếu null/undefined thì trả về chuỗi rỗng
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (typeof numericAmount !== 'number' || isNaN(numericAmount)) return '-';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(numericAmount);
};


const OwnerFeedbackPage = () => {
    // --- 1. Trạng thái Auth & Owner ID ---
    const { user } = useContext(AuthContext);
    const [ownerId, setOwnerId] = useState(null);
    const accountId = user ? user.id : null;

    // --- 2. Trạng thái Bộ lọc và Dữ liệu ---
    const [restaurants, setRestaurants] = useState([]);
    const [filterRestaurantId, setFilterRestaurantId] = useState('null');
    const [filterDateRange, setFilterDateRange] = useState(null);
    const [searchKeyword, setSearchKeyword] = useState(null);
    const [inputSearchValue, setInputSearchValue] = useState('');

    // --- 3. Trạng thái Phản hồi và Phân trang (CÓ KÈM SẮP XẾP) ---
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
        sortField: 'createdAt',
        sortOrder: 'descend',
    });

    // --- 4. Trạng thái Drawer xem chi tiết ---
    const [isDrawerVisible, setIsDrawerVisible] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState(null); // Giữ thông tin feedback (tên KH, tên NH, orderId)
    const [selectedOrderDetails, setSelectedOrderDetails] = useState(null); // Giữ chi tiết đơn hàng (items, totalAmount)
    const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);


    // =================================================================
    // A. Tải Owner ID và Danh sách Nhà hàng
    // =================================================================
    useEffect(() => {
        if (!user) return;

        // Logic 1: Lấy Owner ID từ Account ID
        const fetchOwnerId = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/byAccount/${user.id}`);
                const fetchedOwnerId = res.data;
                setOwnerId(fetchedOwnerId);

                // Sau khi có Owner ID, load restaurants
                loadRestaurants(fetchedOwnerId);

            } catch (err) {
                console.error("Không lấy được ownerId:", err);
            }
        };

        // Logic 2: Tải Danh sách Nhà hàng của Owner (Sử dụng Owner ID)
        const loadRestaurants = async (ownerId) => {
            try {
                const res = await axios.get(`${API_BASE_URL}/feedbacks/restaurants`, {
                    params: { ownerId }
                });
                setRestaurants(res.data);
            } catch (err) {
                console.error("Error fetching restaurants for filter:", err);
            }
        };

        fetchOwnerId();
    }, [user]);


    // =================================================================
    // B. Tải Feedback (Paging, Sorting, Filtering, Search)
    // =================================================================
    const fetchFeedbacks = useCallback(async (current, pageSize, sorter) => {
        if (!ownerId) {
            setFeedbacks([]); // Xóa dữ liệu cũ nếu ownerId không có
            setLoading(false);
            return;
        }

        setLoading(true);

        const startDate = filterDateRange && filterDateRange[0] ? filterDateRange[0].format(API_DATE_FORMAT) : null;
        const endDate = filterDateRange && filterDateRange[1] ? filterDateRange[1].format(API_DATE_FORMAT) : null;

        try {
            const order = sorter.order === 'ascend' ? 'asc' : (sorter.order === 'descend' ? 'desc' : null);
            const sortParam = order ? `${sorter.field || 'createdAt'},${order}` : 'createdAt,desc';

            const restaurantIdParam = filterRestaurantId === 'null' ? null : filterRestaurantId;

            const params = {
                ownerId: ownerId,
                page: current - 1,
                size: pageSize,
                sort: sortParam,
                ...(restaurantIdParam !== null && { restaurantId: restaurantIdParam }),
                ...(searchKeyword && { searchKeyword: searchKeyword.trim() }),
                ...(startDate && { startDate: startDate }),
                ...(endDate && { endDate: endDate }),
            };

            // Gọi API feedbacks
            const response = await axios.get(`${API_BASE_URL}/feedbacks`, { params });

            setFeedbacks(response.data.content);
            setPagination(prev => ({
                ...prev,
                current: current,
                pageSize: pageSize,
                total: response.data.totalElements,
                sortField: sorter.field || 'createdAt',
                sortOrder: sorter.order || 'descend'
            }));
        } catch (err) {
            console.error("Lỗi tải dữ liệu feedback:", err);
            message.error("Không thể tải dữ liệu feedback.");
            setFeedbacks([]);
            setPagination(prev => ({ ...prev, current: 1, total: 0 }));
        } finally {
            setLoading(false);
        }
    }, [ownerId, filterRestaurantId, searchKeyword, filterDateRange]);

    // Trigger việc tải lại dữ liệu khi ownerId hoặc bộ lọc/tìm kiếm thay đổi
    useEffect(() => {
        if (ownerId !== null) {
            // Khi bộ lọc thay đổi, reset về trang 1
            fetchFeedbacks(1, pagination.pageSize, { field: pagination.sortField, order: pagination.sortOrder });
        }
    }, [ownerId, filterRestaurantId, searchKeyword, filterDateRange]);


    //Chi tiết đơn cho Owner
    const fetchOrderDetails = useCallback(async (orderId) => {
        setLoadingOrderDetails(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/orders/${orderId}/details`);
            // API này trả về đầy đủ thông tin: items, totalAmount, createdAt, id, ...
            setSelectedOrderDetails(res.data);

        } catch (err) {
            console.error("Lỗi tải chi tiết đơn hàng:", err);
            message.error(`Không thể tải chi tiết đơn hàng #${orderId}.`);
            setSelectedOrderDetails(null);
        } finally {
            setLoadingOrderDetails(false);
        }
    }, []);


    // =================================================================
    // C. Xử lý Sự kiện Thay đổi Table (Sắp xếp và Phân trang)
    // =================================================================
    const handleTableChange = (newPagination, filters, sorter, extra) => {
        // Xử lý sorter khi sắp xếp nhiều cột hoặc một cột
        const sortParams = Array.isArray(sorter) ? sorter[0] : sorter;

        fetchFeedbacks(
            newPagination.current,
            newPagination.pageSize,
            {
                field: sortParams.field,
                order: sortParams.order
            }
        );
    };

    const handleSearch = (value) => {
        setInputSearchValue(value);
        setSearchKeyword(value.trim() === '' ? null : value);
    };

    const handleDateRangeChange = (dates) => {
        // Khi thay đổi range date, reset về trang 1
        setFilterDateRange(dates);
    };

    const handleFilterChange = (setter, value) => {
        // Khi thay đổi filter, reset về trang 1
        setter(value);
    }

    const handleViewDetails = (record) => {
        // 1. Lưu record để hiển thị thông tin cơ bản (Tên KH, Tên NH, Rating)
        setSelectedFeedback(record);

        // 2. Reset chi tiết đơn hàng cũ và mở Drawer
        setSelectedOrderDetails(null);
        setIsDrawerVisible(true);

        // 3. Gọi API để tải chi tiết đơn hàng
        if (record.orderId) {
            fetchOrderDetails(record.orderId);
        } else {
            message.warning("Đánh giá này không liên kết với Mã đơn hàng.");
        }
    };

    const handleCloseDrawer = () => {
        setIsDrawerVisible(false);
        setSelectedFeedback(null);
        setSelectedOrderDetails(null);
    };


    const columns = [
        {
            title: 'Mã Đơn',
            dataIndex: 'orderNumber',
            key: 'orderNumber',
            width: 150,
            sorter: true,
            align: 'center',
            sortDirections: ['descend', 'ascend'],
            render: (text) => <b>{text}</b>
        },
        {
            title: 'Khách hàng',
            dataIndex: 'customerName',
            key: 'customerName',
            width: 200,
            align: 'center',
            sorter: true,
            sortDirections: ['ascend', 'descend'],
            render: (name, record) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{name || <Tag color="default">Ẩn danh</Tag>}</div>
                    {record.customerPhone && (
                        <div style={{ fontSize: '0.9em', color: '#1890ff', marginTop: 2 }}>
                            <a href={`tel:${record.customerPhone}`} style={{ color: 'inherit' }}>
                                <PhoneOutlined style={{ marginRight: 4 }} />
                                {record.customerPhone}
                            </a>
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Nhà hàng',
            dataIndex: 'restaurantName',
            key: 'restaurantName',
            width: 180,
            align: 'center',
            render: (name) => <Text ellipsis={{ tooltip: name }}>{name}</Text>
        },
        {
            title: 'Rating',
            dataIndex: 'rating',
            key: 'rating',
            width: 120,
            sorter: true,
            sortDirections: ['descend', 'ascend'],
            align: 'center',
            render: (rating) => (
                <Rate disabled defaultValue={rating} count={5} character={<StarFilled />} style={{ fontSize: 1 }} />
            ),
        },
        {
            title: 'Nội dung Bình luận',
            dataIndex: 'comment',
            key: 'comment',
            ellipsis: true,
            align: 'center',
            render: (text) => (
                <Text
                    ellipsis={{ tooltip: text || 'Không có bình luận.' }}
                    style={{ maxWidth: 300, display: 'inline-block' }}
                >
                    {text || <Tag color="magenta">Chưa có bình luận</Tag>}
                </Text>
            ),
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            sorter: true,
            align: 'center',
            sortDirections: ['descend', 'ascend'],
            render: (dateString) => {
                if (!dateString) return '';
                return dayjs(dateString).format(DISPLAY_DATE_FORMAT);
            },
        },
        {
            title: 'Hành động',
            key: 'action',
            width: 100,
            align: 'center',
            render: (_, record) => (
                // Chỉ cho phép xem chi tiết nếu có orderId
                <Button
                    type="link"
                    onClick={() => handleViewDetails(record)}
                    size="small"
                    disabled={!record.orderId}
                >
                    Chi tiết
                </Button>
            ),
        },
    ];

    const dynamicColumns = columns.map(col => {
        if (col.sorter) {
            return {
                ...col,
                sortOrder: pagination.sortField === col.dataIndex ? pagination.sortOrder : null,
            };
        }
        return col;
    });


    const filterOptions = (
        <Space size="middle" wrap>
            {/* 1. Lọc theo Nhà hàng */}
            <Select
                style={{ width: 250 }}
                placeholder="Lọc theo Nhà hàng"
                value={filterRestaurantId}
                onChange={(value) => handleFilterChange(setFilterRestaurantId, value)}
                disabled={loading || restaurants.length === 0}
            >
                <Option value="null">Tất cả Nhà hàng</Option>
                {restaurants.map(r => (
                    <Option key={r.id} value={r.id}>
                        {r.name}
                    </Option>
                ))}
            </Select>

            {/* 2. Lọc theo Ngày tạo (RangePicker) */}
            <RangePicker
                style={{ width: 280 }}
                value={filterDateRange}
                onChange={handleDateRangeChange}
                format={FILTER_DATE_FORMAT}
                placeholder={["Ngày bắt đầu", "Ngày kết thúc"]}
                disabled={loading}
            />
            {/* 3. Ô Tìm kiếm Mã đơn, Tên KH, Comment */}
            <Input.Search
                placeholder="Tìm kiếm Mã đơn, Tên KH, Comment..."
                allowClear
                onSearch={handleSearch}
                onChange={(e) => setInputSearchValue(e.target.value)}
                value={inputSearchValue}
                style={{ width: 400, height: 32 }}
                enterButton
                loading={loading}
                disabled={loading}
            />
            <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                    fetchFeedbacks(pagination.current, pagination.pageSize, { field: pagination.sortField, order: pagination.sortOrder });
                }}
                loading={loading}
            >
                Tải lại
            </Button>
        </Space>
    );

    return (
        <div className="owner-feedback-page-antd" style={{ padding: 20 }}>
            <Title level={3} style={{ marginBottom: 16 }}>
                Quản Lý Đánh Giá & Phản Hồi
            </Title>
            <Card style={{ marginBottom: 20 }}>
                {filterOptions}
            </Card>

            <Spin spinning={loading || ownerId === null}>
                <Table
                    columns={dynamicColumns}
                    dataSource={feedbacks}
                    rowKey="id"
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50'],
                        showTotal: (total) => `Tổng ${total} mục`,
                    }}
                    onChange={handleTableChange}
                    style={{ marginTop: '20px' }}
                    locale={{ emptyText: "Không tìm thấy đánh giá nào." }}
                    scroll={{ x: 1000 }}
                    loading={loading} // Gán loading vào Table
                />
            </Spin>

            {/* --- DRAWER XEM CHI TIẾT --- */}
            <Drawer
                title={`Chi tiết Đơn Hàng (Mã đơn #${selectedOrderDetails?.orderNumber || selectedFeedback?.orderNumber || 'N/A'})`}
                width={450}
                placement="right"
                onClose={handleCloseDrawer}
                open={isDrawerVisible}
                // Dùng selectedFeedback để đảm bảo title luôn có thông tin dù chi tiết đơn hàng đang load
                destroyOnClose={true} // Đảm bảo state bên trong Drawer được reset
            >
                <Spin spinning={loadingOrderDetails}>
                    {selectedOrderDetails && selectedFeedback ? (
                        <>
                            {/* 1. THÔNG TIN ĐƠN HÀNG */}
                            <Title level={5} style={{ marginTop: 0 }}>
                                <ShoppingOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                                Thông tin Đơn hàng
                            </Title>
                            <Descriptions column={1} bordered size="small" style={{ marginBottom: 20 }}>
                                <Descriptions.Item label="Mã Đơn hàng">
                                    <Text strong>#{selectedOrderDetails.orderNumber}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Tổng tiền">
                                    {/* Sử dụng totalAmount từ selectedOrderDetails */}
                                    <Text strong type="danger">{formatCurrency(selectedOrderDetails.totalAmount)}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Thời gian đặt">
                                    {/* Sử dụng createdAt từ selectedOrderDetails */}
                                    {dayjs(selectedOrderDetails.createdAt).format(DISPLAY_DATE_FORMAT)}
                                </Descriptions.Item>
                                <Descriptions.Item label="Nhà hàng">
                                    {/* Sử dụng restaurantName từ selectedFeedback */}
                                    {selectedFeedback.restaurantName}
                                </Descriptions.Item>
                                <Descriptions.Item label="Khách hàng">
                                    {/* Sử dụng customerName/customerPhone từ selectedFeedback */}
                                    {selectedFeedback.customerName || 'Ẩn danh'} - {selectedFeedback.customerPhone || 'Không có SĐT'}
                                </Descriptions.Item>
                            </Descriptions>

                            {/* 2. CHI TIẾT CÁC MÓN ĂN */}
                            <Title level={5}>Chi tiết đơn ({selectedOrderDetails.items?.length || 0} món):</Title>
                            <Card style={{ marginBottom: 20, padding: 0 }} bodyStyle={{ padding: 0 }}>
                                {selectedOrderDetails.items && selectedOrderDetails.items.length > 0 ? (
                                    <List
                                        size="small"
                                        dataSource={selectedOrderDetails.items}
                                        renderItem={(item) => (
                                            <List.Item>
                                                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                                    {/* Dòng 1: Tên món ăn và Tổng tiền */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                                        <Text strong>
                                                            {item.quantity} x {item.productName}
                                                        </Text>
                                                        {/* price * quantity là tổng tiền cho món đó */}
                                                        <Text type="secondary" style={{ whiteSpace: 'nowrap' }}>{formatCurrency(item.price * item.quantity)}</Text>
                                                    </div>
                                                    {/* Dòng 2: Hiển thị Options */}
                                                    {item.options && item.options.length > 0 && (
                                                        <div style={{ marginTop: 4, fontSize: '0.85em', color: '#8c8c8c' }}>
                                                            {item.options.map((option, index) => (
                                                                <div key={index}>+ {option}</div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </List.Item>
                                        )}
                                    />
                                ) : (
                                    <div style={{ padding: 12, textAlign: 'center' }}>
                                        <Text type="secondary">Đơn hàng này không có chi tiết món ăn.</Text>
                                    </div>
                                )}
                            </Card>
                        </>
                    ) : (
                        !loadingOrderDetails && <Text type="warning">Không thể tải chi tiết đơn hàng này.</Text>
                    )}
                </Spin>
            </Drawer>
        </div >
    );
};

export default OwnerFeedbackPage;