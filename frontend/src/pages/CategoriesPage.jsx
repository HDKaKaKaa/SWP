import React, { useState, useEffect } from 'react';
import {
    Table, Button, Modal, Form, Input, Space, message, Popconfirm, Card, Image, Upload, Tag, Divider
} from 'antd'; // <-- Đã thêm Tag, Divider
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, MinusCircleOutlined
} from '@ant-design/icons'; // <-- Đã thêm MinusCircleOutlined
import {
    getAllCategories, createCategory, updateCategory, deleteCategory, uploadImage
} from '../services/categoryService';

const CategoriesPage = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [fileList, setFileList] = useState([]);

    const [form] = Form.useForm();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getAllCategories();
            setCategories(data);
        } catch (error) {
            message.error('Không thể tải danh sách danh mục!');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditingCategory(null);
        setFileList([]);
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleEdit = (record) => {
        setEditingCategory(record);
        if (record.image) {
            setFileList([{
                uid: '-1',
                name: 'hinh-anh-hien-tai.png',
                status: 'done',
                url: record.image,
            }]);
        } else {
            setFileList([]);
        }
        form.setFieldsValue(record);
        setIsModalOpen(true);
    };

    // --- VALIDATE FILE 10MB ---
    const beforeUpload = (file) => {
        const isLt10M = file.size / 1024 / 1024 < 10;
        if (!isLt10M) {
            message.error('Ảnh phải nhỏ hơn 10MB!');
            return Upload.LIST_IGNORE;
        }
        return true;
    };

    const customUpload = async ({ file, onSuccess, onError }) => {
        try {
            const imageUrl = await uploadImage(file);
            form.setFieldValue('image', imageUrl);
            onSuccess(null, file);
            message.success('Upload ảnh thành công!');
        } catch (error) {
            onError(error);
            message.error('Upload ảnh thất bại!');
        }
    };

    const handleUploadChange = ({ fileList: newFileList }) => {
        setFileList(newFileList);
    };

    const handleFinish = async (values) => {
        // Log để kiểm tra dữ liệu gửi đi
        console.log("Submit values:", values);

        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, values);
                message.success('Cập nhật thành công!');
            } else {
                await createCategory(values);
                message.success('Thêm mới thành công!');
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            // Xử lý thông báo lỗi an toàn
            let errorMsg = 'Có lỗi xảy ra!';
            if (error.response && error.response.data) {
                if (typeof error.response.data === 'string') {
                    errorMsg = error.response.data;
                } else if (error.response.data.message) {
                    errorMsg = error.response.data.message;
                } else if (error.response.data.error) {
                    errorMsg = error.response.data.error;
                }
            }
            message.error(errorMsg);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteCategory(id);
            message.success('Xóa thành công!');
            fetchData();
        } catch (error) {
            message.error('Xóa thất bại (Danh mục đang được sử dụng).');
        }
    };

    const columns = [
        {
            title: 'Hình ảnh',
            dataIndex: 'image',
            align: 'center',
            width: 100,
            render: (url) => (
                <Image
                    width={60}
                    src={url}
                    fallback="https://via.placeholder.com/60?text=No+Img"
                    style={{ borderRadius: 6, objectFit: 'cover' }}
                />
            )
        },
        {
            title: 'Tên danh mục',
            dataIndex: 'name',
            width: 200,
            render: (text) => <strong style={{ color: '#1677ff', fontSize: 15 }}>{text}</strong>
        },
        // --- CỘT THUỘC TÍNH MỚI ---
        {
            title: 'Thuộc tính',
            dataIndex: 'attributes',
            width: 250,
            render: (attributes) => (
                <>
                    {attributes && attributes.length > 0 ? (
                        attributes.map((attr) => (
                            <Tag color="cyan" key={attr.id || attr.name} style={{ margin: '2px' }}>
                                {attr.name}
                            </Tag>
                        ))
                    ) : (
                        <span style={{ color: '#ccc', fontSize: 12 }}>-</span>
                    )}
                </>
            ),
        },
        { title: 'Mô tả', dataIndex: 'description' },
        {
            title: 'Hành động',
            align: 'center',
            width: 120,
            render: (_, record) => (
                <Space>
                    <Button
                        icon={<EditOutlined style={{ color: 'orange' }} />}
                        onClick={() => handleEdit(record)}
                    />
                    <Popconfirm
                        title="Bạn chắc chắn muốn xóa?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                    >
                        <Button danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            <Card
                title="Quản lý Danh mục"
                extra={
                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchData} />
                        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                            Thêm mới
                        </Button>
                    </Space>
                }
            >
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={categories}
                    loading={loading}
                    pagination={{ pageSize: 6 }}
                />
            </Card>

            <Modal
                title={editingCategory ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={600} // Mở rộng modal một chút
            >
                <Form form={form} layout="vertical" onFinish={handleFinish}>
                    <Form.Item
                        name="name"
                        label="Tên danh mục"
                        rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}
                    >
                        <Input placeholder="VD: Trà sữa" />
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={2} />
                    </Form.Item>

                    <Form.Item
                        name="image"
                        label="Hình ảnh"
                        rules={[{ required: true, message: 'Vui lòng upload ảnh!' }]}
                        style={{ display: 'none' }}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item label="Chọn ảnh từ máy (Max 10MB)">
                        <Upload
                            listType="picture-card"
                            maxCount={1}
                            fileList={fileList}
                            onChange={handleUploadChange}
                            customRequest={customUpload}
                            beforeUpload={beforeUpload}
                            onRemove={() => form.setFieldValue('image', '')}
                        >
                            {fileList.length < 1 && (
                                <div>
                                    <PlusOutlined />
                                    <div style={{ marginTop: 8 }}>Upload</div>
                                </div>
                            )}
                        </Upload>
                    </Form.Item>

                    <Divider />

                    {/* --- PHẦN QUẢN LÝ THUỘC TÍNH --- */}
                    <div style={{ marginBottom: 16 }}>
                        <strong>Cấu hình thuộc tính sản phẩm:</strong>
                        <div style={{ fontSize: 12, color: '#888' }}>
                            Định nghĩa các thuộc tính (VD: Size, Mức đường, Mức đá...).
                        </div>
                    </div>

                    <Form.List name="attributes">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">

                                        {/* Input ẩn chứa ID để Backend biết là Update */}
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'id']}
                                            hidden={true}
                                        >
                                            <Input />
                                        </Form.Item>

                                        <Form.Item
                                            {...restField}
                                            name={[name, 'name']}
                                            rules={[{ required: true, message: 'Nhập tên' }]}
                                            style={{ width: 300 }}
                                        >
                                            <Input placeholder="Tên thuộc tính (VD: Size)" />
                                        </Form.Item>

                                        {/* Input ẩn DataType mặc định là TEXT */}
                                        <Form.Item
                                            {...restField}
                                            name={[name, 'dataType']}
                                            initialValue="TEXT"
                                            hidden={true}
                                        >
                                            <Input />
                                        </Form.Item>

                                        <MinusCircleOutlined
                                            onClick={() => remove(name)}
                                            style={{ color: '#ff4d4f', fontSize: 18, cursor: 'pointer' }}
                                        />
                                    </Space>
                                ))}

                                <Form.Item>
                                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                        Thêm thuộc tính mới
                                    </Button>
                                </Form.Item>
                            </>
                        )}
                    </Form.List>
                    {/* ---------------------------------- */}

                    <div style={{ textAlign: 'right', marginTop: 20 }}>
                        <Space>
                            <Button onClick={() => setIsModalOpen(false)}>Hủy</Button>
                            <Button type="primary" htmlType="submit">
                                {editingCategory ? "Lưu thay đổi" : "Tạo mới"}
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default CategoriesPage;