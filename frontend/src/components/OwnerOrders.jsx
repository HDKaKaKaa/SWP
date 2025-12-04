import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { Table, Form, Button, Row, Col, Badge, Pagination } from "react-bootstrap";
import { AuthContext } from "../context/AuthContext";

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
    const { user } = useContext(AuthContext);
    const ownerId = user?.id; // hoặc user.accountId

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

    // Fetch restaurants của owner
    const fetchRestaurants = async () => {
        if (!ownerId) return;
        try {
            const res = await axios.get("http://localhost:8080/api/owner/restaurants", {
                params: { ownerId },
            });
            setRestaurants(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    // Fetch orders với filter + sort + pagination
    const fetchOrders = async () => {
        if (!ownerId) return;
        setLoading(true);
        try {
            const res = await axios.get("http://localhost:8080/api/owner/orders", {
                params: {
                    ownerId,
                    restaurantId: selectedRestaurant,
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
            console.error(err);
        }
        setLoading(false);
    };

    // Lấy danh sách nhà hàng
    useEffect(() => {
        if (!ownerId) return;

        const loadRestaurants = async () => {
            try {
                const res = await axios.get("http://localhost:8080/api/owner/restaurants", {
                    params: { ownerId },
                });
                setRestaurants(res.data);
            } catch (err) {
                console.error(err);
            }
        };

        loadRestaurants();
    }, [ownerId]);

    // Lấy danh sách đơn hàng
    useEffect(() => {
        if (!ownerId) return;

        const loadOrders = async () => {
            setLoading(true);
            try {
                const res = await axios.get("http://localhost:8080/api/owner/orders", {
                    params: {
                        ownerId,
                        restaurantId: selectedRestaurant,
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
                console.error(err);
            }
            setLoading(false);
        };

        loadOrders();
    }, [page, selectedRestaurant, search, fromDate, toDate, sortField, sortDir, ownerId]);

    // Sort động khi click header
    const handleSort = (field) => {
        const dir = sortField === field && sortDir === "asc" ? "desc" : "asc";
        setSortField(field);
        setSortDir(dir);
    };

    // Action Accept / Cancel / Complete
    const handleAction = async (orderId, action) => {
        let newStatus = "";
        if (action === "accept") newStatus = "PREPARING";
        else if (action === "cancel") newStatus = "CANCELLED";
        else if (action === "complete") newStatus = "SHIPPING";

        try {
            await axios.put(`http://localhost:8080/api/owner/orders/${orderId}/status`, null, {
                params: { status: newStatus },
            });
            fetchOrders();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div>
            <h2 className="mb-4">Quản lý đơn hàng</h2>

            <Row className="mb-3">
                <Col md={3}>
                    <Form.Select
                        value={selectedRestaurant || ""}
                        onChange={(e) => setSelectedRestaurant(e.target.value || null)}
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
                    <Form.Control
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                    />
                </Col>

                <Col md={2}>
                    <Form.Control
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                    />
                </Col>

                <Col md={2}>
                    <Button
                        className="w-100"
                        onClick={() => { setPage(0); fetchOrders(); }}
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
                        <tr><td colSpan="8" className="text-center">Đang tải...</td></tr>
                    ) : orders.length === 0 ? (
                        <tr><td colSpan="8" className="text-center">Không có đơn hàng</td></tr>
                    ) : (
                        orders.map((o) => (
                            <tr key={o.id}>
                                <td>{o.id}</td>
                                <td></td>
                                <td></td>
                                <td>{o.customer.fullName}</td>
                                <td>{o.totalAmount}₫</td>
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
