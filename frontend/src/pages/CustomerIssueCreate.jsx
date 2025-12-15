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
    Tag,
} from 'antd';
import { InboxOutlined } from '@ant-design/icons';

import { useAuth } from '../context/AuthContext';
import { getCustomerOrders } from '../services/orderService';
import { uploadImage } from '../services/categoryService';
import { createIssue, addIssueAttachment } from '../services/issueService';

import '../css/CustomerIssueCreate.css';

const { Title, Text } = Typography;
const { TextArea } = Input;

const TARGET_OPTIONS = [
    { value: 'SYSTEM', label: 'Hỗ trợ hệ thống / Báo lỗi' },
    { value: 'RESTAURANT', label: 'Khiếu nại Quán ăn' },
    { value: 'SHIPPER', label: 'Khiếu nại Shipper' },
    { value: 'ORDER', label: 'Vấn đề đơn hàng' },
    { value: 'OTHER', label: 'Khác (Other)' },
];

const CATEGORY_BY_TARGET = {
    SYSTEM: [
        { value: 'APP_BUG', label: 'Lỗi ứng dụng' },
        { value: 'PAYMENT_PROBLEM', label: 'Vấn đề thanh toán' },
        { value: 'ACCOUNT_PROBLEM', label: 'Vấn đề tài khoản' },
        { value: 'PROMOTION_PROBLEM', label: 'Vấn đề khuyến mãi' },
        { value: 'OTHER', label: 'Khác (Other)' },
    ],
    RESTAURANT: [
        { value: 'FOOD_QUALITY', label: 'Chất lượng món ăn' },
        { value: 'MISSING_ITEM', label: 'Thiếu món' },
        { value: 'WRONG_ITEM', label: 'Sai món' },
        { value: 'DAMAGED', label: 'Hư hỏng/đổ vỡ' },
        { value: 'OTHER', label: 'Khác (Other)' },
    ],
    SHIPPER: [
        { value: 'LATE_DELIVERY', label: 'Giao trễ' },
        { value: 'SHIPPER_BEHAVIOR', label: 'Thái độ shipper' },
        { value: 'DAMAGED', label: 'Hư hỏng/đổ vỡ trong quá trình giao' },
        { value: 'OTHER', label: 'Khác (Other)' },
    ],
    ORDER: [
        { value: 'ORDER_STATUS_WRONG', label: 'Trạng thái đơn sai' },
        { value: 'CANNOT_CONTACT', label: 'Không liên hệ được' },
        { value: 'DELIVERY_PROBLEM', label: 'Vấn đề giao nhận (khác)' },
        { value: 'OTHER', label: 'Khác (Other)' },
    ],
    OTHER: [
        { value: 'OTHER', label: 'Khác (Other)' },
    ],
};

const mapCategoryToDb = (uiCategory, targetType) => {
    if (!uiCategory) return 'OTHER';

    // giữ OTHER
    if (uiCategory === 'OTHER') return 'OTHER';

    // SHIPPER
    if (uiCategory === 'SHIPPER_BEHAVIOR') return 'SHIPPER_BEHAVIOR';
    if (uiCategory === 'LATE_DELIVERY') return 'DELIVERY';

    // RESTAURANT
    if (uiCategory === 'FOOD_QUALITY') return 'FOOD';
    if (uiCategory === 'MISSING_ITEM' || uiCategory === 'WRONG_ITEM') return 'ITEM';

    // ORDER/DELIVERY
    if (uiCategory === 'DAMAGED') return targetType === 'RESTAURANT' ? 'ITEM' : 'DELIVERY';
    if (uiCategory === 'ORDER_STATUS_WRONG' || uiCategory === 'CANNOT_CONTACT' || uiCategory === 'DELIVERY_PROBLEM')
        return 'DELIVERY';

    // SYSTEM
    if (targetType === 'SYSTEM') return 'OTHER';

    return 'OTHER';
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

    // watch values (phải khai báo trước khi dùng trong useMemo/useEffect)
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

    // Khi đổi targetType: reset các field phụ thuộc + ẩn order nếu không cần
    useEffect(() => {
        // reset category khi đổi target để tránh category "lạc quẻ"
        form.setFieldsValue({
            category: undefined,
            otherCategory: undefined,
            targetId: undefined,
            targetNote: undefined,
            orderId: needsOrder ? form.getFieldValue('orderId') : undefined,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTargetType]); // dùng selectedTargetType thôi để tránh loop

    useEffect(() => {
        if (selectedTargetType === 'OTHER') {
            form.setFieldsValue({
                category: 'OTHER',
                otherCategory: undefined,
                targetNote: undefined,
                orderId: undefined,
                targetId: undefined,
            });
        }
    }, [selectedTargetType, form]);

    // Auto-fill targetId theo targetType khi có order
    useEffect(() => {
        // nếu không cần order => targetId luôn null
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
            setAttachmentUrls((prev) => [...prev, url]);
            onSuccess?.({ url });
        } catch (error) {
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

        // nếu needsOrder thì bắt buộc orderId
        if (needsOrder && !values.orderId) {
            message.error('Vui lòng chọn đơn hàng.');
            return;
        }

        //  nếu khiếu nại shipper thì order phải có shipperId
        if (values.targetType === 'SHIPPER' && needsOrder) {
            const shipperFromOrder =
                selectedOrder?.shipperId ??
                selectedOrder?.shipper_id ??
                selectedOrder?.shipper?.accountId ??
                selectedOrder?.shipper?.id ??
                null;

            if (!shipperFromOrder) {
                console.log('shipperFromOrder', shipperFromOrder);
                message.error('Đơn hàng này chưa có shipper, không thể khiếu nại shipper.');
                return;
            }
        }

        //  OTHER validation
        if (values.targetType !== 'OTHER') {
            if (values.category === 'OTHER' && !(values.otherCategory || '').trim()) {
                message.error('Vui lòng nhập danh mục khác (Other).');
                return;
            }
        }

        try {
            setSubmitting(true);

            const dbCategory = mapCategoryToDb(values.category, values.targetType);

            const payload = {
                accountId: user.id,
                orderId: needsOrder ? values.orderId : null,

                targetType: values.targetType,
                targetId: (needsOrder && values.targetType !== 'OTHER') ? (values.targetId || null) : null,
                targetNote: null,

                category: values.targetType === 'OTHER' ? 'OTHER' : dbCategory,
                otherCategory:
                    (dbCategory === 'OTHER' && values.category === 'OTHER' && values.targetType !== 'OTHER')
                        ? (values.otherCategory || '').trim()
                        : null,

                title: values.title?.trim(),
                description: values.description?.trim(),
            };

            const created = await createIssue(payload);

            if (attachmentUrls.length > 0) {
                for (const url of attachmentUrls) {
                    await addIssueAttachment(created.id, {
                        accountId: user.id,
                        attachmentUrl: url,
                        content: 'Bằng chứng',
                    });
                }
            }

            message.success('Đã gửi yêu cầu hỗ trợ/khiếu nại.');
            navigate('/support');
        } catch (error) {
            const msg = error?.response?.data || 'Gửi yêu cầu thất bại.';
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
                    <Text type="secondary">
                        {needsOrder ? (
                            <>Bạn chỉ có thể tạo khiếu nại cho đơn hàng <Tag color="green">COMPLETED</Tag>.</>
                        ) : (
                            <>Gửi yêu cầu hỗ trợ hệ thống không cần chọn đơn hàng.</>
                        )}
                    </Text>
                </div>

                <Divider />

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onSubmit}
                    initialValues={{
                        targetType: 'SYSTEM', // chọn đối tượng trước
                    }}
                >
                    {/* 1) Chọn đối tượng trước */}
                    <Form.Item
                        label="Bạn muốn hỗ trợ / khiếu nại về"
                        name="targetType"
                        rules={[{ required: true, message: 'Vui lòng chọn đối tượng' }]}
                    >
                        <Select options={TARGET_OPTIONS} />
                    </Form.Item>

                    {/* 2) Chỉ hiện chọn order khi needsOrder */}
                    {needsOrder && (
                        <>
                            <Form.Item
                                label="Chọn đơn hàng (COMPLETED)"
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

                    {/* 3) Category filter theo targetType */}
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

                    {selectedCategory === 'OTHER' && selectedTargetType !== 'OTHER' && (
                        <Form.Item
                            label="Danh mục khác (Other)"
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
                        <TextArea rows={5} placeholder="Mô tả rõ vấn đề để được hỗ trợ nhanh hơn" maxLength={1000} showCount />
                    </Form.Item>

                    <Form.Item label="Ảnh minh chứng (tối đa 3 ảnh, < 5MB/ảnh)">
                        <Upload.Dragger
                            multiple
                            maxCount={3}
                            fileList={fileList}
                            beforeUpload={beforeUpload}
                            customRequest={handleCustomUpload}
                            onChange={({ fileList: fl }) => setFileList(fl)}
                            onRemove={handleRemoveFile}
                            accept="image/*"
                            className="issue-create-uploader"
                        >
                            <p className="ant-upload-drag-icon">
                                <InboxOutlined />
                            </p>
                            <p className="ant-upload-text">Kéo thả ảnh vào đây hoặc click để chọn ảnh</p>
                            <p className="ant-upload-hint">
                                Ảnh sẽ được upload lên Cloudinary (thông qua API /api/upload/image).
                            </p>
                        </Upload.Dragger>
                    </Form.Item>

                    <Space className="issue-create-actions">
                        <Button onClick={() => navigate('/support')} disabled={submitting || uploading}>
                            Xem lịch sử
                        </Button>
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