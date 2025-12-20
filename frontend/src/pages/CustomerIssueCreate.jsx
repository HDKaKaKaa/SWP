import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Card,
    Form,
    Select,
    Input,
    Upload,
    Button,
    Typography,
    Space,
    message,
    Divider,
    Tag, Modal,
} from 'antd';
import { InboxOutlined } from '@ant-design/icons';

import { useAuth } from '../context/AuthContext';
import { getCustomerOrders } from '../services/orderService';
import { uploadImage } from '../services/categoryService';
import { createIssue } from '../services/issueService';

import '../css/CustomerIssueCreate.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TARGET_OPTIONS = [
    { value: 'SYSTEM', label: 'Hệ thống' },
    { value: 'RESTAURANT', label: 'Quán ăn' },
    { value: 'SHIPPER', label: 'Shipper' },
    { value: 'ORDER', label: 'Đơn hàng' },
    { value: 'OTHER', label: 'Khác' },
];

const CATEGORY_BY_TARGET = {
    SYSTEM: [
        { value: 'ACCOUNT_PROBLEM', label: 'Vấn đề tài khoản' },
        { value: 'PAYMENT_PROBLEM', label: 'Vấn đề thanh toán' },
        { value: 'APP_BUG', label: 'Lỗi website' },
        { value: 'OTHER', label: 'Khác' },
    ],
    RESTAURANT: [
        { value: 'FOOD_QUALITY', label: 'Chất lượng món ăn' },
        { value: 'MISSING_ITEM', label: 'Thiếu món' },
        { value: 'WRONG_ITEM', label: 'Sai món' },
        { value: 'DAMAGED', label: 'Hư hỏng hoặc đổ vỡ' },
        { value: 'OTHER', label: 'Khác' },
    ],
    SHIPPER: [
        { value: 'LATE_DELIVERY', label: 'Giao trễ' },
        { value: 'SHIPPER_BEHAVIOR', label: 'Thái độ shipper' },
        { value: 'DAMAGED', label: 'Hư hỏng hoặc đổ vỡ khi giao' },
        { value: 'OTHER', label: 'Khác' },
    ],
    ORDER: [
        { value: 'ORDER_STATUS_WRONG', label: 'Trạng thái đơn không đúng' },
        { value: 'CANNOT_CONTACT', label: 'Không liên hệ được' },
        { value: 'DELIVERY_PROBLEM', label: 'Vấn đề giao nhận khác' },
        { value: 'OTHER', label: 'Khác' },
    ],
    OTHER: [{ value: 'OTHER', label: 'Khác' }],
};

const mapSubCategoryToDbCategory = (targetType, uiCategory) => {
    const tt = String(targetType || '').toUpperCase();
    const uc = String(uiCategory || '').toUpperCase();

    if (tt === 'SYSTEM') return 'SYSTEM';
    if (tt === 'OTHER') return 'OTHER';

    if (tt === 'RESTAURANT') {
        if (uc === 'FOOD_QUALITY') return 'FOOD';
        if (['MISSING_ITEM', 'WRONG_ITEM', 'DAMAGED'].includes(uc)) return 'ITEM';
        // "Khác" trong nhóm quán/món ăn vẫn cho OWNER xử lý
        if (uc === 'OTHER') return 'RESTAURANT';
        return 'RESTAURANT';
    }

    if (tt === 'SHIPPER') {
        if (uc === 'SHIPPER_BEHAVIOR') return 'SHIPPER_BEHAVIOR';
        return 'DELIVERY';
    }

    if (tt === 'ORDER') {
        return 'DELIVERY';
    }

    return uc || 'OTHER';
};

const CustomerIssueCreate = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [form] = Form.useForm();

    const [loadingOrders, setLoadingOrders] = useState(false);
    const [orders, setOrders] = useState([]);

    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [attachmentUrls, setAttachmentUrls] = useState([]);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewImage, setPreviewImage] = useState('');
    const [previewTitle, setPreviewTitle] = useState('');

    const handlePreview = async (file) => {
        const url = file.url || file.thumbUrl || file?.response?.url;
        if (url) {
            setPreviewImage(url);
            setPreviewOpen(true);
            setPreviewTitle(file.name || 'Ảnh minh chứng');
            return;
        }
        message.warning('Không thể preview ảnh này.');
    };

    // watch values
    const selectedTargetType = Form.useWatch('targetType', form);
    const selectedOrderId = Form.useWatch('orderId', form);
    const selectedCategory = Form.useWatch('category', form);

    // chỉ cần chọn order khi liên quan đơn hàng/quán/shipper
    const needsOrder = useMemo(() => {
        return ['RESTAURANT', 'SHIPPER', 'ORDER'].includes(selectedTargetType);
    }, [selectedTargetType]);

    // category options phụ thuộc targetType
    const categoryOptions = useMemo(() => {
        if (!selectedTargetType) return [];
        return CATEGORY_BY_TARGET[selectedTargetType] || [];
    }, [selectedTargetType]);

    // load orders COMPLETED (để dùng khi needsOrder)
    useEffect(() => {
        if (!user?.id) return;
        (async () => {
            try {
                setLoadingOrders(true);
                const data = await getCustomerOrders(user.id);
                const completed = (data || []).filter((o) => (o?.status || '').toUpperCase() === 'COMPLETED');
                setOrders(completed);
            } catch (error) {
                console.error(error);
                message.error('Không thể tải danh sách đơn hàng COMPLETED để tạo khiếu nại.');
            } finally {
                setLoadingOrders(false);
            }
        })();
    }, [user?.id]);

    const orderOptions = useMemo(() => {
        return (orders || []).map((o) => ({
            value: o.id,
            label: `${o.orderNumber || `#${o.id}`} • ${o.restaurantName || 'Quán'} • ${
                o.totalAmount ? `${Number(o.totalAmount).toLocaleString('vi-VN')}đ` : ''
            }`,
            raw: o,
        }));
    }, [orders]);

    const selectedOrder = useMemo(() => {
        if (!selectedOrderId) return null;
        return (orders || []).find((o) => o.id === selectedOrderId) || null;
    }, [orders, selectedOrderId]);

    // Khi đổi targetType: reset các field phụ thuộc
    useEffect(() => {
        form.setFieldsValue({
            category: undefined,
            otherCategory: undefined,
            targetId: undefined,
            targetNote: undefined,
            orderId: needsOrder ? form.getFieldValue('orderId') : undefined,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTargetType]);

    useEffect(() => {
        if (selectedTargetType === 'OTHER') {
            form.setFieldsValue({
                category: 'OTHER',
                targetNote: undefined,
                orderId: undefined,
                targetId: undefined,
            });
        }
        if (selectedTargetType === 'SYSTEM') {
            form.setFieldsValue({
                category: form.getFieldValue('category') || 'ACCOUNT_PROBLEM',
                targetId: undefined,
                targetNote: undefined,
                orderId: undefined,
            });
        }
    }, [selectedTargetType, form]);

    // Auto-fill targetId theo targetType khi có order
    useEffect(() => {
        if (!needsOrder) {
            form.setFieldsValue({ targetId: null });
            return;
        }
        if (!selectedOrder) return;
        if (!selectedTargetType) return;

        if (selectedTargetType === 'SHIPPER') {
            const shipperId =
                selectedOrder.shipperId ??
                selectedOrder.shipper_id ??
                selectedOrder.shipper?.accountId ??
                selectedOrder.shipper?.id ??
                null;

            form.setFieldsValue({
                targetId: shipperId,
                targetNote: undefined,
            });
        } else if (selectedTargetType === 'RESTAURANT') {
            const restaurantId = selectedOrder.restaurantId || selectedOrder.restaurant?.id || null;
            form.setFieldsValue({
                targetId: restaurantId,
                targetNote: undefined,
            });
        } else if (selectedTargetType === 'ORDER') {
            form.setFieldsValue({
                targetId: selectedOrder.id,
                targetNote: undefined,
            });
        }
    }, [needsOrder, selectedOrder, selectedTargetType, form]);

    const beforeUpload = (file) => {
        const isImage = file.type?.startsWith('image/');
        if (!isImage) {
            message.error('Chỉ hỗ trợ upload ảnh (JPG/PNG/WebP...).');
            return Upload.LIST_IGNORE;
        }
        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('Ảnh phải nhỏ hơn 5MB.');
            return Upload.LIST_IGNORE;
        }
        return true;
    };

    const handleCustomUpload = async ({ file, onSuccess, onError }) => {
        try {
            setUploading(true);
            const url = await uploadImage(file);

            // lưu url để submit
            setAttachmentUrls((prev) => [...prev, url]);

            // gắn url vào fileList để antd preview được
            setFileList((prev) =>
                prev.map((f) => {
                    if (f.uid === file.uid) {
                        return {
                            ...f,
                            status: 'done',
                            url,       // preview sẽ dùng url này
                            thumbUrl: url,
                            response: { url },
                        };
                    }
                    return f;
                })
            );

            onSuccess?.({ url });
        } catch (error) {
            setFileList((prev) =>
                prev.map((f) => (f.uid === file.uid ? { ...f, status: 'error' } : f))
            );
            onError?.(error);
            message.error('Upload ảnh thất bại.');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveFile = (file) => {
        const url = file?.response?.url || file?.url;
        if (url) {
            setAttachmentUrls((prev) => prev.filter((x) => x !== url));
        }
        return true;
    };

    const onSubmit = async (values) => {
        if (!user?.id) {
            message.warning('Vui lòng đăng nhập để gửi yêu cầu.');
            navigate('/login');
            return;
        }

        if (needsOrder && !values.orderId) {
            message.error('Vui lòng chọn đơn hàng.');
            return;
        }

        if (values.targetType === 'SHIPPER' && needsOrder) {
            const shipperFromOrder =
                selectedOrder?.shipperId ??
                selectedOrder?.shipper_id ??
                selectedOrder?.shipper?.accountId ??
                selectedOrder?.shipper?.id ??
                null;

            if (!shipperFromOrder) {
                message.error('Đơn hàng này chưa có shipper, không thể khiếu nại shipper.');
                return;
            }
        }

        // Xác định uiCategory 1 lần DUY NHẤT
        const uiCategory =
            String(values.targetType || '').toUpperCase() === 'OTHER'
                ? 'OTHER'
                : (values.category || '');

        // Chỉ bắt buộc chọn danh mục khi KHÔNG phải OTHER
        if (String(values.targetType || '').toUpperCase() !== 'OTHER' && !uiCategory) {
            message.error('Vui lòng chọn danh mục.');
            return;
        }

        // OTHER => bắt buộc nhập otherCategory (đúng theo BE)
        if (String(uiCategory || '').toUpperCase() === 'OTHER' && !(values.otherCategory || '').trim()) {
            message.error('Vui lòng nhập danh mục khác.');
            return;
        }

        // FE validate ảnh minh chứng: chỉ bắt buộc cho RESTAURANT (khớp BE)
        const mustHaveAttachment = String(values.targetType || '').toUpperCase() === 'RESTAURANT';
        if (mustHaveAttachment && attachmentUrls.length === 0) {
            message.error('Vui lòng upload ít nhất 1 ảnh minh chứng.');
            return;
        }

        try {
            setSubmitting(true);

            const dbCategory = mapSubCategoryToDbCategory(values.targetType, uiCategory);

            const dbOtherCategory =
                String(uiCategory || '').toUpperCase() === 'OTHER'
                    ? (values.otherCategory || '').trim()
                    : (uiCategory || null);

            const payload = {
                accountId: user.id,
                orderId: needsOrder ? values.orderId : null,

                targetType: values.targetType,
                targetId: needsOrder ? (values.targetId ?? null) : null,
                targetNote: null,

                category: dbCategory,
                otherCategory: dbOtherCategory,

                title: values.title?.trim(),
                description: values.description?.trim(),
            };

            await createIssue({
                ...payload,
                attachments: attachmentUrls.map((url) => ({
                    attachmentUrl: url,
                    content: 'Bằng chứng',
                })),
            });

            message.success('Đã gửi yêu cầu hỗ trợ/khiếu nại.');
            navigate('/support');
        } catch (error) {
            const data = error?.response?.data;
            const msg =
                (typeof data === 'string' && data) ||
                data?.message ||
                data?.error ||
                'Gửi yêu cầu thất bại.';
            message.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="issue-create-page">
            <Card className="issue-create-card">
                <div className="issue-create-header">
                    <Title level={3} className="issue-create-title">Yêu cầu hỗ trợ / Khiếu nại</Title>
                </div>

                <Divider />

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onSubmit}
                    initialValues={{
                        targetType: 'SYSTEM',
                        category: 'ACCOUNT_PROBLEM',
                    }}
                >
                    <Form.Item
                        label="Bạn muốn hỗ trợ / khiếu nại về"
                        name="targetType"
                        rules={[{ required: true, message: 'Vui lòng chọn đối tượng' }]}
                    >
                        <Select options={TARGET_OPTIONS} />
                    </Form.Item>

                    {needsOrder && (
                        <>
                            <Form.Item
                                label="Chọn đơn hàng"
                                name="orderId"
                                rules={[{ required: true, message: 'Vui lòng chọn đơn hàng' }]}
                            >
                                <Select
                                    loading={loadingOrders}
                                    placeholder={loadingOrders ? 'Đang tải...' : 'Chọn đơn hàng'}
                                    options={orderOptions}
                                    showSearch
                                    optionFilterProp="label"
                                />
                            </Form.Item>

                            {selectedOrder && (
                                <div className="issue-create-order-hint">
                                    <Text>
                                        Quán: <b>{selectedOrder.restaurantName || '—'}</b>
                                        {' • '}Shipper: <b>{selectedOrder.shipperName || 'Chưa có'}</b>
                                    </Text>
                                </div>
                            )}
                        </>
                    )}

                    {selectedTargetType !== 'OTHER' && (
                        <div className="issue-create-grid">
                            <Form.Item
                                label="Danh mục"
                                name="category"
                                rules={[{ required: true, message: 'Vui lòng chọn danh mục' }]}
                            >
                                <Select
                                    options={categoryOptions}
                                    placeholder={selectedTargetType ? 'Chọn danh mục' : 'Chọn đối tượng trước'}
                                    disabled={!selectedTargetType}
                                />
                            </Form.Item>

                            <Form.Item label=" " colon={false}>
                                <div />
                            </Form.Item>
                        </div>
                    )}

                    {(selectedTargetType === 'OTHER' || selectedCategory === 'OTHER') && (
                        <Form.Item
                            label={selectedTargetType === 'OTHER' ? 'Bạn muốn hỗ trợ về vấn đề gì' : 'Danh mục khác'}
                            name="otherCategory"
                            rules={[{ required: true, message: 'Vui lòng nhập danh mục khác' }]}
                        >
                            <Input placeholder="Nhập danh mục bạn muốn" />
                        </Form.Item>
                    )}

                    <Form.Item name="targetId" hidden>
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Tiêu đề"
                        name="title"
                        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
                    >
                        <Input placeholder="Ví dụ: Thiếu món trong đơn" maxLength={120} showCount />
                    </Form.Item>

                    <Form.Item
                        label="Mô tả chi tiết"
                        name="description"
                        rules={[{ required: true, message: 'Vui lòng nhập mô tả' }]}
                    >
                        <TextArea
                            rows={5}
                            autoSize={{ minRows: 5}}
                            placeholder="Mô tả rõ vấn đề để được hỗ trợ nhanh hơn"
                            maxLength={1000}
                            showCount
                        />
                    </Form.Item>

                    <Form.Item label="Ảnh minh chứng (tối đa 3 ảnh, < 5MB/ảnh)">
                        <Upload.Dragger
                            multiple
                            maxCount={3}
                            listType="picture-card"
                            onPreview={handlePreview}
                            fileList={fileList}
                            beforeUpload={beforeUpload}
                            customRequest={handleCustomUpload}
                            onChange={({ fileList: fl }) => {
                                setFileList((prev) =>
                                    fl.map((f) => {
                                        const old = prev.find((x) => x.uid === f.uid);
                                        return old ? { ...f, url: f.url || old.url, thumbUrl: f.thumbUrl || old.thumbUrl, response: f.response || old.response } : f;
                                    })
                                );
                            }}
                            onRemove={handleRemoveFile}
                            accept="image/*"
                            className="issue-create-uploader"
                        >
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">Kéo thả ảnh vào đây hoặc click để chọn ảnh</p>
                        </Upload.Dragger>
                    </Form.Item>
                    <Modal
                        open={previewOpen}
                        title={previewTitle}
                        footer={null}
                        onCancel={() => setPreviewOpen(false)}
                    >
                        <img alt="preview" style={{ width: '100%' }} src={previewImage} />
                    </Modal>

                    <Space className="issue-create-actions">
                        <Button type="primary" htmlType="submit" loading={submitting} disabled={uploading}>
                            Gửi yêu cầu
                        </Button>
                    </Space>
                </Form>
            </Card>
        </div>

    );
};

export default CustomerIssueCreate;