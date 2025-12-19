import React, { useState, useEffect } from 'react';
import {
    Table, Button, Modal, Form, Input, Space, message, Popconfirm, Card, Image, Upload, Tag, Divider
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined, MinusCircleOutlined, SearchOutlined
} from '@ant-design/icons';
import {
    getAllCategories, createCategory, updateCategory, deleteCategory, uploadImage
} from '../services/categoryService';

const CategoriesPage = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [fileList, setFileList] = useState([]);

    // --- STATE CHO SEARCH ---
    const [keyword, setKeyword] = useState('');

    const [form] = Form.useForm();

    useEffect(() => {
        fetchData(); // Load lần đầu
    }, []);

    // Fetch có keyword
    const fetchData = async (searchKey = keyword) => {
        setLoading(true);
        try {
            const data = await getAllCategories(searchKey);
            setCategories(data);
        } catch (error) {
            message.error('Không thể tải danh sách danh mục!');
        } finally {
            setLoading(false);
        }
    };

    // Xử lý khi nhấn nút tìm kiếm
    const handleSearch = (value) => {
        setKeyword(value);
        fetchData(value);
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

    const beforeUpload = (file) => {
        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('Ảnh phải nhỏ hơn 5MB!');
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
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, values);
                message.success('Cập nhật thành công!');
            } else {
                await createCategory(values);
                message.success('Thêm mới thành công!');
            }
            setIsModalOpen(false);
            fetchData(); // Load lại dữ liệu sau khi lưu
        } catch (error) {
            let errorMsg = 'Có lỗi xảy ra!';
            if (error.response && error.response.data) {
                // Xử lý message từ backend trả về
                errorMsg = typeof error.response.data === 'string'
                    ? error.response.data
                    : (error.response.data.message || error.response.data.error || JSON.stringify(error.response.data));
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
        // ... (Giữ nguyên columns) ...
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
                    <Button icon={<EditOutlined style={{ color: 'orange' }} />} onClick={() => handleEdit(record)} />
                    <Popconfirm title="Xóa danh mục?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
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
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>Thêm mới</Button>
                }
            >
                {/* --- THANH TÌM KIẾM --- */}
                <div style={{ marginBottom: 16, display: 'flex', gap: 10 }}>
                    <Input.Search
                        placeholder="Tìm theo tên danh mục hoặc thuộc tính..."
                        onSearch={handleSearch}
                        onChange={(e) => {
                            if (e.target.value === '') handleSearch(''); // Reset khi xóa trắng
                        }}
                        enterButton
                        allowClear
                        style={{ width: 400 }}
                    />
                    <Button icon={<ReloadOutlined />} onClick={() => handleSearch(keyword)}>Làm mới</Button>
                </div>

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
                width={600}
            >
                <Form form={form} layout="vertical" onFinish={handleFinish}>
                    {/* --- VALIDATE ĐỘ DÀI TÊN --- */}
                    <Form.Item
                        name="name"
                        label="Tên danh mục"
                        rules={[
                            { required: true, message: 'Vui lòng nhập tên!' },
                            { max: 100, message: 'Tên danh mục tối đa 100 ký tự!' }
                        ]}
                    >
                        <Input placeholder="VD: Trà sữa" showCount maxLength={100} />
                    </Form.Item>

                    {/* --- VALIDATE ĐỘ DÀI MÔ TẢ --- */}
                    <Form.Item
                        name="description"
                        label="Mô tả"
                        rules={[{ max: 100, message: 'Mô tả tối đa 100 ký tự!' }]}
                    >
                        <Input.TextArea rows={2} showCount maxLength={100} />
                    </Form.Item>

                    <Form.Item
                        name="image"
                        label="Hình ảnh"
                        rules={[{ required: true, message: 'Vui lòng upload ảnh!' }]}
                        style={{ display: 'none' }}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item label="Chọn ảnh từ máy (Max 5MB)">
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
                    <div style={{ marginBottom: 16 }}>
                        <strong>Cấu hình thuộc tính sản phẩm:</strong>
                    </div>

                    <Form.List name="attributes">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name, ...restField }) => (
                                    <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                        <Form.Item {...restField} name={[name, 'id']} hidden={true}><Input /></Form.Item>

                                        <Form.Item
                                            {...restField}
                                            name={[name, 'name']}
                                            rules={[{ required: true, message: 'Nhập tên' }]}
                                            style={{ width: 300 }}
                                        >
                                            <Input placeholder="Tên thuộc tính (VD: Size)" />
                                        </Form.Item>

                                        <Form.Item {...restField} name={[name, 'dataType']} initialValue="TEXT" hidden={true}><Input /></Form.Item>

                                        <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f', fontSize: 18, cursor: 'pointer' }} />
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