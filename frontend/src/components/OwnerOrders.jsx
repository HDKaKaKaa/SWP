/* eslint-disable react-hooks/preserve-manual-memoization */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useCallback, useContext } from "react";
import axios from "axios";
import { Row, Col, notification } from "antd"; // Giữ lại Row, Col từ React-Bootstrap để quản lý layout (hoặc có thể dùng Grid của antd)
import { Table, Space, Tag, Select, Input, Button as AntButton, DatePicker } from 'antd'; // Ant Design Components
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons'; // Icons từ antd
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { AuthContext } from "../context/AuthContext";

// Cần import CSS của DatePicker
import "react-datepicker/dist/react-datepicker.css";

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
        REFUNDED: "error",
    };
    return (
        <Tag color={colorMap[status] || "default"}>
            {STATUS_TRANSLATIONS[status] || status}
        </Tag>
    );
};
const STATUS_TRANSLATIONS = {
    PENDING: "Chờ xử lý",
    PAID: "Chờ nhận đơn",
    PREPARING: "Đang chuẩn bị",
    SHIPPING: "Đang giao hàng",
    COMPLETED: "Đã hoàn thành",
    CANCELLED: "Đã hủy",
    REFUNDED: "Đã hoàn tiền",
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
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [activeSearch, setActiveSearch] = useState("");
    const [search, setSearch] = useState("");
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 5,
        total: 0,
    });

    const [sort, setSort] = useState({
        field: "createdAt",
        order: "descend",
    });

    const [loading, setLoading] = useState(false);

    const mapSortOrderToDir = (order) => {
        if (order === 'ascend') return 'asc';
        if (order === 'descend') return 'desc';
        return 'desc';
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
                    status: selectedStatus || null,
                    search: activeSearch,
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
                description: 'Không thể tải danh sách đơn hàng.',
            });
            setOrders([]);
        }
        setLoading(false);
    }, [ownerId, selectedRestaurant, selectedStatus, activeSearch, fromDate, toDate, pagination.current, pagination.pageSize, sort.field, sort.order]);


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

    // Hàm xử lý hành động thay đổi trạng thái đơn hàng
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
            fetchOrders();
        }
    }, [fetchOrders]);

    const handleSearchSubmit = () => {
        setActiveSearch(search);
        setPagination(prev => ({ ...prev, current: 1 }));
    };
    // Reset Filter
    const handleReset = () => {
        setSearch("");
        setActiveSearch("");
        setSelectedStatus(null);
        setSelectedRestaurant(null);
        setFromDate(null);
        setToDate(null);
        setSort({ field: "createdAt", order: "descend" });
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);
    // Định nghĩa cột cho Ant Design Table
    const columns = [
        // {
        //     title: 'STT',
        //     key: 'stt',
        //     width: 60,
        //     render: (text, record, index) => (pagination.current - 1) * pagination.pageSize + index + 1,
        //     align: 'center',
        // },
        {
            title: 'Mã đơn',
            dataIndex: 'orderNumber',
            key: 'orderNumber',
            sorter: true,
            width: 100,
            align: 'center',
            fixed: 'left',
        },
        {
            title: 'Đơn hàng',
            dataIndex: 'items',
            key: 'items',
            render: (items) => <OrderItemDetails items={items} />,
            width: 220,
            align: 'center',
        },
        {
            title: 'Ghi chú',
            dataIndex: 'note',
            key: 'note',
            render: (note) => note || <span className="text-muted">—</span>,
            align: 'center',
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
            width: 110,
        },
        {
            title: 'Khách hàng',
            key: 'customer',
            width: 160,
            render: (_, record) => (
                <div className="text-center">
                    <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                        {record.customerName || "Khách lạ"}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#8c8c8c' }}>
                        {record.customerPhone || "—"}
                    </div>
                </div>
            ),
            align: 'center',
        },
        {
            title: 'Thanh toán',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            width: 100,
            align: 'center',
            render: (method) => <small>{method}</small>
        },
        {
            title: 'Thời gian tạo đơn',
            dataIndex: 'createdAt',
            key: 'createdAt',
            sorter: true,
            align: 'center',
            width: 130,
            render: (dateString) => {
                const d = new Date(dateString);
                return (
                    <div style={{ fontSize: '0.85rem' }}>
                        <div>{d.toLocaleDateString('vi-VN')}</div>
                        <div className="text-muted">{d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                );
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status) => <OrderStatusTag status={status} />,
            align: 'center',
            fixed: 'right',
            width: 110,
        },
        {
            title: 'Hành động',
            key: 'action',
            align: 'center',
            width: 120,
            fixed: 'right',
            render: (text, record) => (
                <Space direction="vertical" size={4}>
                    {(record.status === "PAID" || record.status === "PENDING") && (
                        <>
                            <AntButton
                                type="primary"
                                size="small"
                                block
                                onClick={() => handleAction(record.id, record.status, "PREPARING")}
                            >
                                Nhận
                            </AntButton>
                            <AntButton
                                danger
                                size="small"
                                block
                                onClick={() => handleAction(record.id, record.status, "CANCELLED")}
                            >
                                Hủy
                            </AntButton>
                        </>
                    )}
                </Space>
            ),
        },
    ];
    return (
        <div className="p-4">
            <h2 className="mb-4">Quản lý đơn hàng</h2>

            <Space size="middle" className="mb-4 w-130" wrap>
                {/* Lọc theo Nhà hàng (Ant Design Select) */}
                <Select
                    showSearch
                    style={{ width: 200 }}
                    placeholder="Tất cả nhà hàng"
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
                <Select
                    style={{ width: 160 }}
                    showSearch
                    placeholder="Trạng thái đơn"
                    value={selectedStatus}
                    allowClear
                    onChange={(value) => {
                        setSelectedStatus(value || null);
                        setPagination(prev => ({ ...prev, current: 1 }));
                    }}
                >
                    {Object.entries(STATUS_TRANSLATIONS).map(([value, label]) => (
                        <Option key={value} value={value}>
                            {label}
                        </Option>
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
                <Space.Compact style={{ width: 350, marginLeft: 20 }}>
                    <Input
                        placeholder="Tìm kiếm"
                        value={search}
                        allowClear
                        onChange={(e) => setSearch(e.target.value)}
                        onPressEnter={handleSearchSubmit}
                        style={{ width: 300, height: 34, marginLeft: 30 }}
                    />
                    <AntButton
                        style={{ marginLeft: 10 }}
                        type="primary"
                        icon={<SearchOutlined />}
                        onClick={handleSearchSubmit}
                    />
                </Space.Compact>
                {/* Nút Reset */}
                <AntButton
                    icon={<ReloadOutlined />}
                    onClick={handleReset}
                >
                    Tải lại
                </AntButton>
            </Space>

            {/* Bảng Ant Design */}
            <Table
                columns={columns}
                dataSource={orders}
                rowKey="id"
                loading={loading}
                scroll={{ x: 1300 }}
                pagination={{
                    ...pagination,
                    showSizeChanger: true,
                    pageSizeOptions: ['5', '10', '20', '50'],
                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đơn`,
                    locale: { items_per_page: '/ trang' }
                }}
                onChange={handleTableChange}
                sortDirections={['descend', 'ascend', null]}
            />
        </div>
    );
}