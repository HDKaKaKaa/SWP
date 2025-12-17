/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
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
    Typography,
    Divider,
} from 'antd';
import axios from 'axios';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

const API_BASE_URL = "http://localhost:8080/api";
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// --- Component con hiển thị trình chỉnh sửa thuộc tính ---
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
            {details.map((detail, index) => (
                <Row gutter={[16, 8]} key={index} style={{ marginBottom: 12 }} align="middle">
                    <Col xs={24} sm={12}>
                        <Input
                            value={detail.value}
                            onChange={(e) => onDetailChange(attribute.id, index, 'value', e.target.value)}
                            placeholder={`Giá trị (VD: Size L, 50% Đường)`}
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
                            addonAfter="VND"
                        />
                    </Col>
                    <Col xs={8} sm={4}>
                        <Button 
                            danger 
                            type="primary" 
                            onClick={() => onRemoveDetail(attribute.id, index)}
                            style={{ width: '100%' }}
                        >
                            Xóa
                        </Button>
                    </Col>
                </Row>
            ))}
            <Button
                type="dashed"
                onClick={() => onAddDetail(attribute.id)}
                style={{ width: '100%', marginTop: 8 }}
                icon={<b>+</b>}
            >
                Thêm tùy chọn cho {attribute.name}
            </Button>
        </Card>
    );
});

export default function AddProduct({ onProductActionSuccess, restaurants = [] }) {
    const [form] = Form.useForm();
    const [categories, setCategories] = useState([]);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form State
    const [productFormData, setProductFormData] = useState({
        name: '',
        description: '',
        categoryId: null,
        price: 0,
        isAvailable: true,
        restaurantId: restaurants.length > 0 ? restaurants[0].id.toString() : null
    });
    
    const [productImage, setProductImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [activeAttributes, setActiveAttributes] = useState([]);
    const [productDetails, setProductDetails] = useState({});

    // 1. Tải danh mục sản phẩm
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/categories`);
                setCategories(res.data);
            } catch (err) {
                setError("Không thể tải danh mục sản phẩm.");
            } finally {
                setLoadingInitial(false);
            }
        };
        fetchCategories();
    }, []);

    // 2. Tải thuộc tính khi đổi Category
    useEffect(() => {
        const fetchAttributes = async () => {
            const catId = productFormData.categoryId;
            if (!catId) {
                setActiveAttributes([]);
                setProductDetails({});
                return;
            }
            try {
                const res = await axios.get(`${API_BASE_URL}/categories/${catId}/attributes`);
                setActiveAttributes(res.data);
                // Khởi tạo object rỗng cho mỗi thuộc tính
                const initialDetails = {};
                res.data.forEach(attr => { initialDetails[attr.id] = []; });
                setProductDetails(initialDetails);
            } catch (err) {
                console.error("Lỗi tải thuộc tính:", err);
            }
        };
        fetchAttributes();
    }, [productFormData.categoryId]);

    // --- Handlers ---
    const handleFieldChange = (name, value) => {
        setProductFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                setError("Ảnh không được vượt quá 2MB.");
                return;
            }
            setProductImage(file);
            setImagePreview(URL.createObjectURL(file));
            setError(null);
        }
    };

    const handleAddDetail = useCallback((attrId) => {
        setProductDetails(prev => ({
            ...prev,
            [attrId]: [...(prev[attrId] || []), { value: '', priceAdjustment: 0 }]
        }));
    }, []);

    const handleDetailChange = useCallback((attrId, index, field, value) => {
        setProductDetails(prev => {
            const list = [...prev[attrId]];
            list[index] = { ...list[index], [field]: value };
            return { ...prev, [attrId]: list };
        });
    }, []);

    const handleRemoveDetail = useCallback((attrId, index) => {
        setProductDetails(prev => ({
            ...prev,
            [attrId]: prev[attrId].filter((_, i) => i !== index)
        }));
    }, []);

    const handleSubmit = async () => {
        setError(null);
        if (!productImage) {
            setError("Vui lòng chọn ảnh cho sản phẩm.");
            return;
        }

        setLoading(true);
        try {
            // Chuẩn bị dữ liệu details
            const detailsList = Object.entries(productDetails).flatMap(([attrId, items]) =>
                items.filter(i => i.value.trim() !== '').map(i => ({
                    value: i.value.trim(),
                    priceAdjustment: Number(i.priceAdjustment),
                    attributeId: Number(attrId)
                }))
            );

            const productRequest = {
                ...productFormData,
                price: Number(productFormData.price),
                categoryId: Number(productFormData.categoryId),
                restaurantId: Number(productFormData.restaurantId),
                productDetails: detailsList
            };

            const formData = new FormData();
            formData.append('productRequest', new Blob([JSON.stringify(productRequest)], { type: 'application/json' }));
            formData.append('imageFile', productImage);

            await axios.post(`${API_BASE_URL}/owner/products`, formData);
            onProductActionSuccess(`Thêm sản phẩm "${productFormData.name}" thành công!`);
        } catch (err) {
            setError(err.response?.data?.message || "Lỗi khi tạo sản phẩm mới.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '16px 0' }}>
            <Row justify="center">
                <Col xs={24} md={22} lg={18}>
                    <Card style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <Title level={3} style={{ textAlign: 'center', color: '#1890ff', marginBottom: 24 }}>
                            Thêm Sản Phẩm Mới
                        </Title>

                        <Spin spinning={loadingInitial}>
                            {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

                            <Form layout="vertical" onFinish={handleSubmit}>
                                {/* 1. Thông tin cơ bản */}
                                <Card title={<Title level={5} style={{ color: '#1890ff', margin: 0 }}>1. Thông tin cơ bản</Title>} style={{ marginBottom: 24 }}>
                                    <Row gutter={16}>
                                        <Col span={12}>
                                            <Form.Item label={<Text strong>Tên sản phẩm:</Text>} required>
                                                <Input 
                                                    placeholder="Ví dụ: Cà phê Muối" 
                                                    value={productFormData.name}
                                                    onChange={(e) => handleFieldChange('name', e.target.value)}
                                                />
                                            </Form.Item>
                                        </Col>
                                        <Col span={12}>
                                            <Form.Item label={<Text strong>Giá gốc (VND):</Text>} required>
                                                <InputNumber
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                    step={1000}
                                                    value={productFormData.price}
                                                    onChange={(val) => handleFieldChange('price', val)}
                                                    addonAfter="VND"
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Row gutter={16}>
                                        <Col xs={24} md={10}>
                                            <Form.Item label={<Text strong>Nhà hàng:</Text>} required>
                                                <Select
                                                    placeholder="Chọn nhà hàng"
                                                    value={productFormData.restaurantId}
                                                    onChange={(val) => handleFieldChange('restaurantId', val)}
                                                >
                                                    {restaurants.map(r => (
                                                        <Option key={r.id} value={r.id.toString()}>{r.name}</Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={8}>
                                            <Form.Item label={<Text strong>Danh mục:</Text>} required>
                                                <Select
                                                    placeholder="Chọn danh mục"
                                                    onChange={(val) => handleFieldChange('categoryId', val)}
                                                >
                                                    {categories.map(c => (
                                                        <Option key={c.id} value={c.id.toString()}>{c.name}</Option>
                                                    ))}
                                                </Select>
                                            </Form.Item>
                                        </Col>
                                        <Col xs={24} md={6}>
                                            <Form.Item label={<Text strong>Trạng thái:</Text>}>
                                                <Switch 
                                                    checkedChildren="Đang bán" 
                                                    unCheckedChildren="Ngừng bán" 
                                                    checked={productFormData.isAvailable}
                                                    onChange={(val) => handleFieldChange('isAvailable', val)}
                                                />
                                            </Form.Item>
                                        </Col>
                                    </Row>

                                    <Form.Item label={<Text strong>Mô tả sản phẩm:</Text>}>
                                        <TextArea 
                                            rows={3} 
                                            placeholder="Nhập mô tả..." 
                                            value={productFormData.description}
                                            onChange={(e) => handleFieldChange('description', e.target.value)}
                                        />
                                    </Form.Item>

                                    <Form.Item label={<Text strong>Ảnh sản phẩm:</Text>} required>
                                        <input type="file" accept="image/*" onChange={handleFileChange} style={{ marginBottom: 10 }} />
                                        {imagePreview && (
                                            <div>
                                                <img src={imagePreview} alt="Preview" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid #d9d9d9' }} />
                                            </div>
                                        )}
                                    </Form.Item>
                                </Card>

                                <Divider />

                                {/* 2. Thuộc tính */}
                                <Card title={<Title level={5} style={{ color: '#1890ff', margin: 0 }}>2. Tùy chọn (Size, Topping...)</Title>} style={{ marginBottom: 24 }}>
                                    {productFormData.categoryId ? (
                                        activeAttributes.length > 0 ? (
                                            activeAttributes.map(attr => (
                                                <AttributeEditor
                                                    key={attr.id}
                                                    attribute={attr}
                                                    details={productDetails[attr.id] || []}
                                                    onAddDetail={handleAddDetail}
                                                    onDetailChange={handleDetailChange}
                                                    onRemoveDetail={handleRemoveDetail}
                                                />
                                            ))
                                        ) : <Alert message="Danh mục này không có thuộc tính tùy chọn." type="info" showIcon />
                                    ) : <Alert message="Vui lòng chọn danh mục để thiết lập tùy chọn." type="warning" showIcon />}
                                </Card>

                                <div style={{ textAlign: 'center' }}>
                                    <Button 
                                        type="primary" 
                                        htmlType="submit" 
                                        size="large" 
                                        loading={loading}
                                        style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', minWidth: 200 }}
                                    >
                                        Tạo Sản Phẩm
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