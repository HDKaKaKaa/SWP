/* eslint-disable no-unused-vars */
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

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;
const API_BASE_URL = "http://localhost:8080/api";

// =================================================================
// 1. AttributeEditor Component (Tối ưu giao diện)
// =================================================================
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
                        <Row gutter={[16, 8]} style={{ width: '100%' }} align="middle">
                            <Col xs={24} sm={12}>
                                <Input
                                    value={detail.value}
                                    onChange={(e) => onDetailChange(attribute.id, index, 'value', e.target.value)}
                                    placeholder={`VD: Size L, 50% đường...`}
                                />
                            </Col>

                            <Col xs={16} sm={8}>
                                <InputNumber
                                    style={{ width: '100%' }}
                                    formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={value => value.replace(/\$\s?|(,*)/g, '')}
                                    min={0}
                                    value={detail.priceAdjustment}
                                    onChange={(value) => onDetailChange(attribute.id, index, 'priceAdjustment', value || 0)}
                                    addonAfter="đ"
                                />
                            </Col>
                            <Col xs={8} sm={4}>
                                <Button
                                    danger
                                    type="text"
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
            >
                + Thêm tùy chọn {attribute.name}
            </Button>
        </Card>
    );
});

// =================================================================
// 2. Main UpdateProduct Component
// =================================================================
export default function UpdateProduct({ onProductActionSuccess, restaurants = [], productData }) {
    const [categories, setCategories] = useState([]);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeAttributes, setActiveAttributes] = useState([]);

    // Memoized initial state
    const initialProductState = useMemo(() => {
        const findId = (data, primaryKey, nestedKey) => {
            if (!data) return '';
            const idValue = data[primaryKey];
            const nestedIdValue = data[nestedKey]?.id;
            const finalId = idValue || nestedIdValue;
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

    const [productFormData, setProductFormData] = useState(initialProductState);
    const [productImage, setProductImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(productData?.image || null);
    const [productDetails, setProductDetails] = useState({});

    // 1. Tải danh mục khi mount
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const resCat = await axios.get(`${API_BASE_URL}/categories`);
                setCategories(resCat.data);
            } catch (err) {
                setError("Không thể tải danh mục sản phẩm.");
            } finally {
                setLoadingInitial(false);
            }
        };
        fetchCategories();
    }, []);

    // 2. Đồng bộ form khi productData thay đổi (khi mở modal mới)
    useEffect(() => {
        setProductFormData(initialProductState);
        setImagePreview(productData?.image || null);
        setError(null);
    }, [initialProductState, productData?.image]);

    // 3. LOGIC QUAN TRỌNG: Fetch Attributes và Pre-fill Product Details
    useEffect(() => {
        const categoryId = Number(productFormData.categoryId);
        
        const fetchAttributesAndDetails = async () => {
            if (!categoryId) {
                setActiveAttributes([]);
                setProductDetails({});
                return;
            }

            try {
                const res = await axios.get(`${API_BASE_URL}/categories/${categoryId}/attributes`);
                const attributes = res.data;
                setActiveAttributes(attributes);

                // Gom nhóm các chi tiết cũ của sản phẩm theo attributeId
                const groupedExistingDetails = {};
                if (Array.isArray(productData?.productDetails)) {
                    productData.productDetails.forEach(detail => {
                        const attrId = detail.attributeId.toString();
                        if (!groupedExistingDetails[attrId]) groupedExistingDetails[attrId] = [];
                        groupedExistingDetails[attrId].push({
                            id: detail.id,
                            value: detail.value || '',
                            priceAdjustment: detail.priceAdjustment || 0
                        });
                    });
                }

                // Khởi tạo state details cho từng attribute của Category
                const initialDetails = {};
                attributes.forEach(attr => {
                    const attrIdStr = attr.id.toString();
                    // Nếu sản phẩm hiện tại thuộc category này và có data cũ, thì pre-fill
                    // Nếu đổi category khác, groupedExistingDetails[attrIdStr] sẽ undefined -> rỗng
                    initialDetails[attrIdStr] = groupedExistingDetails[attrIdStr] || [];
                });

                setProductDetails(initialDetails);
            } catch (err) {
                console.error("Lỗi tải thuộc tính:", err);
            }
        };

        fetchAttributesAndDetails();
    }, [productFormData.categoryId, productData]);

    // --- Handlers ---
    const handleChange = (name, value) => {
        setProductFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                setError("Kích thước ảnh vượt quá 2MB.");
                return;
            }
            setProductImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleAddDetail = useCallback((attributeId) => {
        setProductDetails(prev => ({
            ...prev,
            [attributeId]: [...(prev[attributeId] || []), { value: '', priceAdjustment: 0 }]
        }));
    }, []);

    const handleDetailChange = useCallback((attributeId, index, field, value) => {
        setProductDetails(prev => {
            const newArr = [...(prev[attributeId] || [])];
            newArr[index] = { ...newArr[index], [field]: value };
            return { ...prev, [attributeId]: newArr };
        });
    }, []);

    const handleRemoveDetail = useCallback((attributeId, index) => {
        setProductDetails(prev => ({
            ...prev,
            [attributeId]: prev[attributeId].filter((_, i) => i !== index)
        }));
    }, []);

    const handleSubmit = async () => {
        setError(null);
        setLoading(true);

        const { id, name, price, categoryId, description, isAvailable } = productFormData;

        // Chuẩn bị dữ liệu details (loại bỏ dòng trống)
        const productDetailsList = Object.entries(productDetails).flatMap(([attrId, details]) =>
            details
                .filter(d => d.value.trim() !== '')
                .map(d => ({
                    id: d.id || null,
                    value: d.value.trim(),
                    priceAdjustment: Number(d.priceAdjustment),
                    attributeId: Number(attrId)
                }))
        );

        const productRequestData = {
            name: name.trim(),
            description: description.trim(),
            categoryId: Number(categoryId),
            price: Number(price),
            isAvailable,
            productDetails: productDetailsList
        };

        const formData = new FormData();
        formData.append('productRequest', new Blob([JSON.stringify(productRequestData)], { type: 'application/json' }));
        if (productImage) formData.append('imageFile', productImage);

        try {
            await axios.put(`${API_BASE_URL}/owner/products/${id}`, formData);
            onProductActionSuccess(`Cập nhật "${name}" thành công!`);
        } catch (apiError) {
            setError(apiError.response?.data?.message || "Lỗi cập nhật sản phẩm.");
        } finally {
            setLoading(false);
        }
    };

    if (!productData?.id) return <Alert type="warning" message="Không tìm thấy sản phẩm." showIcon />;

    return (
        <div style={{ padding: '16px 0' }}>
            <Row justify="center">
                <Col xs={24} lg={20}>
                    <Card bordered={false}>
                        <Title level={3} style={{ textAlign: 'center', color: '#1890ff' }}>Cập Nhật Sản Phẩm</Title>
                        
                        <Spin spinning={loadingInitial}>
                            {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

                            <Form layout="vertical" onFinish={handleSubmit}>
                                {/* Phần 1: Thông tin cơ bản */}
                                <Card title="1. Thông tin cơ bản" style={{ marginBottom: 20 }}>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item label="Tên sản phẩm" required>
                                                <Input value={productFormData.name} onChange={e => handleChange('name', e.target.value)} />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item label="Giá bán (VND)" required>
                                                <InputNumber 
                                                    style={{ width: '100%' }} 
                                                    value={productFormData.price} 
                                                    onChange={v => handleChange('price', v)}
                                                    addonAfter="VND"
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={16}>
                                        <Col span={8}>
                                            <Form.Item label="Danh mục" required>
                                                <Select 
                                                    value={productFormData.categoryId} 
                                                    onChange={v => handleChange('categoryId', v)}
                                                >
                                                    {categories.map(c => <Option key={c.id} value={c.id.toString()}>{c.name}</Option>)}
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                            <Form.Item label="Nhà hàng" required>
                                                <Select 
                                                    value={productFormData.restaurantId} 
                                                    onChange={v => handleChange('restaurantId', v)}
                                                >
                                                    {restaurants.map(r => <Option key={r.id} value={r.id.toString()}>{r.name}</Option>)}
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col span={8}>
                                            <Form.Item label="Trạng thái">
                                                <Switch 
                                                    checked={productFormData.isAvailable} 
                                                    onChange={v => handleChange('isAvailable', v)}
                                                    checkedChildren="Đang bán" unCheckedChildren="Ngừng bán" 
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Form.Item label="Mô tả">
                                        <TextArea rows={2} value={productFormData.description} onChange={e => handleChange('description', e.target.value)} />
                                    </Form.Item>

                                    <Form.Item label="Ảnh sản phẩm">
                                        <input type="file" onChange={handleFileChange} accept="image/*" style={{ marginBottom: 10 }} />
                                        {imagePreview && (
                                            <div style={{ marginTop: 10 }}>
                                                <img src={imagePreview} alt="preview" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} />
                                                <div style={{ fontSize: 12, color: '#888' }}>{productImage ? 'Ảnh mới đã chọn' : 'Ảnh hiện tại'}</div>
                                            </div>
                                        )}
                                    </Form.Item>
                                </Card>

                                {/* Phần 2: Thuộc tính tùy chọn */}
                                <Card title="2. Tùy chọn & Thuộc tính (Options)">
                                    {activeAttributes.length > 0 ? (
                                        <Row gutter={[16, 16]}>
                                            {activeAttributes.map(attr => (
                                                <Col span={24} key={attr.id}>
                                                    <AttributeEditor
                                                        attribute={attr}
                                                        details={productDetails[attr.id] || []}
                                                        onAddDetail={handleAddDetail}
                                                        onDetailChange={handleDetailChange}
                                                        onRemoveDetail={handleRemoveDetail}
                                                    />
                                                </Col>
                                            ))}
                                        </Row>
                                    ) : (
                                        <Alert message="Danh mục này không có thuộc tính tùy chọn." type="info" showIcon />
                                    )}
                                </Card>

                                <div style={{ textAlign: 'center', marginTop: 30 }}>
                                    <Button type="primary" htmlType="submit" loading={loading} size="large" style={{ minWidth: 200 }}>
                                        Lưu Cập Nhật
                                    </Button>
                                </div>
                            </Form>
                        </Spin>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}