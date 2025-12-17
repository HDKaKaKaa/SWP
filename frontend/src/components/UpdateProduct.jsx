import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Form,
    Input,
    Button,
    Row,
    Col,
    Card,
    Alert,
    Spin,
    Select,
    InputNumber,
    Switch,
    Space,
    List,
    Typography,
    Divider,
} from 'antd';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;
const API_BASE_URL = "http://localhost:8080/api";

const AttributeEditor = React.memo(({ attribute, details, onAddDetail, onDetailChange, onRemoveDetail }) => {
    return (
        <Card
            title={
                <Title level={5} style={{ color: '#1890ff', textAlign: 'center', margin: 0 }}>
                    {attribute.name}
                </Title>
            }
            bordered={true}
            style={{ marginBottom: 24, borderColor: 'rgba(24, 144, 255, 0.25)', backgroundColor: '#fafafa' }}
            bodyStyle={{ padding: 12 }}
        >
            <List
                itemLayout="horizontal"
                dataSource={details}
                renderItem={(detail, index) => (
                    <List.Item
                        key={detail.id || index}
                        style={{ padding: '8px 0', borderBottom: index < details.length - 1 ? '1px solid #f0f0f0' : 'none' }}
                    >
                        <Row gutter={[24, 8]} style={{ width: '120%' }}>
                            <Col xs={24} sm={12} md={12}> 
                                <Input
                                    value={detail.value}
                                    onChange={(e) => onDetailChange(attribute.id, index, 'value', e.target.value)}
                                    placeholder={`Nhập giá trị, VD: L, 50%`}
                                />
                            </Col>

                            <Col xs={24} sm={8} md={8}>
                                <InputNumber
                                    style={{ width: '100%', height: '45px' }}
                                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                    min={0}
                                    step={1000}
                                    value={detail.priceAdjustment}
                                    onChange={(value) => onDetailChange(attribute.id, index, 'priceAdjustment', value || 0)}
                                    
                                />
                            </Col>
                            <Col xs={24} sm={4} md={4}>
                                <Button
                                    danger
                                    type="primary"
                                    size="middle"
                                    onClick={() => onRemoveDetail(attribute.id, index)}
                                    style={{ width: '100%' }}
                                >
                                    Xóa
                                </Button>
                            </Col>
                        </Row>
                    </List.Item>
                )}
            />

            <Button
                type="dashed"
                onClick={() => onAddDetail(attribute.id)}
                style={{ width: '100%', marginTop: 8 }}
                icon={<span style={{ fontWeight: 'bold' }}>+</span>}
            >
                Thêm Tùy chọn cho {attribute.name}
            </Button>
        </Card>
    );
});
// =================================================================
// 2. UpdateProduct Component (Refactored to AntD)
// =================================================================

export default function UpdateProduct({ onProductActionSuccess, restaurants = [], productData }) {

    const [categories, setCategories] = useState([]);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeAttributes, setActiveAttributes] = useState([]);

    // Dùng useMemo để tạo dữ liệu sản phẩm cần cập nhật
    const initialProductState = useMemo(() => {
        // Hàm trợ giúp để tìm ID từ nhiều vị trí phổ biến
        const findId = (data, primaryKey, nestedKey) => {
            if (!data) return '';
            const idValue = data[primaryKey];
            const nestedIdValue = data[nestedKey]?.id;
            const simpleIdValue = (typeof data[nestedKey] === 'number' && data[nestedKey] > 0) ? data[nestedKey] : null;
            const finalId = idValue || nestedIdValue || simpleIdValue;
            // Chuyển sang string cho Select của AntD
            return finalId ? finalId.toString() : '';
        };

        return {
            id: productData?.id || null,
            name: productData?.name || '',
            description: productData?.description || '',
            categoryId: findId(productData, 'categoryId', 'category'),
            price: productData?.price || 0,
            isAvailable: productData?.isAvailable ?? true,
            restaurantId: findId(productData, 'restaurantId', 'restaurant')
        };
    }, [productData]);


    const [productFormData, setProductData] = useState(initialProductState);
    const [productImage, setProductImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(productData?.image || null);

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
        setProductData(initialProductState);
        // Cập nhật Ảnh cũ khi productData thay đổi 
        setImagePreview(productData?.image || null);
    }, [initialProductState, productData?.image]);


    // --- 2. Fetch Attributes & Khởi tạo Product Details khi Category đổi/Load lần đầu ---
    useEffect(() => {
        const categoryId = Number(productFormData.categoryId);

        const groupDetailsByAttribute = (details) => {
            const grouped = {};
            if (!Array.isArray(details)) return grouped;

            details.forEach(detail => {
                // Sử dụng Number(detail.attributeId) để đảm bảo key là number (nếu cần)
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
                const groupedExistingDetails = (id === Number(initialProductState.categoryId))
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
    }, [productFormData.categoryId, productData?.productDetails, initialProductState.categoryId]);


    // --- Handlers ---

    const handleChange = (name, value) => {
        setProductData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProductImage(file);
            setImagePreview(URL.createObjectURL(file));
        } else {
            setProductImage(null);
            // Giữ ảnh cũ nếu người dùng không chọn file mới và không xóa file
            setImagePreview(productData?.image || null);
        }
    };

    // Giữ nguyên các hàm handleDetail (Add, Change, Remove) - Đã dùng useCallback
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

    // --- Xử lý Submit (Cập nhật) ---
    const handleSubmit = async () => {
        setError(null);
        setLoading(true);

        const { id, name, price, restaurantId, categoryId, description, isAvailable } = productFormData;

        // 1. CHUYỂN ĐỔI KIỂU DỮ LIỆU SANG NUMBER (vì AntD Select và InputNumber trả về string hoặc number)
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
            setError("Vui lòng điền đầy đủ thông tin cơ bản (Tên, Giá, Nhà hàng, Danh mục) và đảm bảo các ID hợp lệ.");
            setLoading(false);
            return;
        }

        // Kiểm tra ảnh
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

        // 4. TẠO OBJECT JSON cho ProductUpdateRequestDTO
        const productRequestData = {
            name: name.trim(),
            description: description.trim(),
            categoryId: categoryIdNum,
            price: priceNum,
            isAvailable,
            productDetails: productDetailsList
        };

        // 5. GỬI REQUEST
        const formData = new FormData();

        // ProductRequest DTO
        formData.append(
            'productRequest',
            new Blob([JSON.stringify(productRequestData)], { type: 'application/json' })
        );

        // Chỉ thêm file ảnh nếu có file mới được chọn
        if (productImage) {
            formData.append('imageFile', productImage);
        }

        try {
            const API_UPDATE_PRODUCT = `${API_BASE_URL}/owner/products/${id}`;
            await axios.put(API_UPDATE_PRODUCT, formData, {
                headers: {
                    // Cần thiết nếu có gửi token/auth, nhưng ở đây chỉ cần đảm bảo content type
                }
            });

            onProductActionSuccess(`Đã cập nhật sản phẩm "${name}" thành công.`);

        } catch (apiError) {
            console.error('Lỗi khi cập nhật sản phẩm:', apiError.response || apiError);
            const status = apiError.response?.status;
            let errorMsg = 'Lỗi kết nối hoặc lỗi dữ liệu. Vui lòng kiểm tra lại.';

            if (status === 400) {
                errorMsg = apiError.response?.data?.message || "Định dạng ảnh không hợp lệ.";
            } else if (status === 404) {
                errorMsg = "Không tìm thấy sản phẩm hoặc tài nguyên liên quan.";
            } else if (status === 403) {
                errorMsg = "Không có quyền truy cập để sửa sản phẩm này.";
            } else if (status === 413) {
                errorMsg = "Kích thước ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn.";
            } else if (status === 500) {
                errorMsg = apiError.response?.data?.message || "Lỗi máy chủ nội bộ. Vui lòng thử lại sau.";
            }

            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    // --- Render ---
    if (!productData?.id) {
        return <Alert
            type="warning"
            showIcon
            message="Lỗi"
            description="Không có dữ liệu sản phẩm để cập nhật. Vui lòng chọn một sản phẩm hợp lệ."
            style={{ margin: 24 }}
        />;
    }

    return (
        <div style={{ padding: '16px 0' }}>
            <Row justify="center">
                <Col xs={24} md={22} lg={18}>
                    <Card style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}>
                        <Title level={3} style={{ textAlign: 'center', color: '#1890ff', marginBottom: 24 }}>
                            Cập Nhật Sản Phẩm
                        </Title>

                        <Spin spinning={loadingInitial} tip="Đang tải dữ liệu ban đầu...">
                            {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

                            {/* Ant Design Form with manual state handling */}
                            <Form
                                layout="vertical"
                                onFinish={handleSubmit}
                                initialValues={initialProductState}
                            >

                                {/* 1. THÔNG TIN SẢN PHẨM CƠ BẢN */}
                                <Card title={<Title level={5} style={{ color: '#1890ff', margin: 0 }}>1. Thông tin cơ bản</Title>} style={{ marginBottom: 24 }}>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item
                                                label={<Text strong>Tên sản phẩm:</Text>}
                                                required
                                                tooltip="Tên sản phẩm không được để trống"
                                            >
                                                <Input
                                                    name="name"
                                                    value={productFormData.name}
                                                    onChange={(e) => handleChange('name', e.target.value)}
                                                    placeholder="Ví dụ: Trà sữa Trân châu Đường đen"
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item
                                                label={<Text strong>Giá (VND):</Text>}
                                                required
                                            >
                                                <InputNumber
                                                    style={{ width: '100%' }}
                                                    name="price"
                                                    min={0}
                                                    step={1000}
                                                    value={productFormData.price}
                                                    onChange={(value) => handleChange('price', value || 0)}
                                                    addonAfter="VND"
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={16} style={{ marginBottom: 16 }}>
                                        {/* Select Restaurant */}
                                        <Col xs={24} md={8}>
                                            <Form.Item
                                                label={<Text strong>Gán cho Nhà hàng:</Text>}
                                                required
                                            >
                                                <Select
                                                    value={productFormData.restaurantId || undefined}
                                                    placeholder="Chọn Nhà hàng"
                                                    onChange={(value) => handleChange('restaurantId', value)}
                                                    disabled={restaurants.length === 0}
                                                >
                                                    {restaurants.map((r) => (
                                                        <Option key={r.id.toString()} value={r.id.toString()}>
                                                            {r.name}
                                                        </Option>
                                                    ))}
                                                </Select>
                                                {restaurants.length === 0 && <Text type="danger">Owner chưa có nhà hàng nào.</Text>}
                                            </Form.Item>
                                        </Col>

                                        {/* Select Category */}
                                        <Col xs={24} md={8}>
                                            <Form.Item
                                                label={<Text strong>Danh mục:</Text>}
                                                required
                                            >
                                                <Select
                                                    value={productFormData.categoryId || undefined}
                                                    placeholder="Chọn Danh mục"
                                                    onChange={(value) => handleChange('categoryId', value)}
                                                    disabled={loadingInitial || categories.length === 0}
                                                >
                                                    {categories.map((cat) => (
                                                        <Option key={cat.id.toString()} value={cat.id.toString()}>
                                                            {cat.name}
                                                        </Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        </Col>

                                        {/* Switch Trạng Thái */}
                                        <Col xs={24} md={8}>
                                            <Form.Item
                                                label={<Text strong>Trạng Thái:</Text>}
                                                // AntD Switch uses `checked` prop, so we need to pass a boolean
                                                valuePropName="checked"
                                            >
                                                <Switch
                                                    checkedChildren="Đang Bán"
                                                    unCheckedChildren="Ngừng Bán"
                                                    checked={productFormData.isAvailable}
                                                    onChange={(checked) => handleChange('isAvailable', checked)}
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    {/* Mô tả */}
                                    <Form.Item
                                        label={<Text strong>Miêu tả:</Text>}
                                    >
                                        <TextArea
                                            rows={3}
                                            name="description"
                                            value={productFormData.description}
                                            onChange={(e) => handleChange('description', e.target.value)}
                                            placeholder="Mô tả chi tiết sản phẩm"
                                        />
                                    </Form.Item>

                                    {/* Ảnh sản phẩm - LOGIC HIỂN THỊ ẢNH CŨ/MỚI */}
                                    <Form.Item
                                        label={<Text strong>Ảnh sản phẩm (Chọn ảnh mới để thay thế ảnh cũ):</Text>}
                                    >
                                        <Space direction="vertical" style={{ width: '100%' }}>
                                            {/* Sử dụng input type="file" chuẩn để giữ nguyên logic handleFileChange */}
                                            <input
                                                type="file"
                                                onChange={handleFileChange}
                                                accept="image/*"
                                                style={{ border: '1px solid #d9d9d9', padding: 4, borderRadius: 6, width: '100%' }}
                                            />

                                            {/* Hiển thị ảnh xem trước/ảnh cũ */}
                                            {imagePreview && (
                                                <Space align="center">
                                                    <img
                                                        src={imagePreview}
                                                        alt="Xem trước ảnh sản phẩm"
                                                        style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ddd' }}
                                                    />
                                                    <Text type="success" style={{ marginLeft: 8 }}>
                                                        {productImage ? "Ảnh mới được chọn." : "Ảnh sản phẩm hiện tại."}
                                                    </Text>
                                                </Space>
                                            )}

                                            {/* Hiển thị cảnh báo nếu không có ảnh nào */}
                                            {!imagePreview && <Text type="danger">Sản phẩm chưa có ảnh. Vui lòng tải lên.</Text>}
                                        </Space>
                                    </Form.Item>

                                </Card>

                                <Divider />

                                {/* 2. THUỘC TÍNH SẢN PHẨM */}
                                <Card title={<Title level={5} style={{ color: '#1890ff', margin: 0 }}>2. Tùy chọn & Thuộc tính (Options)</Title>} style={{ marginBottom: 24 }}>

                                    {Number(productFormData.categoryId) > 0 ? (
                                        <Row gutter={[16, 16]}>
                                            {activeAttributes.length > 0 ? (
                                                activeAttributes.map(attr => (
                                                    <Col xs={24} md={24} key={attr.id}>
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
                                                <Col span={24}>
                                                    <Alert
                                                        type="info"
                                                        message={`Danh mục hiện tại (${categories.find(c => c.id.toString() === productFormData.categoryId)?.name || 'N/A'}) không có thuộc tính nào.`}
                                                        showIcon
                                                        style={{ textAlign: 'center' }}
                                                    />
                                                </Col>
                                            )}
                                        </Row>
                                    ) : (
                                        <Alert
                                            type="warning"
                                            message="Vui lòng chọn Danh mục để hiển thị và quản lý thuộc tính."
                                            showIcon
                                            style={{ textAlign: 'center' }}
                                        />
                                    )}
                                </Card>

                                {/* Nút Submit */}
                                <div style={{ textAlign: 'center', marginTop: 24 }}>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={loading}
                                        disabled={loadingInitial || restaurants.length === 0}
                                        size="large"
                                        style={{ padding: '0 40px' }}
                                    >
                                        Lưu Cập Nhật
                                    </Button>
                                    {restaurants.length === 0 && <Text type="danger" style={{ display: 'block', marginTop: 8 }}>Không thể lưu vì Owner chưa có nhà hàng.</Text>}
                                </div>
                            </Form>
                        </Spin>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}