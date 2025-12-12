import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, Button, Container, Row, Col, Card, Alert, Table, InputGroup, Spinner } from 'react-bootstrap';
import axios from 'axios';

const API_BASE_URL = "http://localhost:8080/api";

// --- Component con để quản lý Product Details (Giữ nguyên) ---
const AttributeEditor = React.memo(({ attribute, details, onAddDetail, onDetailChange, onRemoveDetail }) => {
    return (
        <Card className="mb-4 border-primary border-opacity-25" bg="light">
            <Card.Header as="h5" className="text-primary text-center">
                {attribute.name}
            </Card.Header>
            <Card.Body className="p-3">
                <Table striped bordered hover size="sm">
                    <thead>
                        <tr>
                            <th className="w-45">{attribute.name}</th>
                            <th className="w-35">Giá Điều chỉnh (VND)</th>
                            <th className="w-20">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {details.map((detail, index) => (
                            <tr key={detail.id || index}>
                                <td>
                                    <Form.Control
                                        type="text"
                                        value={detail.value}
                                        onChange={(e) => onDetailChange(attribute.id, index, 'value', e.target.value)}
                                        placeholder={`Nhập giá trị, VD: L, 50%`}
                                        required
                                    />
                                </td>
                                <td>
                                    <InputGroup>
                                        <Form.Control
                                            type="number"
                                            value={detail.priceAdjustment}
                                            onChange={(e) => onDetailChange(attribute.id, index, 'priceAdjustment', e.target.value)}
                                            min="0"
                                            step="1000"
                                            required
                                        />
                                        <InputGroup.Text>VND</InputGroup.Text>
                                    </InputGroup>
                                </td>
                                <td>
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        onClick={() => onRemoveDetail(attribute.id, index)}
                                        className="w-100">
                                        Xóa
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>

                <Button
                    variant="info"
                    onClick={() => onAddDetail(attribute.id)}
                    className="mt-2 text-white">
                    + Thêm Tùy chọn cho {attribute.name}
                </Button>
            </Card.Body>
        </Card>
    );
});


export default function UpdateProduct({ onProductActionSuccess, restaurants = [], productData }) {
    console.log("Product Data received:", productData);
    console.log("Restaurant ID in state:", productData?.restaurant?.id?.toString());
    console.log("Category ID in state:", productData?.category?.id?.toString());
    // --- Khởi tạo trạng thái dựa trên dữ liệu sản phẩm hiện có ---
    const [categories, setCategories] = useState([]);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeAttributes, setActiveAttributes] = useState([]);

    // Dùng useMemo để tạo dữ liệu sản phẩm cần cập nhật
    const initialProductState = useMemo(() => ({
        id: productData?.id || null,
        name: productData?.name || '',
        description: productData?.description || '',
        categoryId: productData?.category?.id?.toString() || '',
        price: productData?.price || 0,
        isAvailable: productData?.isAvailable ?? true,
        restaurantId: productData?.restaurant?.id?.toString() || ''
    }), [productData]);


    const [productFormData, setProductData] = useState(initialProductState);
    const [productImage, setProductImage] = useState(null);
    // Lưu ý: imagePreview cần được set ban đầu là ảnh cũ (imageUrl)
    const [imagePreview, setImagePreview] = useState(productData?.imageUrl || null);
    const [productDetails, setProductDetails] = useState({});


    // --- 1. Tải Categories khi component mount ---
    useEffect(() => {
        const fetchCategories = async () => {
            setError(null);
            try {
                const resCat = await axios.get(`${API_BASE_URL}/categories`);
                setCategories(resCat.data);
            } catch (err) {
                console.error("Lỗi khi tải danh mục:", err);
                setError("Không thể tải danh mục sản phẩm từ máy chủ.");
            } finally {
                setLoadingInitial(false);
            }
        };
        fetchCategories();
    }, []);

    // --- Cập nhật trạng thái khi dữ liệu ban đầu thay đổi (Khi Modal mở) ---
    useEffect(() => {
        // Cập nhật ProductData từ initialProductState
        setProductData(initialProductState);
        // Cập nhật Ảnh cũ khi productData thay đổi
        setImagePreview(productData?.image || null);
    }, [initialProductState, productData?.image]);


    // --- 2. Fetch Attributes & Khởi tạo Product Details khi Category đổi/Load lần đầu ---
    useEffect(() => {
        // Sử dụng Number() để đảm bảo categoryId được truyền đi là số
        const categoryId = Number(productFormData.categoryId);

        // Logic để nhóm chi tiết cũ theo Attribute ID (Giữ nguyên)
        const groupDetailsByAttribute = (details) => {
            const grouped = {};
            if (!Array.isArray(details)) return grouped;

            details.forEach(detail => {
                const attributeId = detail.attributeId;
                if (!grouped[attributeId]) {
                    grouped[attributeId] = [];
                }
                grouped[attributeId].push({
                    id: detail.id,
                    value: detail.value || '',
                    priceAdjustment: Number(detail.priceAdjustment) || 0
                });
            });
            return grouped;
        };

        const fetchAttributes = async (id) => {
            setActiveAttributes([]);
            if (!id || id <= 0) {
                setProductDetails({});
                return;
            }
            try {
                const res = await axios.get(`${API_BASE_URL}/categories/${id}/attributes`);
                const attributes = res.data;
                setActiveAttributes(attributes);

                const existingDetails = productData?.productDetails || [];

                // CHỈ DÙNG existingDetails khi categoryId hiện tại khớp với categoryId ban đầu của productData
                const groupedExistingDetails = (id === Number(productData?.categoryId))
                    ? groupDetailsByAttribute(existingDetails)
                    : {};

                const initialDetails = {};
                attributes.forEach(attr => {
                    initialDetails[attr.id] = groupedExistingDetails[attr.id] || [];
                });

                setProductDetails(initialDetails);
            } catch (err) {
                console.error("Lỗi khi tải thuộc tính:", err);
                setActiveAttributes([]);
                setProductDetails({});
            }
        };

        if (categoryId) {
            fetchAttributes(categoryId);
        }
    }, [productFormData.categoryId, productData?.productDetails, productData?.categoryId]);


    // --- Handlers ---

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setProductData({
            ...productFormData,
            [name]: type === 'checkbox' || type === 'switch' ? checked : value,
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProductImage(file);
            setImagePreview(URL.createObjectURL(file)); // Ảnh mới
        } else {
            setProductImage(null);
            setImagePreview(productData?.imageUrl || null); // Trở lại ảnh cũ (nếu có)
        }
    };

    // Giữ nguyên các hàm handleDetail (Add, Change, Remove)
    const handleAddDetail = useCallback((attributeId) => {
        const newDetail = { id: undefined, value: '', priceAdjustment: 0 };
        setProductDetails(prevDetails => ({
            ...prevDetails,
            [attributeId]: [...(prevDetails[attributeId] || []), newDetail]
        }));
    }, []);

    const handleDetailChange = useCallback((attributeId, index, field, value) => {
        setProductDetails(prevDetails => {
            const newDetails = [...(prevDetails[attributeId] || [])];

            const processedValue = field === 'priceAdjustment'
                ? (Number(value) >= 0 ? Number(value) : 0)
                : value;

            if (newDetails[index]) {
                newDetails[index] = {
                    ...newDetails[index],
                    [field]: processedValue
                };
            }

            return {
                ...prevDetails,
                [attributeId]: newDetails
            };
        });
    }, []);

    const handleRemoveDetail = useCallback((attributeId, index) => {
        setProductDetails(prevDetails => ({
            ...prevDetails,
            [attributeId]: prevDetails[attributeId].filter((_, i) => i !== index)
        }));
    }, []);
    // ...

    // --- Xử lý Submit (Cập nhật) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        const { id, name, price, restaurantId, categoryId, description, isAvailable } = productFormData;

        // 1. CHUYỂN ĐỔI KIỂU DỮ LIỆU SANG NUMBER
        const restaurantIdNum = Number(restaurantId);
        const categoryIdNum = Number(categoryId);
        const priceNum = Number(price);

        // 2. ĐỊNH NGHĨA BIẾN VALIDATION
        const isRestaurantIdValid = Number.isInteger(restaurantIdNum) && restaurantIdNum >= 1;
        const isCategoryIdValid = Number.isInteger(categoryIdNum) && categoryIdNum >= 1;
        const isPriceValid = priceNum >= 0;

        // 3. KIỂM TRA TÍNH HỢP LỆ
        if (
            !id ||
            !name.trim() ||
            !isPriceValid ||
            !isRestaurantIdValid ||
            !isCategoryIdValid
        ) {
            console.error("Validation Failed:", {
                Name: name,
                Price: priceNum,
                RestaurantId: restaurantIdNum,
                CategoryId: categoryIdNum,
                isRestaurantIdValid,
                isCategoryIdValid,
                isPriceValid
            });

            setError("Vui lòng điền đầy đủ thông tin cơ bản (Tên, Giá, Nhà hàng, Danh mục) và đảm bảo các ID hợp lệ.");
            setLoading(false);
            return;
        }

        // Kiểm tra ảnh: Ảnh cũ hoặc ảnh mới
        if (!imagePreview) {
            setError("Sản phẩm phải có ít nhất một ảnh (Ảnh hiện tại hoặc ảnh mới).");
            setLoading(false);
            return;
        }


        // Chuẩn bị Product Details
        const productDetailsList = Object.entries(productDetails).flatMap(([attributeId, detailsArray]) =>
            detailsArray
                .filter(detail => detail.value.trim() !== '')
                .map(detail => ({
                    id: detail.id || null,
                    value: detail.value.trim(),
                    priceAdjustment: Number(detail.priceAdjustment),
                    attributeId: Number(attributeId)
                }))
        );

        // 4. TẠO OBJECT JSON cho ProductRequest DTO
        const productRequestData = {
            id,
            name: name.trim(),
            description: description.trim(),
            categoryId: categoryIdNum,
            price: priceNum,
            isAvailable,
            restaurantId: restaurantIdNum,
            productDetails: productDetailsList
        };

        const formData = new FormData();
        formData.append(
            'productRequest',
            new Blob([JSON.stringify(productRequestData)], { type: 'application/json' })
        );

        // Chỉ thêm file ảnh nếu có file mới được chọn
        if (productImage) {
            formData.append('imageFile', productImage);
        }

        try {
            const API_UPDATE_PRODUCT = `${API_BASE_URL}/products/${id}`;
            await axios.put(API_UPDATE_PRODUCT, formData, {});

            onProductActionSuccess(`Đã cập nhật sản phẩm "${name}" thành công.`);

        } catch (apiError) {
            console.error('Lỗi khi cập nhật sản phẩm:', apiError.response || apiError);
            const errorMsg = apiError.response?.data?.message || 'Lỗi kết nối hoặc lỗi dữ liệu. Vui lòng kiểm tra lại.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // --- Render ---
    if (!productData?.id) {
        return <Alert variant="warning" className="m-3 text-center">🛑 **Lỗi**: Không có dữ liệu sản phẩm để cập nhật. Vui lòng chọn một sản phẩm hợp lệ.</Alert>;
    }


    return (
        <Container className="py-2">
            <Row className="justify-content-center">
                <Col md={12}>
                    <Card className="shadow">
                        <Card.Body>
                            <h3 className="text-center mb-4 text-primary">
                                Cập Nhật Sản Phẩm
                            </h3>

                            {loadingInitial && (
                                <Alert variant="info" className="text-center">
                                    <Spinner animation="border" size="sm" className="me-2" /> Đang tải dữ liệu ban đầu...
                                </Alert>
                            )}
                            {error && <Alert variant="danger">{error}</Alert>}

                            <Form onSubmit={handleSubmit}>

                                {/* 1. THÔNG TIN SẢN PHẨM CƠ BẢN */}
                                <fieldset className="border p-4 rounded mb-4">
                                    <legend className="float-none w-auto px-2 fs-5 text-primary">1. Thông tin cơ bản</legend>

                                    <Row className="mb-3">
                                        <Form.Group as={Col} controlId="productName" md={6}>
                                            <Form.Label className="fw-bold">Tên sản phẩm:</Form.Label>
                                            <Form.Control type="text" name="name" value={productFormData.name} onChange={handleChange} required placeholder="Ví dụ: Trà sữa Trân châu Đường đen" />
                                        </Form.Group>
                                        <Form.Group as={Col} controlId="productPrice" md={6}>
                                            <Form.Label className="fw-bold">Giá (VND):</Form.Label>
                                            <InputGroup>
                                                <Form.Control type="number" name="price" value={productFormData.price} onChange={handleChange} required min="0" step="1000" />
                                                <InputGroup.Text>VND</InputGroup.Text>
                                            </InputGroup>
                                        </Form.Group>
                                    </Row>

                                    <Row className="mb-3">
                                        {/* Select Restaurant - ĐÃ SỬA: Bỏ .toString() trong value */}
                                        <Form.Group as={Col} controlId="restaurantId" md={4}>
                                            <Form.Label className="fw-bold">Gán cho Nhà hàng:</Form.Label>
                                            <Form.Select
                                                name="restaurantId"
                                                // CHỈ SỬ DỤNG GIÁ TRỊ TRONG STATE (ĐÃ LÀ CHUỖI HOẶC RỖNG)
                                                value={productFormData.restaurantId || ""}
                                                onChange={handleChange}
                                                required
                                                disabled={restaurants.length === 0}
                                            >
                                                <option value="">Chọn Nhà hàng</option>
                                                {restaurants.map((r) => (
                                                    <option key={r.id} value={r.id.toString()}>
                                                        {r.name}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                            {restaurants.length === 0 && <Form.Text className="text-danger">Owner chưa có nhà hàng nào.</Form.Text>}
                                        </Form.Group>

                                        {/* Select Category - ĐÃ SỬA: Bỏ .toString() trong value */}
                                        <Form.Group as={Col} controlId="categoryId" md={4}>
                                            <Form.Label className="fw-bold">Danh mục:</Form.Label>
                                            <Form.Select
                                                name="categoryId"
                                                value={productFormData.categoryId || ""}
                                                onChange={handleChange}
                                                required
                                                disabled={loadingInitial || categories.length === 0}
                                            >
                                                <option value="">Chọn Danh mục</option>
                                                {categories.map((cat) => (
                                                    <option key={cat.id} value={cat.id.toString()}>
                                                        {cat.name}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>

                                        {/* Checkbox Trạng Thái (Đã hoạt động đúng) */}
                                        <Form.Group as={Col} controlId="isAvailable" md={4} className="d-flex align-items-center">
                                            <Form.Label className="fw-bold me-3 mt-4">Trạng Thái:</Form.Label>
                                            <Form.Check
                                                type="switch"
                                                id="isAvailableSwitch"
                                                name="isAvailable"
                                                label={productFormData.isAvailable ? "Đang Bán" : "Ngừng Bán"}
                                                checked={productFormData.isAvailable}
                                                onChange={handleChange}
                                                className="mt-4"
                                            />
                                        </Form.Group>
                                    </Row>

                                    {/* Mô tả */}
                                    <Form.Group controlId="productDescription" className="mb-3">
                                        <Form.Label className="fw-bold">Miêu tả:</Form.Label>
                                        <Form.Control as="textarea" rows={3} name="description" value={productFormData.description} onChange={handleChange} placeholder="Mô tả chi tiết sản phẩm" />
                                    </Form.Group>

                                    {/* Ảnh sản phẩm - LOGIC HIỂN THỊ ẢNH CŨ/MỚI */}
                                    <Row className="mb-3">
                                        <Form.Group as={Col} controlId="productImageFile" md={8}>
                                            <Form.Label className="fw-bold">Ảnh sản phẩm (Chọn ảnh mới để thay thế ảnh cũ):</Form.Label>
                                            <Form.Control type="file" onChange={handleFileChange} accept="image/*" />

                                            {/* Hiển thị ảnh xem trước/ảnh cũ */}
                                            {imagePreview && (
                                                <div className="mt-2">
                                                    <img
                                                        src={imagePreview}
                                                        alt="Xem trước ảnh sản phẩm"
                                                        style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }}
                                                    />
                                                    <Form.Text className="ms-3 text-success">
                                                        {productImage ? "Ảnh mới được chọn." : "Ảnh sản phẩm hiện tại."}
                                                    </Form.Text>
                                                </div>
                                            )}

                                            {/* Hiển thị cảnh báo nếu không có ảnh nào */}
                                            {!imagePreview && <Form.Text className="text-danger d-block mt-2">Sản phẩm chưa có ảnh. Vui lòng tải lên.</Form.Text>}
                                        </Form.Group>
                                    </Row>

                                </fieldset>

                                {/* 2. THUỘC TÍNH SẢN PHẨM */}
                                <fieldset className="border p-4 rounded mb-4">
                                    <legend className="float-none w-auto px-2 fs-5 text-primary">2. Tùy chọn & Thuộc tính (Options)</legend>

                                    {/* Sử dụng Number() để kiểm tra logic */}
                                    {Number(productFormData.categoryId) > 0 ? (
                                        <Row>
                                            {activeAttributes.length > 0 ? (
                                                activeAttributes.map(attr => (
                                                    <Col md={12} key={attr.id}>
                                                        <AttributeEditor
                                                            attribute={attr}
                                                            details={productDetails[attr.id] || []}
                                                            onAddDetail={handleAddDetail}
                                                            onDetailChange={handleDetailChange}
                                                            onRemoveDetail={handleRemoveDetail}
                                                        />
                                                    </Col>
                                                ))
                                            ) : (
                                                <Alert variant="info" className="text-center m-3">
                                                    Danh mục hiện tại ({categories.find(c => c.id.toString() === productFormData.categoryId)?.name || 'N/A'}) không có thuộc tính nào.
                                                </Alert>
                                            )}
                                        </Row>
                                    ) : (
                                        <Alert variant="warning" className="text-center">
                                            Vui lòng chọn **Danh mục** để hiển thị và quản lý thuộc tính.
                                        </Alert>
                                    )}
                                </fieldset>

                                {/* Nút Submit */}
                                <div className="text-center mt-4">
                                    <Button variant="primary" type="submit" disabled={loading || loadingInitial || restaurants.length === 0} className="px-5">
                                        {loading ? <Spinner animation="border" size="sm" className="me-2" /> : 'Lưu Cập Nhật'}
                                    </Button>
                                    {restaurants.length === 0 && <Form.Text className="d-block text-danger mt-2">Không thể lưu vì Owner chưa có nhà hàng.</Form.Text>}
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}