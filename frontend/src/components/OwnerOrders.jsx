import React, { useState, useEffect, useCallback, useContext } from "react";
import axios from "axios";
import { Row, Col, notification } from "antd"; // Giữ lại Row, Col từ React-Bootstrap để quản lý layout (hoặc có thể dùng Grid của antd)
import { Table, Space, Tag, Select, Input, Button as AntButton, DatePicker } from 'antd'; // Ant Design Components
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'; // Icons từ antd
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { AuthContext } from "../context/AuthContext";

// Cần import CSS của DatePicker
import "react-datepicker/dist/react-datepicker.css"; // Giữ lại nếu muốn dùng tạm thời cho date range
// Hoặc đảm bảo bạn import CSS của antd DatePicker

const { Option } = Select;
const { Search } = Input;

// --- Component con để hiển thị Trạng thái Đơn hàng bằng Tag của Ant Design ---
const OrderStatusTag = ({ status }) => {
    const colorMap = {
        PENDING: "default",
        PAID: "geekblue",
        PREPARING: "processing",
        SHIPPING: "warning",
        COMPLETED: "success",
        CANCELLED: "error",
    };
    return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
};

// --- Component con để hiển thị chi tiết sản phẩm và thuộc tính (Không đổi) ---
const OrderItemDetails = ({ items }) => {
    if (!items || items.length === 0) {
        return <p className="text-muted fst-italic mb-0">Không có sản phẩm.</p>;
    }
    return (
        <ul className="list-unstyled mb-0 small">
            {items.map((item, index) => (
                <li key={index} className="mb-2 p-1 border-bottom">
                    <div className="fontSize: '1.2rem' fw-bold text-dark">{item.productName} (x{item.quantity})</div>

                    {item.options && item.options.length > 0 && (
                        <div className="ms-2">
                            {item.options.map((optionStr, optIndex) => (
                                <div key={optIndex} className="text-secondary" style={{ fontSize: '0.8rem' }}>
                                    • {optionStr}
                                </div>
                            ))}
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
};
// ----------------------------------------------------------------

export default function OwnerOrders() {
    const { user } = useContext(AuthContext);
    const [ownerId, setOwnerId] = useState(null);
    const accountId = user ? user.id : null;
    const [orders, setOrders] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);

    const [search, setSearch] = useState("");
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });

    const [sort, setSort] = useState({
        field: "createdAt",
        order: "descend",
    });

    const [loading, setLoading] = useState(false);

    // Hàm chuyển đổi Ant Design Sort Order sang Backend Sort Dir
    const mapSortOrderToDir = (order) => {
        if (order === 'ascend') return 'asc';
        if (order === 'descend') return 'desc';
        return 'desc'; // Mặc định
    };

    // Load Owner ID và Restaurants
    useEffect(() => {
        if (!user) return;
        const fetchOwnerId = async () => {
            try {
                const res = await axios.get(`http://localhost:8080/api/owner/byAccount/${user.id}`);
                setOwnerId(res.data);
            } catch (err) {
                console.error("Không lấy được ownerId:", err);
            }
        };

        const loadRestaurants = async () => {
            try {
                const res = await axios.get("http://localhost:8080/api/owner/restaurants", {
                    params: { accountId },
                });
                setRestaurants(res.data);
            } catch (err) {
                console.error("Error fetching restaurants:", err);
            }
        };

        fetchOwnerId();
        loadRestaurants();
    }, [user, accountId]);


    // Fetch Orders (Sử dụng state pagination và sort mới)
    const fetchOrders = useCallback(async () => {
        if (!ownerId) return;
        setLoading(true);

        const sortDir = mapSortOrderToDir(sort.order);

        try {
            const res = await axios.get("http://localhost:8080/api/owner/orders", {
                params: {
                    ownerId,
                    restaurantId: selectedRestaurant || null,
                    search,
                    // Format DatePicker Moment objects
                    from: fromDate ? fromDate.startOf('day').toISOString() : null,
                    to: toDate ? toDate.endOf('day').toISOString() : null,
                    page: pagination.current - 1,
                    size: pagination.pageSize,
                    sortField: sort.field,
                    sortDir: sortDir,
                },
            });
            setOrders(res.data.content);
            setPagination(prev => ({
                ...prev,
                total: res.data.totalElements,
            }));
        } catch (err) {
            console.error("Error fetching orders:", err);
            notification.error({
                message: 'Lỗi Tải Đơn Hàng',
                description: 'Không thể tải danh sách đơn hàng. Vui lòng kiểm tra kết nối Backend và cấu hình JOIN FETCH.',
            });
            setOrders([]);
        }
        setLoading(false);
    }, [ownerId, selectedRestaurant, search, fromDate, toDate, pagination.current, pagination.pageSize, sort.field, sort.order]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Xử lý thay đổi Table (Phân trang và Sắp xếp)
    const handleTableChange = (newPagination, filters, sorter) => {
        setPagination(newPagination);
        if (sorter.field) {
            setSort({
                field: sorter.field,
                order: sorter.order || 'descend',
            });
        }
    };

    // Hàm xử lý hành động (Sử dụng Button)
    const handleAction = useCallback(async (orderId, currentStatus, targetStatus) => {
        if (targetStatus === "CANCELLED" && !window.confirm("Bạn có chắc chắn muốn HỦY đơn hàng này?")) {
            return;
        }

        if (targetStatus === currentStatus) return;

        try {
            const res = await axios.put(`http://localhost:8080/api/owner/orders/${orderId}/status`, null, {
                params: { status: targetStatus },
            });

            const updatedOrder = res.data;

            setOrders(prevOrders =>
                prevOrders.map(order =>
                    order.id === orderId ? updatedOrder : order
                )
            );

            notification.success({
                message: 'Cập nhật thành công',
                description: `Đơn hàng #${orderId} đã được chuyển sang trạng thái ${updatedOrder.status}.`,
            });

        } catch (err) {
            console.error("Error updating status:", err);
            notification.error({
                message: 'Cập nhật thất bại',
                description: 'Đã có lỗi xảy ra trong quá trình cập nhật trạng thái đơn hàng.',
            });
            fetchOrders(); // Tải lại dữ liệu để đồng bộ
        }
    }, [fetchOrders]);

    // Reset Filter
    const handleReset = () => {
        setSearch("");
        setSelectedRestaurant(null);
        setFromDate(null);
        setToDate(null);
        setSort({ field: "createdAt", order: "descend" });
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    // Định nghĩa cột cho Ant Design Table
    const columns = [
        {
            title: 'STT',
            key: 'stt',
            width: 50,
            render: (text, record, index) => (pagination.current - 1) * pagination.pageSize + index + 1,
            align: 'center',
        },
        {
            title: 'Mã đơn',
            dataIndex: 'id',
            key: 'id',
            sorter: true,
            width: 100,
            align: 'center',
        },
        {
            title: 'Đơn hàng & Chi tiết',
            dataIndex: 'items',
            key: 'items',
            render: (items) => <OrderItemDetails items={items} />,
            width: 250,
            align: 'center'
        },
        {
            title: 'Ghi chú',
            dataIndex: 'note',
            key: 'note',
            render: (note) => note || '—',
            align: 'center'
        },
        {
            title: 'Tổng tiền',
            dataIndex: 'subtotal',
            key: 'subtotal',
            sorter: true,
            render: (subtotal) => (
                <span className="fw-bold text-danger">
                    {subtotal ? subtotal.toLocaleString('vi-VN') : 0}₫
                </span>
            ),
            align: 'center',
            width: 150,
        },
        {
            title: 'Thanh toán',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            width: 120,
            align: 'center'
        },
        {
            title: 'Ngày tạo',
            dataIndex: 'createdAt',
            key: 'createdAt',
            sorter: true,
            align: 'center',
            render: (dateString) => {
                const d = new Date(dateString);
                const dd = String(d.getDate()).padStart(2, "0");
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const yyyy = d.getFullYear();
                const hh = String(d.getHours()).padStart(2, "0");
                const mi = String(d.getMinutes()).padStart(2, "0");
                return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
            },
            width: 150,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => <OrderStatusTag status={status} />,
            align: 'center',
            width: 120,
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (text, record) => (
                <Space direction="vertical" size="small">
                    {/* Nút Chấp nhận */}
                    {(record.status === "PAID" || record.status === "PENDING") && (
                        <AntButton
                            type="primary"
                            size="small"
                            onClick={() => handleAction(record.id, record.status, "PREPARING")}
                        >
                            Chấp nhận
                        </AntButton>
                    )}

                    {/* Nút Hủy */}
                    {(record.status === "PAID" || record.status === "PENDING") && (
                        <AntButton
                            danger
                            size="small"
                            onClick={() => handleAction(record.id, record.status, "CANCELLED")}
                        >
                            Hủy đơn
                        </AntButton>
                    )}


                </Space>
            ),
            width: 150,
        },
    ];

    return (
        <div className="p-4">
            <h2 className="mb-4">Quản lý đơn hàng</h2>

            <Space direction="horizontal" size="middle" className="mb-4 w-100" wrap>
                {/* Lọc theo Nhà hàng (Ant Design Select) */}
                <Select
                    style={{ width: 200 }}
                    placeholder="Chọn Nhà hàng"
                    value={selectedRestaurant}
                    allowClear
                    onChange={(value) => {
                        setSelectedRestaurant(value || null);
                        setPagination(prev => ({ ...prev, current: 1 }));
                    }}
                >
                    {restaurants.map((r) => (
                        <Option key={r.id} value={r.id}>{r.name}</Option>
                    ))}
                </Select>

                {/* Lọc theo Ngày tạo (Ant Design DatePicker Range) */}
                <DatePicker
                    placeholder="Từ ngày"
                    value={fromDate}
                    onChange={(date) => {
                        setFromDate(date);
                        setPagination(prev => ({ ...prev, current: 1 }));
                    }}
                    format="DD/MM/YYYY"
                    style={{ width: 200 }}
                    allowClear
                />
                <DatePicker
                    placeholder="Đến ngày"
                    value={toDate}
                    onChange={(date) => {
                        setToDate(date);
                        setPagination(prev => ({ ...prev, current: 1 }));
                    }}
                    format="DD/MM/YYYY"
                    style={{ width: 200 }}
                    allowClear
                />
                {/* Tìm kiếm theo mã đơn (Ant Design Input Search) */}
                <Col xs={24} sm={12} md={6} lg={4}>
                    <Input
                        placeholder="Tìm theo mã đơn"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        // Thêm xử lý khi nhấn Enter (tương đương với onSearch)
                        onPressEnter={() => handleFilterChange('search', search)}
                        style={{ width: 300, height: 33, marginLeft: 20 }}
                    />
                </Col>
                {/* Nút Reset */}
                <AntButton
                    icon={<ReloadOutlined />}
                    onClick={handleReset}
                >
                    Reset
                </AntButton>
            </Space>

            {/* Bảng Ant Design */}
            <Table
                columns={columns}
                dataSource={orders}
                rowKey="id"
                loading={loading}
                pagination={{
                    ...pagination,
                    showSizeChanger: true,
                    pageSizeOptions: ['5','10', '20', '50'],
                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đơn`,
                    locale: { items_per_page: '/ trang' }
                }}
                onChange={handleTableChange}
                sortDirections={['descend', 'ascend', null]}
            />
        </div>
    );
}