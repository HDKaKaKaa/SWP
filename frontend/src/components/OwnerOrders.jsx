import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Table, Form, Button, Row, Col, Badge, Pagination } from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; 
const OrderStatusBadge = ({ status }) => {
    const colors = {
        PENDING: "secondary",
        PREPARING: "info",
        READY_FOR_PICKUP: "primary",
        SHIPPING: "warning",
        COMPLETED: "success",
        CANCELLED: "danger",
    };
    return <Badge bg={colors[status]}>{status}</Badge>;
};

export default function OwnerOrders() {
    const ownerId = 7;
    // const { user } = useContext(AuthContext);
    // const ownerId = user?.accountId;
    const [orders, setOrders] = useState([]);
    const [restaurants, setRestaurants] = useState([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);

    const [search, setSearch] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    const [sortField, setSortField] = useState("createdAt");
    const [sortDir, setSortDir] = useState("desc");

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!ownerId) return;

        const loadRestaurants = async () => {
            try {
                const res = await axios.get("http://localhost:8080/api/owner/restaurants", {
                    params: { ownerId },
                });
                setRestaurants(res.data);
            } catch (err) {
                console.error("Error fetching restaurants:", err);
            }
        };

        loadRestaurants();
    }, [ownerId]);

    const fetchOrders = useCallback(async () => {
        if (!ownerId) return;
        setLoading(true);
        try {
            const res = await axios.get("http://localhost:8080/api/owner/orders", {
                params: {
                    ownerId,
                    restaurantId: selectedRestaurant || null,
                    search,
                    from: fromDate ? new Date(fromDate).toISOString() : null,
                    to: toDate ? new Date(toDate).toISOString() : null,
                    page,
                    size: 10,
                    sortField,
                    sortDir,
                },
            });
            setOrders(res.data.content);
            setTotalPages(res.data.totalPages);
        } catch (err) {
            console.error("Error fetching orders:", err);
            setOrders([]);
            setTotalPages(1);
        }
        setLoading(false);
    }, [page, selectedRestaurant, sortField, sortDir, ownerId, search, fromDate, toDate]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchOrders();
    }, [fetchOrders]);

    const handleFilter = () => {
        setPage(0);
    };

    const handleSort = (field) => {
        const dir = sortField === field && sortDir === "asc" ? "desc" : "asc";
        setSortField(field);
        setSortDir(dir);
        setPage(0);
    };

    const handleAction = async (orderId, action) => {
        let newStatus = "";
        if (action === "accept") newStatus = "PREPARING";
        else if (action === "cancel") newStatus = "CANCELLED";
        else if (action === "complete") newStatus = "SHIPPING";

        try {
            const res = await axios.put(`http://localhost:8080/api/owner/orders/${orderId}/status`, null, {
                params: { status: newStatus },
            });

            const updatedOrder = res.data;

            setOrders(prevOrders =>
                prevOrders.map(order =>
                    order.id === orderId ? updatedOrder : order
                )
            );

        } catch (err) {
            console.error("Error updating status:", err);
            alert("Cập nhật trạng thái thất bại");
            fetchOrders();
        }
    };

    return (
        <div>
            <h2 className="mb-4">Quản lý đơn hàng</h2>

            <Row className="mb-3">
                <Col md={3}>
                    <Form.Select
                        value={selectedRestaurant || ""}
                        onChange={(e) => {
                            setSelectedRestaurant(e.target.value || null);
                            setPage(0);
                        }}
                    >
                        <option value="">Tất cả nhà hàng</option>
                        {restaurants.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </Form.Select>
                </Col>

                <Col md={3}>
                    <Form.Control
                        placeholder="Tìm kiếm theo mã đơn hoặc tên khách"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </Col>

                <Col md={2}>
                    <DatePicker
                        selected={fromDate ? new Date(fromDate) : null}
                        onChange={(date) => {
                            // Chuyển lại Date Object thành chuỗi 'YYYY-MM-DD' để lưu state
                            setFromDate(date ? date.toISOString().split('T')[0] : "");
                            handleFilter(); // Có thể gọi hàm lọc nếu bạn muốn filter ngay sau khi chọn
                        }}
                        customInput={<Form.Control />} // Sử dụng Form.Control làm input
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Từ ngày"
                        isClearable
                    />
                </Col>

                <Col md={2}>
                    <DatePicker
                        selected={toDate ? new Date(toDate) : null}
                        onChange={(date) => {
                            setToDate(date ? date.toISOString().split('T')[0] : "");
                            handleFilter();
                        }}
                        customInput={<Form.Control />}
                        dateFormat="dd/MM/yyyy"
                        placeholderText="Đến ngày"
                        isClearable
                    />
                </Col>

                <Col md={2}>
                    <Button
                        className="w-100"
                        onClick={handleFilter}
                    >
                        Lọc
                    </Button>
                </Col>
            </Row>

            <Table striped bordered hover>
                <thead>
                    <tr>
                        <th onClick={() => handleSort("id")} style={{ cursor: "pointer" }}>Mã đơn</th>
                        <th>Đơn hàng</th>
                        <th>Ghi chú</th>
                        <th>Khách hàng</th>
                        <th onClick={() => handleSort("totalAmount")} style={{ cursor: "pointer" }}>Tổng tiền</th>
                        <th>Thanh toán</th>
                        <th onClick={() => handleSort("createdAt")} style={{ cursor: "pointer" }}>Ngày tạo</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                    </tr>
                </thead>

                <tbody>
                    {loading ? (
                        <tr><td colSpan="9" className="text-center">Đang tải...</td></tr>
                    ) : orders.length === 0 ? (
                        <tr><td colSpan="9" className="text-center">Không có đơn hàng</td></tr>
                    ) : (
                        orders.map((o) => (
                            <tr key={o.id}>
                                <td>{o.id}</td>
                                <td>
                                    {o.items && o.items.length > 0 ? (
                                        o.items.map((item, index) => (
                                            // item.productName và item.quantity từ OrderItemDTO
                                            <div key={index}>
                                                {item.productName} - Số lượng: {item.quantity}
                                            </div>
                                        ))
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td>{o.note || '—'}</td>
                                <td>{o.customerName || '—'}</td>
                                <td>{o.totalAmount.toLocaleString('vi-VN')}₫</td>
                                <td>{o.paymentMethod}</td>
                                <td>{new Date(o.createdAt).toLocaleString()}</td>
                                <td><OrderStatusBadge status={o.status} /></td>
                                <td>
                                    {o.status === "PENDING" && (
                                        <>
                                            <Button size="sm" variant="success" onClick={() => handleAction(o.id, "accept")}>Accept</Button>{" "}
                                            <Button size="sm" variant="danger" onClick={() => handleAction(o.id, "cancel")}>Cancel</Button>
                                        </>
                                    )}
                                    {o.status === "PREPARING" && (
                                        <Button size="sm" variant="primary" onClick={() => handleAction(o.id, "complete")}>Complete</Button>
                                    )}
                                    {(o.status === "SHIPPING" || o.status === "COMPLETED" || o.status === "CANCELLED") && (
                                        <span>—</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </Table>

            <Pagination>
                <Pagination.First disabled={page === 0} onClick={() => setPage(0)} />
                <Pagination.Prev disabled={page === 0} onClick={() => setPage(page - 1)} />
                <Pagination.Item active>{page + 1}</Pagination.Item>
                <Pagination.Next disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} />
                <Pagination.Last disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} />
            </Pagination>
        </div>
    );
}