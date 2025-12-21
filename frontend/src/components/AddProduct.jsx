/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    Typography,
    Divider,
    notification,
    List
} from 'antd';
import axios from 'axios';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;
const API_BASE_URL = "http://localhost:8080/api";

// Regex: Cho phép chữ, số, khoảng trắng và tiếng Việt (không ký tự đặc biệt)
const VALID_NAME_REGEX = /^[a-zA-Z0-9\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđĐ]+$/;

// =================================================================
// 1. AttributeEditor Component (Đồng bộ style với Update)
// =================================================================
const AttributeEditor = React.memo(({ attribute, details, onAddDetail, onDetailChange, onRemoveDetail }) => {
    return (
        <Card
            title={<Title level={5} style={{ color: '#1890ff', margin: 0 }}>{attribute.name}</Title>}
            bordered={true}
            style={{ marginBottom: 16, backgroundColor: '#fafafa' }}
            bodyStyle={{ padding: 12 }}
        >
            <List
                itemLayout="horizontal"
                dataSource={details}
                renderItem={(detail, index) => (
                    <List.Item style={{ padding: '8px 0' }}>
                        <Row gutter={8} style={{ width: '100%' }} align="middle">
                            <Col span={12}>
                                <Input
                                    value={detail.value}
                                    onChange={(e) => onDetailChange(attribute.id, index, 'value', e.target.value)}
                                    placeholder="Giá trị (VD: Size L)"
                                    status={detail.value.trim() === '' ? 'error' : ''}
                                />
                            </Col>
                            <Col span={8}>
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
                            <Col span={4}>
                                <Button danger type="text" onClick={() => onRemoveDetail(attribute.id, index)}>Xóa</Button>
                            </Col>
                        </Row>
                    </List.Item>
                )}
            />
            <Button type="dashed" onClick={() => onAddDetail(attribute.id)} block style={{ marginTop: 8 }}>
                + Thêm {attribute.name}
            </Button>
        </Card>
    );
});

// =================================================================
// 2. Main AddProduct Component
// =================================================================
export default function AddProduct({ onProductActionSuccess, restaurants = [] }) {
    const [form] = Form.useForm();
    const errorRef = useRef(null);
    const fileInputRef = useRef(null);

    const [categories, setCategories] = useState([]);
    const [loadingInitial, setLoadingInitial] = useState(true);
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState(null);
    const [imageError, setImageError] = useState(null);

    const [activeAttributes, setActiveAttributes] = useState([]);
    const [productDetails, setProductDetails] = useState({});
    const [productImage, setProductImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // 1. Tải danh mục ban đầu
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/categories`);
                setCategories(res.data);
            } catch (err) {
                setServerError("Không thể tải danh mục sản phẩm.");
            } finally {
                setLoadingInitial(false);
            }
        };
        fetchCategories();
    }, []);

    // 2. Theo dõi Category thay đổi để load Attributes (Sử dụng useWatch của AntD)
    const selectedCategoryId = Form.useWatch('categoryId', form);

    useEffect(() => {
        const fetchAttributes = async () => {
            if (!selectedCategoryId) {
                setActiveAttributes([]);
                setProductDetails({});
                return;
            }
            try {
                const res = await axios.get(`${API_BASE_URL}/categories/${selectedCategoryId}/attributes`);
                const attributes = res.data;
                setActiveAttributes(attributes);

                // Khởi tạo state details rỗng cho các thuộc tính mới
                const initialDetails = {};
                attributes.forEach(attr => {
                    initialDetails[attr.id.toString()] = [];
                });
                setProductDetails(initialDetails);
            } catch (err) {
                console.error("Lỗi tải thuộc tính:", err);
            }
        };
        fetchAttributes();
    }, [selectedCategoryId]);

    // --- Handlers cho Options (Giống Update) ---
    const handleAddDetail = useCallback((attrId) => {
        setProductDetails(prev => ({
            ...prev,
            [attrId]: [...(prev[attrId] || []), { value: '', priceAdjustment: 0 }]
        }));
    }, []);

    const handleDetailChange = useCallback((attrId, index, field, value) => {
        setProductDetails(prev => {
            const newArr = [...(prev[attrId] || [])];
            newArr[index] = { ...newArr[index], [field]: value };
            return { ...prev, [attrId]: newArr };
        });
    }, []);

    const handleRemoveDetail = useCallback((attrId, index) => {
        setProductDetails(prev => ({
            ...prev,
            [attrId]: prev[attrId].filter((_, i) => i !== index)
        }));
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setImageError(null);
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                notification.error({
                    message: "Ảnh quá lớn",
                    description: "Vui lòng chọn ảnh dưới 2MB"
                });
                setProductImage(null);
                setImagePreview(null);
                setImageError("File vượt quá 2MB, vui lòng chọn file khác.");
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
            }
            setProductImage(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    // --- SUBMIT LOGIC (Đồng bộ hoàn toàn) ---
    const onFinish = async (values) => {
        setServerError(null);

        // Validation ảnh (Bắt buộc khi thêm mới)
        if (!productImage) {
            setImageError("Vui lòng chọn ảnh sản phẩm.");
            errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        setLoading(true);
        try {
            // Validate Options thủ công
            const finalDetails = [];
            for (const [attrId, details] of Object.entries(productDetails)) {
                const checkSet = new Set();
                for (const d of details) {
                    const val = d.value.trim();
                    if (!val) throw new Error(`Vui lòng nhập đầy đủ giá trị cho các tùy chọn.`);
                    if (checkSet.has(val.toLowerCase())) throw new Error(`Giá trị "${val}" bị trùng lặp trong một thuộc tính.`);
                    checkSet.add(val.toLowerCase());

                    finalDetails.push({
                        value: val,
                        priceAdjustment: d.priceAdjustment,
                        attributeId: Number(attrId)
                    });
                }
            }

            const productRequestData = {
                ...values,
                categoryId: Number(values.categoryId),
                restaurantId: Number(values.restaurantId),
                productDetails: finalDetails
            };

            const formData = new FormData();
            formData.append('productRequest', new Blob([JSON.stringify(productRequestData)], { type: 'application/json' }));
            formData.append('imageFile', productImage);

            await axios.post(`${API_BASE_URL}/owner/products`, formData);
            onProductActionSuccess(`Thêm sản phẩm "${values.name}" thành công!`);
        } catch (err) {
            console.error("Full Error Object:", err.response);

            let errorMsg = "";

            // 1. Kiểm tra nếu server có phản hồi (err.response)
            if (err.response) {
                const { status, data } = err.response;

                if (status === 409) {
                    errorMsg = (typeof data === 'string' ? data : data?.message)
                        || "Tên món ăn đã tồn tại trong nhà hàng này. Vui lòng chọn tên khác!";
                } else if (status === 400) {
                    errorMsg = data?.message || "Dữ liệu gửi đi không hợp lệ.";
                } else {
                    errorMsg = data?.message || "Lỗi hệ thống khi tạo sản phẩm.";
                }
            } else {
                errorMsg = "Không thể kết nối đến máy chủ.";
            }

            setServerError(errorMsg);
            if (errorRef.current) {
                errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '16px 0' }}>
            <Spin spinning={loadingInitial}>
                <div ref={errorRef}>
                    {serverError && <Alert type="error" message={serverError} showIcon closable className="mb-4" />}
                </div>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ isAvailable: true }}
                    scrollToFirstError={{ behavior: 'smooth', block: 'center' }}
                    onValuesChange={() => setServerError(null)}
                >
                    <h2 className="text-center">Thêm sản phẩm mới</h2>
                    {/* 1. THÔNG TIN CƠ BẢN */}
                    <Card title="1. Thông tin cơ bản" className="mb-4">
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    label="Tên sản phẩm"
                                    name="name"
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập tên!' },
                                        { min: 2, message: 'Tối thiểu 2 ký tự' },
                                        { max: 100, message: 'Tối đa 100 ký tự' },
                                        { pattern: VALID_NAME_REGEX, message: 'Không được chứa ký tự đặc biệt' }
                                    ]}
                                    validateTrigger={['onChange', 'onBlur']}
                                >
                                    <Input placeholder="Tên sản phẩm..." />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    label="Giá bán (VND)"
                                    name="price"
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập giá!' },
                                        { type: 'number', min: 0, max: 100000000, message: 'Giá từ 0 - 100 triệu' }
                                    ]}
                                >
                                    <InputNumber style={{ width: '100%' }} addonAfter="đ" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={8}>
                                <Form.Item label="Danh mục" name="categoryId" rules={[{ required: true, message: 'Chọn danh mục!' }]}>
                                    <Select placeholder="Chọn danh mục">
                                        {categories.map(c => <Option key={c.id} value={c.id.toString()}>{c.name}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Nhà hàng" name="restaurantId" rules={[{ required: true, message: 'Chọn nhà hàng!' }]}>
                                    <Select placeholder="Chọn nhà hàng">
                                        {restaurants.map(r => <Option key={r.id} value={r.id.toString()}>{r.name}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label="Trạng thái" name="isAvailable" valuePropName="checked">
                                    <Switch checkedChildren="Đang bán" unCheckedChildren="Ngừng bán" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item label="Mô tả" name="description" rules={[{ max: 500, message: 'Tối đa 500 ký tự' }]}>
                            <TextArea rows={3} placeholder="Mô tả sản phẩm..." />
                        </Form.Item>

                        <Form.Item label="Ảnh sản phẩm (Bắt buộc, Tối đa 2MB)" required>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                className="mb-2"
                                style={{ display: 'block' }}
                            />
                            {imageError && (
                                <div style={{ color: '#ff4d4f', marginBottom: 8, fontSize: '12px' }}>
                                    {imageError}
                                </div>
                            )}
                            {imagePreview && (
                                <div className="mt-2">
                                    <img
                                        src={imagePreview}
                                        alt="preview"
                                        style={{
                                            width: 120,
                                            height: 120,
                                            objectFit: 'cover',
                                            borderRadius: 8,
                                            border: '1px solid #ddd'
                                        }}
                                    />
                                </div>
                            )}
                        </Form.Item>
                    </Card>

                    {/* 2. TÙY CHỌN & THUỘC TÍNH */}
                    <Card title="2. Tùy chọn & Thuộc tính (Options)" className="mb-4">
                        {activeAttributes.length > 0 ? (
                            <Row gutter={[16, 16]}>
                                {activeAttributes.map(attr => (
                                    <Col span={24} key={attr.id}>
                                        <AttributeEditor
                                            attribute={attr}
                                            details={productDetails[attr.id.toString()] || []}
                                            onAddDetail={handleAddDetail}
                                            onDetailChange={handleDetailChange}
                                            onRemoveDetail={handleRemoveDetail}
                                        />
                                    </Col>
                                ))}
                            </Row>
                        ) : (
                            <Alert message="Vui lòng chọn danh mục để hiển thị các thuộc tính tùy chọn (nếu có)." type="info" showIcon />
                        )}
                    </Card>

                    <Divider />
                    <div style={{ textAlign: 'center' }}>
                        <Button type="primary" htmlType="submit" loading={loading} size="large" style={{ minWidth: 220 }}>
                            Tạo Sản Phẩm
                        </Button>
                    </div>
                </Form>
            </Spin>
        </div>
    );
}