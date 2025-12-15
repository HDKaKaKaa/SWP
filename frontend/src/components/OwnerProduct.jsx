/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useContext } from "react";
import axios from "axios";
import { Table, Button, Container, Row, Col, Badge, Spinner, Alert, Pagination, Form, Modal } from "react-bootstrap";
import { FaEdit, FaTrash, FaPlus, FaCamera, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { AuthContext } from "../context/AuthContext";
import AddProduct from "./AddProduct";
import UpdateProduct from "./UpdateProduct";

const OwnerProducts = () => {
    const API_URL = "http://localhost:8080/api/owner/products";
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [variant, setVariant] = useState(null);
    const { user } = useContext(AuthContext);
    const [ownerId, setOwnerId] = useState(null); // PK của Owner Entity
    const [accountId, setAccountId] = useState(null); // ID của User/Account

    const [search, setSearch] = useState("");
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [sortField, setSortField] = useState("id");
    const [sortDir, setSortDir] = useState("asc");
    const [restaurants, setRestaurants] = useState([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [productToUpdate, setProductToUpdate] = useState(null);

    // 1. Lấy ID Owner Entity và Account ID từ user
    useEffect(() => {
        if (!user) return;
        setAccountId(user.id); // Lấy Account ID
        
        const fetchOwnerId = async () => {
            try {
                // Giả định API này trả về PK của Owner Entity
                const res = await axios.get(`http://localhost:8080/api/owner/byAccount/${user.id}`);
                setOwnerId(res.data); 
            } catch (err) {
                console.error("Không lấy được ownerId:", err);
            }
        };

        fetchOwnerId();
    }, [user]);

    // Hàm chung để tải sản phẩm 
    const fetchProducts = useCallback(async () => {
        if (!ownerId) return; // Chỉ tải khi có Owner PK ID
        setLoading(true);
        try {
            const response = await axios.get(API_URL, {
                params: {
                    ownerId, // Dùng Owner ID để lọc sản phẩm
                    restaurantId: selectedRestaurant || null,
                    search: search || null,
                    page: page,
                    size: 10,
                    sort: `${sortField},${sortDir}`,
                }
            });
            setProducts(response.data.content);
            setTotalPages(response.data.totalPages);

        } catch (error) {
            console.error("Lỗi khi tải danh sách sản phẩm:", error);
            setProducts([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [ownerId, selectedRestaurant, search, page, sortField, sortDir]);

    // 2. Tải danh sách Nhà hàng
    useEffect(() => {
        if (!accountId) return; // Chỉ tải khi có Account ID

        const loadRestaurants = async () => {
            try {
                const res = await axios.get("http://localhost:8080/api/owner/restaurants", {
                    params: { accountId }, 
                });
                setRestaurants(res.data);
                if (res.data.length > 0 && !selectedRestaurant) {
                    setSelectedRestaurant(res.data[0].id.toString());
                }
            } catch (err) {
                console.error("Error fetching restaurants:", err);
            }
        };

        loadRestaurants();
    }, [accountId]); 

    // 3. Tải Sản phẩm khi có thay đổi
    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // --- LOGIC LỌC, TÌM KIẾM & SẮP XẾP ---

    // Hàm xử lý lọc
    const handleFilter = () => {
        setPage(0);
    };

    // Xử lý sắp xếp
    const handleSort = (field) => {
        const dir = sortField === field && sortDir === "asc" ? "desc" : "asc";
        setSortField(field);
        setSortDir(dir);
        setPage(0);
    };

    // hiển thị Icon sắp xếp
    const getSortIcon = (field) => {
        if (sortField === field) {
            return sortDir === "asc" ? <FaSortUp className="ms-1" /> : <FaSortDown className="ms-1" />;
        }
        return <FaSort className="ms-1 text-muted" />;
    };

    const handleEdit = async (productId) => {
        console.log(`Chỉnh sửa ID: ${productId}`);
        setMessage(null);
        try {
            // Lấy chi tiết sản phẩm để đổ vào form chỉnh sửa
            const response = await axios.get(`${API_URL}/${productId}`);
            setProductToUpdate(response.data);
            setShowUpdateModal(true);
        } catch (error) {
            console.error("Lỗi khi tải chi tiết sản phẩm:", error);
            const errorMsg = error.response?.data?.message || `Tải sản phẩm ID ${productId} thất bại.`;
            setMessage(errorMsg);
            setVariant('danger');
        }
    };

    const handleDelete = async (productId) => {
        if (window.confirm(`Xác nhận xóa sản phẩm ID: ${productId}?`)) {
            setMessage(null);
            try {
                // Endpoint DELETE không cần ownerId/accountId trong body
                await axios.delete(`http://localhost:8080/api/owner/products/${productId}`);
                fetchProducts();
                setMessage(`Đã xóa sản phẩm ID ${productId} thành công.`);
                setVariant('success');
            } catch (error) {
                console.error("Lỗi khi xóa sản phẩm:", error);
                const errorMsg = error.response?.data?.message || `Xóa sản phẩm ID ${productId} thất bại.`;
                setMessage(errorMsg);
                setVariant('danger');
            }
        }
    };
    const handleAdd = () => {
        setShowAddModal(true);
    };
    //xử lý sau khi thêm/cập nhật
    const handleProductActionSuccess = (successMessage, modalType = 'add') => {
        if (modalType === 'add') {
            setShowAddModal(false);
        } else if (modalType === 'update') {
            setShowUpdateModal(false);
            setProductToUpdate(null);
        }
        fetchProducts();
        setMessage(successMessage || "Thao tác thành công!");
        setVariant("success");
    }
    const handleCloseUpdateModal = () => {
        setShowUpdateModal(false);
        setProductToUpdate(null);
    };
    return (
        <Container className="mt-4">
            {/* Tiêu đề */}
            <Row className="mb-4 align-items-center">
                <Col md={3}></Col>
                <Col md={6} className="text-center">
                    <h3>Quản Lý Sản Phẩm</h3>
                </Col>

            </Row>

            {/*Lọc và Tìm kiếm */}
            <Row className="mb-3 align-items-end">
                <Col md={4}>
                    <Form.Select
                        value={selectedRestaurant}
                        onChange={(e) => {
                            setSelectedRestaurant(e.target.value);
                            handleFilter();
                        }}
                    >
                        <option value="">Tất cả nhà hàng</option>
                        {restaurants.map((r) => (
                            <option key={r.id} value={r.id.toString()}>{r.name}</option>
                        ))}
                    </Form.Select>
                </Col>
                <Col md={5}>
                    <Form.Control
                        type="text"
                        placeholder="Nhập tên sản phẩm..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') handleFilter();
                        }}
                    />
                </Col>
                <Col md={3} className="text-end">
                    <Button variant="success" onClick={handleAdd}>
                        <FaPlus className="me-2" /> Thêm Sản Phẩm
                    </Button>
                </Col>
            </Row>

            {message && (
                <Alert variant={variant} onClose={() => setMessage(null)} dismissible>
                    {message}
                </Alert>
            )}

            <Table striped bordered hover responsive>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Ảnh</th>
                        <th onClick={() => handleSort("name")} style={{ cursor: "pointer" }}>
                            Tên Sản Phẩm {getSortIcon("name")}
                        </th>
                        <th>Danh Mục</th>
                        <th onClick={() => handleSort("price")} style={{ cursor: "pointer" }}>
                            Giá {getSortIcon("price")}
                        </th>
                        <th>Trạng Thái</th>
                        <th>Hành Động</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan="7" className="text-center"><Spinner animation="border" size="sm" /> Đang tải...</td></tr>
                    ) : products.length === 0 ? (
                        <tr><td colSpan="7" className="text-center">Không có sản phẩm nào.</td></tr>
                    ) : (
                        products.map((p) => (
                            <tr key={p.id}>
                                <td>{p.id}</td>
                                <td className="text-center">
                                    {p.image ? (
                                        <img src={p.image} alt={p.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                                    ) : (
                                        <FaCamera size={24} color="#ccc" />
                                    )}
                                </td>
                                <td>{p.name}</td>
                                <td>{p.categoryName || '—'}</td>
                                <td>{p.price.toLocaleString('vi-VN')}₫</td>
                                <td>
                                    <Badge bg={p.isAvailable ? 'success' : 'secondary'}>
                                        {p.isAvailable ? 'Đang Bán' : 'Ngừng Bán'}
                                    </Badge>
                                </td>
                                <td>
                                    <Button
                                        variant="warning"
                                        size="sm"
                                        className="me-2"
                                        onClick={() => handleEdit(p.id)}
                                    >
                                        <FaEdit />
                                    </Button>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => handleDelete(p.id)}
                                    >
                                        <FaTrash />
                                    </Button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </Table>


            <Row className="mt-3">
                <Col className="d-flex justify-content-center">
                    <Pagination>
                        <Pagination.First disabled={page === 0} onClick={() => setPage(0)} />
                        <Pagination.Prev disabled={page === 0} onClick={() => setPage(page - 1)} />

                        {[...Array(totalPages).keys()].map(p => {
                            if (p >= page - 2 && p <= page + 2) {
                                return (
                                    <Pagination.Item key={p} active={p === page} onClick={() => setPage(p)}>
                                        {p + 1}
                                    </Pagination.Item>
                                );
                            }
                            return null;
                        })}

                        <Pagination.Next disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} />
                        <Pagination.Last disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} />
                    </Pagination>
                </Col>
            </Row>

            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="xl" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Thêm Sản Phẩm Mới</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <AddProduct
                        onProductAdded={handleProductActionSuccess}
                        ownerId={ownerId}
                        restaurants={restaurants}
                    />
                </Modal.Body>
            </Modal>

            {/* Modal của update */}
            <Modal show={showUpdateModal} onHide={handleCloseUpdateModal} size="xl" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Chỉnh Sửa Sản Phẩm</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {productToUpdate ? (
                        <UpdateProduct
                            key={productToUpdate.id}
                            onProductActionSuccess={(msg) => handleProductActionSuccess(msg, 'update')}
                            productData={productToUpdate}
                            ownerId={ownerId}
                            restaurants={restaurants}
                        />
                    ) : (
                        <p className="text-center">Đang tải dữ liệu sản phẩm...</p>
                    )}
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default OwnerProducts;