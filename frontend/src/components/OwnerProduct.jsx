/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useContext } from "react";
import axios from "axios";
import { Table, Space, Select, Input, Button as AntButton, Modal, Row, Col, Tag, notification, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { FaCamera, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import { AuthContext } from "../context/AuthContext";
import AddProduct from "./AddProduct";
import UpdateProduct from "./UpdateProduct";
const { Option } = Select;

// --- Component con: Hiển thị Trạng thái Sản phẩm bằng Tag của Ant Design ---
const ProductStatusTag = ({ isAvailable }) => {
    return (
        <Tag color={isAvailable ? 'success' : 'default'} style={{ minWidth: 80, textAlign: 'center' }}>
            {isAvailable ? 'Đang Bán' : 'Ngừng Bán'}
        </Tag>
    );
};
//Filter status
const statusFilters = [
    { text: 'Đang Bán', value: 'true' },
    { text: 'Ngừng Bán', value: 'false' },
];
// --- Component chính ---
const OwnerProducts = () => {
    const API_URL = "http://localhost:8080/api/owner/products";
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useContext(AuthContext);
    const [ownerId, setOwnerId] = useState(null);
    const [accountId, setAccountId] = useState(null);


    //Xử lý lọc & tìm kiếm
    const [search, setSearch] = useState("");
    const [restaurants, setRestaurants] = useState([]);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [statusFilter, setStatusFilter] = useState(null);


    const [showAddModal, setShowAddModal] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [productToUpdate, setProductToUpdate] = useState(null);

    // Ant Design Pagination & Sort
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [sort, setSort] = useState({
        field: "id",
        order: "ascend",
    });

    // Hàm chuyển đổi Ant Design Sort Order sang Backend Sort Dir
    const mapSortOrderToDir = (order) => {
        if (order === 'ascend') return 'asc';
        if (order === 'descend') return 'desc';
        return 'asc';
    };

    // 1. Lấy ID Owner Entity và Account ID từ user
    useEffect(() => {
        if (!user) return;
        setAccountId(user.id);

        const fetchOwnerId = async () => {
            try {
                const res = await axios.get(`http://localhost:8080/api/owner/byAccount/${user.id}`);
                setOwnerId(res.data);
            } catch (err) {
                console.error("Không lấy được ownerId:", err);
            }
        };

        fetchOwnerId();
    }, [user]);

    // 2. Tải danh sách Nhà hàng
    useEffect(() => {
        if (!accountId) return;

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
        const loadCategories = async () => {
            try {
                const res = await axios.get("http://localhost:8080/api/categories");
                setCategories(res.data);
            } catch (err) {
                console.error("Error fetching categories:", err);
            }
        };
        loadRestaurants();
        loadCategories();
    }, [accountId]);

    // Hàm chung để tải sản phẩm 
    const fetchProducts = useCallback(async () => {
        if (!ownerId) return;
        setLoading(true);

        const sortDir = mapSortOrderToDir(sort.order);
        const sortParam = `${sort.field},${sortDir}`;
        try {
            const response = await axios.get(API_URL, {
                params: {
                    ownerId,
                    restaurantId: selectedRestaurant || null,
                    categoryId: selectedCategory || null,
                    isAvailable: statusFilter,
                    search: search || null,
                    page: pagination.current - 1,
                    size: pagination.pageSize,
                    sort: sortParam,
                }
            });
            setProducts(response.data.content);
            setPagination(prev => ({
                ...prev,
                total: response.data.totalElements,
            }));

        } catch (error) {
            console.error("Lỗi khi tải danh sách sản phẩm:", error);
            notification.error({
                message: 'Lỗi Tải Sản Phẩm',
                description: 'Không thể tải danh sách sản phẩm. Vui lòng kiểm tra kết nối Backend.',
            });
            setProducts([]);
            setPagination(prev => ({ ...prev, total: 0 }));
        } finally {
            setLoading(false);
        }
    }, [ownerId, selectedRestaurant, selectedCategory, statusFilter, search, pagination.current, pagination.pageSize, sort.field, sort.order]);

    // 3. Tải Sản phẩm khi có thay đổi
    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // --- LOGIC LỌC, TÌM KIẾM & SẮP XẾP ---

    // Xử lý thay đổi Table (Phân trang và Sắp xếp)
    const handleTableChange = (newPagination, filters, sorter) => {
        setPagination(newPagination);
        if (sorter.field) {
            setSort({
                field: sorter.field,
                order: sorter.order || 'ascend',
            });
        }
        const filteredStatus = filters.isAvailable ? filters.isAvailable[0] : null;
        let newStatusFilter = null;
        if (filteredStatus !== null) {
            newStatusFilter = filteredStatus === 'true';
        }

        // Nếu giá trị lọc trạng thái thay đổi, cập nhật state và reset page
        if (newStatusFilter !== statusFilter) {
            setStatusFilter(newStatusFilter);
            setPagination(prev => ({ ...prev, current: 1 }));
        }
    };

    // Hàm xử lý lọc (chỉ cần reset page về 1)
    const handleFilter = () => {
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    // Reset Filter
    const handleReset = () => {
        setSearch("");
        setSelectedRestaurant(null);
        setSelectedCategory(null);
        setStatusFilter(null);
        setSort({ field: "id", order: "ascend" });
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const handleEdit = async (productId) => {
        try {
            const response = await axios.get(`${API_URL}/${productId}`);
            setProductToUpdate(response.data);
            setShowUpdateModal(true);
        } catch (error) {
            console.error("Lỗi khi tải chi tiết sản phẩm:", error);
            notification.error({
                message: 'Lỗi Tải Dữ Liệu',
                description: `Tải sản phẩm ID ${productId} thất bại.`,
            });
        }
    };

    const handleDelete = async (productId) => {
        Modal.confirm({
            title: 'Xác nhận xóa',
            content: `Bạn có chắc chắn muốn xóa sản phẩm ID: ${productId}? Thao tác này không thể hoàn tác.`,
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await axios.delete(`http://localhost:8080/api/owner/products/${productId}`);
                    fetchProducts();
                    notification.success({
                        message: 'Thành công',
                        description: `Đã xóa sản phẩm ID ${productId} thành công.`,
                    });
                } catch (error) {
                    console.error("Lỗi khi xóa sản phẩm:", error);
                    notification.error({
                        message: 'Lỗi Xóa Sản Phẩm',
                        description: `Xóa sản phẩm ID ${productId} thất bại.`,
                    });
                }
            },
            onCancel() {
            },
        });
    };

    const handleAdd = () => {
        setShowAddModal(true);
    };

    // xử lý sau khi thêm/cập nhật
    const handleProductActionSuccess = (successMessage, modalType = 'add') => {
        if (modalType === 'add') {
            setShowAddModal(false);
        } else if (modalType === 'update') {
            setShowUpdateModal(false);
            setProductToUpdate(null);
        }
        fetchProducts();
        notification.success({
            message: 'Thành công',
            description: successMessage || "Thao tác thành công!",
        });
    }

    const handleCloseUpdateModal = () => {
        setShowUpdateModal(false);
        setProductToUpdate(null);
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
            title: 'Ảnh',
            dataIndex: 'image',
            key: 'image',
            width: 80,
             align: 'center',
            render: (image, record) => (
                <div className="text-center">
                    {image ? (
                        <img
                            src={image}
                            alt={record.name}
                            style={{ width: '100px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                    ) : (
                        <FaCamera size={24} color="#ccc" />
                    )}
                </div>
            ),
        },
        {
            title: 'Tên Sản Phẩm',
            dataIndex: 'name',
            key: 'name',
            sorter: true,
            render: (name) => <span style={{ fontWeight: 600 }}>{name}</span>,
             align: 'center',
            width: 250,
        },
        {
            title: 'Danh Mục',
            dataIndex: 'categoryName',
            key: 'categoryName',
            render: (categoryName) => categoryName || '—',
            width: 100,
             align: 'center',
        },
        {
            title: 'Giá',
            dataIndex: 'price',
            key: 'price',
            sorter: true,
            render: (price) => (
                <span className="fw-bold text-danger">
                    {price ? price.toLocaleString('vi-VN') : 0}₫
                </span>
            ),
            align: 'center',
            width: 120,
        },
        {
            title: 'Trạng Thái',
            dataIndex: 'isAvailable',
            key: 'isAvailable',
            render: (isAvailable) => <ProductStatusTag isAvailable={isAvailable} />,
            filters: statusFilters,
            filterMultiple: false,
            align: 'center',
            width: 100,
        },
        {
            title: 'Hành Động',
            key: 'action',
            width: 120,
            render: (text, record) => (
                <Space size="small">
                    <AntButton
                        type="primary"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => handleEdit(record.id)}
                    />
                    <AntButton
                        danger
                        icon={<DeleteOutlined />}
                        size="small"
                        onClick={() => handleDelete(record.id)}
                    />
                </Space>
            ),
            align: 'center',
        },
    ];

    return (
        <div className="p-4">
            <h2 className="mb-4">Quản Lý Sản Phẩm</h2>

            {/* Bộ Lọc, Tìm kiếm và Nút Thêm Sản Phẩm (Sử dụng Ant Design Space) */}
            <Space  size="middle" style={{marginLeft: 20 }} className="mb-4 w-140" wrap>
                <Select
                    style={{ width: 250 }}
                    placeholder="Tất cả nhà hàng"
                    value={selectedRestaurant}
                    allowClear
                    onChange={(value) => {
                        setSelectedRestaurant(value || null);
                        handleFilter();
                    }}
                >
                    <Option value={null}>Tất cả nhà hàng</Option>
                    {restaurants.map((r) => (
                        <Option key={r.id} value={r.id}>{r.name}</Option>
                    ))}
                </Select>
                {/* //Lọc theo Category */}
                <Select
                    style={{ width: 200 }}
                    placeholder="Tất cả danh mục"
                    value={selectedCategory}
                    allowClear
                    onChange={(value) => {
                        setSelectedCategory(value || null);
                        handleFilter();
                    }}
                >
                    <Option value={null}>Tất cả danh mục</Option>
                    {categories.map((c) => (
                        <Option key={c.id} value={c.id}>{c.name}</Option>
                    ))}
                </Select>

                {/* Tìm kiếm theo tên sản phẩm (Ant Design Input với addonBefore) */}
                <Input
                    placeholder="Tìm theo tên sản phẩm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onPressEnter={handleFilter}
                    style={{ width: 350, height: 33 }}
                />

                {/* Nút Reset */}
                <AntButton
                    icon={<ReloadOutlined />}
                    onClick={handleReset}
                >
                    Reset
                </AntButton>

                {/* Nút Thêm Sản Phẩm */}
                <AntButton
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                    style={{ marginLeft: 'auto' }} // Đẩy nút Thêm Sản phẩm sang phải
                >
                    Thêm Sản Phẩm
                </AntButton>

            </Space>

            {/* Bảng Ant Design */}
            <Table
                columns={columns}
                dataSource={products}
                rowKey="id"
                loading={loading}
                pagination={{
                    ...pagination,
                    showSizeChanger: true,
                    pageSizeOptions: ['5', '10', '20', '50'],
                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} sản phẩm`,
                    locale: { items_per_page: '/ trang' }
                }}
                onChange={handleTableChange}
                // Điều chỉnh để Ant Design Table biết cách hiển thị icon sắp xếp
                sortDirections={['ascend', 'descend', null]}
            />


            {/* Modal Thêm Sản Phẩm (Ant Design Modal) */}
            <Modal
                open={showAddModal}
                onCancel={() => setShowAddModal(false)}
                footer={null} // Tắt footer mặc định
                width={1000}
                centered
            >
                <AddProduct
                    onProductAdded={handleProductActionSuccess}
                    ownerId={ownerId}
                    restaurants={restaurants}
                />
            </Modal>

            {/* Modal Chỉnh Sửa Sản Phẩm (Ant Design Modal) */}
            <Modal
                open={showUpdateModal}
                onCancel={handleCloseUpdateModal}
                footer={null}
                width={1000}
                centered
            >
                {productToUpdate ? (
                    <UpdateProduct
                        key={productToUpdate.id}
                        onProductActionSuccess={(msg) => handleProductActionSuccess(msg, 'update')}
                        productData={productToUpdate}
                        ownerId={ownerId}
                        restaurants={restaurants}
                    />
                ) : (
                    <Spin className="d-block text-center p-5"><p>Đang tải dữ liệu sản phẩm...</p></Spin>
                )}
            </Modal>
        </div>
    );
};

export default OwnerProducts;