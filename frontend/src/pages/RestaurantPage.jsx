import React, { useState, useEffect } from 'react';
import {
    Table, Button, Card, Tag, Space, Modal, Image, message, Popconfirm, Descriptions, Input, Tooltip, Select
} from 'antd';
import {
    EyeOutlined,
    ReloadOutlined,
    LockOutlined,
    UnlockOutlined,
    EnvironmentOutlined
} from '@ant-design/icons';
import { getManagedRestaurants, toggleRestaurantStatus } from '../services/restaurantService';

const { Search } = Input;
const { Option } = Select;

const RestaurantsPage = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(false);

    // State quản lý bộ lọc
    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Modal chi tiết
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);

    useEffect(() => {
        fetchData(keyword, statusFilter);
    }, []);

    const fetchData = async (searchVal, statusVal) => {
        setLoading(true);
        try {
            const data = await getManagedRestaurants(searchVal, statusVal);
            setRestaurants(data);
        } catch (error) {
            message.error('Không thể tải danh sách nhà hàng');
        } finally {
            setLoading(false);
        }
    };

    // Xử lý tìm kiếm (Giữ nguyên statusFilter hiện tại)
    const handleSearch = (value) => {
        setKeyword(value);
        fetchData(value, statusFilter);
    };

    // Xử lý chọn status (Giữ nguyên keyword hiện tại)
    const handleStatusChange = (value) => {
        setStatusFilter(value);
        fetchData(keyword, value);
    };

    // XỬ LÝ KHÓA / MỞ KHÓA
    const handleToggleStatus = async (restaurant) => {
        try {
            await toggleRestaurantStatus(restaurant.id);

            const newStatus = restaurant.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
            message.success(`Đã ${newStatus === 'BLOCKED' ? 'KHÓA' : 'MỞ KHÓA'} nhà hàng thành công!`);

            // Load lại dữ liệu với bộ lọc hiện tại
            fetchData(keyword, statusFilter);
        } catch (error) {
            const errorMsg = error.response?.data || 'Có lỗi xảy ra!';
            message.error(errorMsg);
        }
    };

    const showDetail = (record) => {
        setSelectedRestaurant(record);
        setIsModalOpen(true);
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            width: 60,
            align: 'center',
        },
        {
            title: 'Hình ảnh',
            dataIndex: 'image',
            align: 'center',
            render: (src) => (
                <Image width={50} src={src} style={{ borderRadius: 4 }} fallback="https://via.placeholder.com/50"/>
            )
        },
        {
            title: 'Tên quán',
            dataIndex: 'name',
            render: (text) => <b style={{ color: '#1677ff' }}>{text}</b>
        },
        {
            title: 'Chủ quán',
            dataIndex: 'ownerName',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            align: 'center',
            render: (status) => {
                let color = status === 'ACTIVE' ? 'green' : 'red';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: 'Hành động',
            align: 'center',
            render: (_, record) => (
                <Space>
                    <Tooltip title="Xem chi tiết">
                        <Button icon={<EyeOutlined />} onClick={() => showDetail(record)} />
                    </Tooltip>

                    {/* NÚT KHÓA / MỞ KHÓA */}
                    <Popconfirm
                        title={record.status === 'ACTIVE' ? "Khóa nhà hàng này?" : "Mở khóa nhà hàng?"}
                        description={record.status === 'ACTIVE'
                            ? "Nhà hàng sẽ không thể nhận đơn mới. Chỉ khóa được khi không còn đơn hàng nào."
                            : "Nhà hàng sẽ hoạt động trở lại."}
                        onConfirm={() => handleToggleStatus(record)}
                        okText={record.status === 'ACTIVE' ? "Khóa ngay" : "Mở khóa"}
                        cancelText="Hủy"
                        okButtonProps={{ danger: record.status === 'ACTIVE' }}
                    >
                        <Button
                            type={record.status === 'ACTIVE' ? 'default' : 'primary'}
                            danger={record.status === 'ACTIVE'}
                            icon={record.status === 'ACTIVE' ? <LockOutlined /> : <UnlockOutlined />}
                        >
                            {record.status === 'ACTIVE' ? 'Khóa' : 'Mở'}
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 20 }}>
            <Card
                title="Quản lý Danh sách Nhà hàng"
                extra={
                    <Space>
                        {/* --- SELECT BOX MỚI THÊM VÀO --- */}
                        <Select
                            defaultValue="ALL"
                            value={statusFilter}
                            style={{ width: 160 }}
                            onChange={handleStatusChange}
                        >
                            <Option value="ALL">Tất cả trạng thái</Option>
                            <Option value="ACTIVE">Đang hoạt động</Option>
                            <Option value="BLOCKED">Đã khóa</Option>
                        </Select>
                        {/* ------------------------------- */}

                        <Search
                            placeholder="Tìm tên quán, chủ quán..."
                            onSearch={handleSearch}
                            enterButton
                            allowClear
                            style={{ width: 300 }}
                        />
                        <Button icon={<ReloadOutlined />} onClick={() => fetchData(keyword, statusFilter)} />
                    </Space>
                }
            >
                <Table
                    rowKey="id"
                    dataSource={restaurants}
                    columns={columns}
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                    locale={{ emptyText: 'Không tìm thấy nhà hàng nào' }}
                />
            </Card>

            {/* MODAL CHI TIẾT */}
            <Modal
                title="Thông tin chi tiết"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
                width={700}
            >
                {selectedRestaurant && (
                    <div>
                        <div style={{ textAlign: 'center', marginBottom: 20 }}>
                            <Image
                                width={200}
                                src={selectedRestaurant.image}
                                style={{borderRadius: 8, objectFit: 'cover'}}
                            />
                        </div>
                        <Descriptions bordered column={1}>
                            <Descriptions.Item label="Tên quán"><b>{selectedRestaurant.name}</b></Descriptions.Item>
                            <Descriptions.Item label="Chủ quán">{selectedRestaurant.ownerName} - (CCCD: {selectedRestaurant.ownerIdCard})</Descriptions.Item>
                            <Descriptions.Item label="SĐT">{selectedRestaurant.phone}</Descriptions.Item>
                            <Descriptions.Item label="Địa chỉ">{selectedRestaurant.address}</Descriptions.Item>
                            <Descriptions.Item label="Mô tả">{selectedRestaurant.description}</Descriptions.Item>
                            <Descriptions.Item label="Ngày tham gia">{selectedRestaurant.createdAt}</Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                                <Tag color={selectedRestaurant.status === 'ACTIVE' ? 'green' : 'red'}>
                                    {selectedRestaurant.status}
                                </Tag>
                            </Descriptions.Item>
                        </Descriptions>
                        {selectedRestaurant.latitude && (
                            <div style={{ marginTop: 15, textAlign: 'right' }}>
                                <Button
                                    type="link"
                                    icon={<EnvironmentOutlined />}
                                    onClick={() => window.open(`https://www.google.com/maps?q=${selectedRestaurant.latitude},${selectedRestaurant.longitude}`, '_blank')}
                                >
                                    Xem vị trí trên bản đồ
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default RestaurantsPage;