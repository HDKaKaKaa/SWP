import React, { useState, useEffect } from 'react';
import { Form, Button, Container, Row, Col, Card, Alert, Table, InputGroup, Spinner } from 'react-bootstrap';
import axios from 'axios';

const API_BASE_URL = "http://localhost:8080/api";

// --- Component con để quản lý Product Details
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
                            <tr key={index}>
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


export default function AddProduct({ onProductAdded, restaurants = [] }) {

    const initialRestaurantId = restaurants.length > 0 ? restaurants[0].id : '';
    const [categories, setCategories] = useState([]);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeAttributes, setActiveAttributes] = useState([]);

    const [productData, setProductData] = useState({
        name: '',
        description: '',
        categoryId: '',
        price: 0.00,
        isAvailable: true,
        restaurantId: initialRestaurantId,
    });

    const [productImage, setProductImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [productDetails, setProductDetails] = useState({});


    // --- API LOGIC ---

    // 1. Tải Categories khi component mount
    useEffect(() => {
        const fetchCategories = async () => {
            setError(null);
            try {
                const resCat = await axios.get(`${API_BASE_URL}/categories`);
                const fetchedCategories = resCat.data;
                setCategories(fetchedCategories);
                if (fetchedCategories.length > 0) {
                    setProductData(prev => ({
                        ...prev,
                        categoryId: fetchedCategories[0].id
                    }));
                }
            } catch (err) {
                console.error("Lỗi khi tải danh mục:", err);
                setError("Không thể tải danh mục sản phẩm từ máy chủ.");
            } finally {
                setLoadingInitial(false);
            }
        };
        fetchCategories();
    }, []);
    useEffect(() => {
        if (restaurants.length > 0 && !productData.restaurantId) {
            setProductData(prev => ({ ...prev, restaurantId: restaurants[0].id }));
        }
    }, [restaurants]);

    // 2. Fetch Attributes khi Category đổi
    useEffect(() => {
        const categoryId = productData.categoryId;

        const fetchAttributes = async (id) => {
            setActiveAttributes([]);
            if (!id) {
                setProductDetails({});
                return;
            }
            try {
                const res = await axios.get(`${API_BASE_URL}/categories/${id}/attributes`);
                const attributes = res.data;
                setActiveAttributes(attributes);

                // Khởi tạo hoặc reset productDetails
                const initialDetails = {};
                attributes.forEach(attr => {
                    initialDetails[attr.id] = productDetails[attr.id] || [];
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
    }, [productData.categoryId]);


    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        let processedValue = value;
        if (name === 'categoryId' || name === 'restaurantId') {
            processedValue = Number(value);
        } else if (name === 'price') {
            processedValue = Number(value) >= 0 ? Number(value) : 0;
        }

        setProductData({
            ...productData,
            [name]: type === 'checkbox' ? checked : processedValue,
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProductImage(file);
            setImagePreview(URL.createObjectURL(file));
        } else {
            setImagePreview(null);
            setProductImage(null);
        }
    };

    const handleAddDetail = (attributeId) => {
        const newDetail = { value: '', priceAdjustment: 0.00 };
        setProductDetails(prevDetails => ({
            ...prevDetails,
            [attributeId]: [...(prevDetails[attributeId] || []), newDetail]
        }));
    };

    const handleDetailChange = (attributeId, index, field, value) => {
        const newDetails = [...(productDetails[attributeId] || [])];

        newDetails[index] = {
            ...newDetails[index],
            [field]: field === 'priceAdjustment' ? (Number(value) >= 0 ? Number(value) : 0) : value
        };

        setProductDetails(prevDetails => ({
            ...prevDetails,
            [attributeId]: newDetails
        }));
    };

    const handleRemoveDetail = (attributeId, index) => {
        setProductDetails(prevDetails => ({
            ...prevDetails,
            [attributeId]: prevDetails[attributeId].filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // Validation
        if (!productData.name || productData.price < 0 || !productData.restaurantId || !productData.categoryId) {
            setError("Vui lòng điền đầy đủ thông tin cơ bản (Tên, Giá, Nhà hàng, Danh mục).");
            setLoading(false);
            return;
        }
        if (!productImage) {
            setError("Vui lòng tải lên ảnh sản phẩm.");
            setLoading(false);
            return;
        }

        const productDetailsList = Object.entries(productDetails).flatMap(([attributeId, detailsArray]) =>
            detailsArray
                .filter(detail => detail.value.trim() !== '')
                .map(detail => ({
                    value: detail.value.trim(),
                    priceAdjustment: Number(detail.priceAdjustment),
                    attributeId: Number(attributeId)
                }))
        );

        // 2. TẠO OBJECT JSON cho ProductRequest DTO 
        const productRequestData = {
            name: productData.name,
            description: productData.description,
            categoryId: productData.categoryId,
            price: productData.price,
            isAvailable: productData.isAvailable,
            restaurantId: productData.restaurantId,
            productDetails: productDetailsList
        };

        const formData = new FormData();
        formData.append(
            'productRequest',
            new Blob([JSON.stringify(productRequestData)], { type: 'application/json' })
        );
        formData.append('imageFile', productImage);
        try {
            const API_POST_PRODUCT = `${API_BASE_URL}/products`;
            await axios.post(API_POST_PRODUCT, formData, {
            });

            onProductAdded(`Đã thêm sản phẩm "${productData.name}" thành công.`);

        } catch (apiError) {
            console.error('Lỗi khi thêm sản phẩm:', apiError.response || apiError);
            const status = apiError.response?.status;
            let errorMsg = 'Lỗi kết nối hoặc lỗi dữ liệu. Vui lòng kiểm tra ảnh và các trường bắt buộc.';

            if (status === 400) {
                // Bắt lỗi 400 Bad Request (ví dụ: Định dạng ảnh không hợp lệ)
                errorMsg = apiError.response?.data?.message || "Định dạng ảnh không hợp lệ.";
            } else if (status === 413) {
                // Xử lý lỗi 413 Payload Too Large (Kích thước file vượt quá giới hạn)
                errorMsg = "Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn.";
            } else if (status === 500) {
                // Bắt lỗi 500 (Ví dụ: Lỗi Cloudinary)
                errorMsg = apiError.response?.data?.message || "Lỗi máy chủ nội bộ. Vui lòng thử lại sau.";
            }

            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };
    return (
        <Container className="py-2">
            <Row className="justify-content-center">
                <Col md={12}>
                    <Card className="shadow">
                        <Card.Body>
                            <h3 className="text-center mb-4 text-primary">
                                Thêm Sản Phẩm
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
                                            <Form.Control type="text" name="name" value={productData.name} onChange={handleChange} required placeholder="Ví dụ: Trà sữa Trân châu Đường đen" />
                                        </Form.Group>
                                        <Form.Group as={Col} controlId="productPrice" md={6}>
                                            <Form.Label className="fw-bold">Giá (VND):</Form.Label>
                                            <InputGroup>
                                                <Form.Control type="number" name="price" value={productData.price} onChange={handleChange} required min="0" step="1000" />
                                                <InputGroup.Text>VND</InputGroup.Text>
                                            </InputGroup>
                                        </Form.Group>
                                    </Row>

                                    <Row className="mb-3">
                                        {/* Select Restaurant */}
                                        <Form.Group as={Col} controlId="restaurantId" md={4}>
                                            <Form.Label className="fw-bold">Gán cho Nhà hàng:</Form.Label>
                                            <Form.Select
                                                name="restaurantId"
                                                value={productData.restaurantId}
                                                onChange={handleChange}
                                                required
                                                disabled={restaurants.length === 0}
                                            >
                                                {restaurants.map((r) => (
                                                    <option key={r.id} value={r.id}>
                                                        {r.name}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                            {restaurants.length === 0 && <Form.Text className="text-danger">Owner chưa có nhà hàng nào.</Form.Text>}
                                        </Form.Group>

                                        {/* Select Category */}
                                        <Form.Group as={Col} controlId="categoryId" md={4}>
                                            <Form.Label className="fw-bold">Danh mục:</Form.Label>
                                            <Form.Select
                                                name="categoryId"
                                                value={productData.categoryId}
                                                onChange={handleChange}
                                                required
                                                disabled={loadingInitial || categories.length === 0}
                                            >
                                                {categories.map((cat) => (
                                                    <option key={cat.id} value={cat.id}>
                                                        {cat.name}
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>

                                        <Form.Group as={Col} controlId="isAvailable" md={4} className="d-flex align-items-end">
                                            <Form.Check
                                                type="switch"
                                                id="isAvailable"
                                                name="isAvailable"
                                                checked={productData.isAvailable}
                                                onChange={handleChange}
                                                label={`${productData.isAvailable ? 'Đang Bán' : 'Ngừng Bán'}`}
                                                className="pb-1"
                                            />
                                        </Form.Group>
                                    </Row>

                                    <Form.Group controlId="productDescription" className="mb-3">
                                        <Form.Label className="fw-bold">Miêu tả:</Form.Label>
                                        <Form.Control as="textarea" rows={3} name="description" value={productData.description} onChange={handleChange} placeholder="Mô tả chi tiết về món ăn" />
                                    </Form.Group>

                                    <Form.Group controlId="productImage" className="mb-3">
                                        <Form.Label className="fw-bold">Ảnh sản phẩm (Tối đa 1 File):</Form.Label>
                                        <Form.Control type="file" name="imageFile" accept="image/*" onChange={handleFileChange} required={!imagePreview} />
                                        {imagePreview && (
                                            <div className="mt-3 text-center border p-2 rounded">
                                                <img src={imagePreview} alt="Preview" style={{ maxWidth: '100%', height: 'auto', maxHeight: '150px', borderRadius: '4px' }} className="img-fluid" />
                                            </div>
                                        )}
                                    </Form.Group>
                                </fieldset>

                                {/* Quản lý tùy chọn thuộc tính */}
                                <fieldset className="border p-4 rounded mb-4">
                                    <legend className="float-none w-auto px-2 fs-5 text-danger">2. Cấu hình Tùy chọn</legend>
                                    <p className="fst-italic text-muted mb-3">
                                        Định nghĩa các tùy chọn cho sản phẩm này dựa trên danh mục món đã chọn.
                                    </p>

                                    {activeAttributes.length > 0 ? (
                                        activeAttributes.map((attr) => (
                                            <AttributeEditor
                                                key={attr.id}
                                                attribute={attr}
                                                details={productDetails[attr.id] || []}
                                                onAddDetail={handleAddDetail}
                                                onDetailChange={handleDetailChange}
                                                onRemoveDetail={handleRemoveDetail}
                                            />
                                        ))
                                    ) : (
                                        <Alert variant="success" className="border-start border-5 border-success">
                                            Danh mục {categories.find(c => c.id === productData.categoryId)?.name || 'đang chọn'} không yêu cầu thuộc tính tùy chỉnh.
                                        </Alert>
                                    )}
                                </fieldset>

                                <Button
                                    variant="danger"
                                    type="submit"
                                    className="w-30 mt-3 justify-content-center d-flex mx-auto"
                                    disabled={loading || loadingInitial || restaurants.length === 0}
                                >
                                    {loading ? (
                                        <>
                                            <Spinner animation="border" size="sm" className="me-2" />
                                            Đang Lưu...
                                        </>
                                    ) : (
                                        "Lưu sản phẩm"
                                    )}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}