import React, { useState, useEffect } from 'react';
import {
    Table, Button, Card, Tag, Space, Modal, Image, message, Popconfirm, Descriptions, Input, Tooltip, Select
} from 'antd';
import {
    EyeOutlined,
    ReloadOutlined,
    LockOutlined,
    UnlockOutlined,
    EnvironmentOutlined,
    ReadOutlined,
    CoffeeOutlined
} from '@ant-design/icons';
import { getManagedRestaurants, toggleRestaurantStatus, getRestaurantMenu } from '../services/restaurantService';

const { Search } = Input;
const { Option } = Select;

const RestaurantsPage = () => {
    // --- STATE QUẢN LÝ DANH SÁCH NHÀ HÀNG ---
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // --- STATE QUẢN LÝ MODAL CHI TIẾT ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);

    // --- STATE QUẢN LÝ MODAL MENU (MỚI) ---
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [menuList, setMenuList] = useState([]);
    const [menuLoading, setMenuLoading] = useState(false);
    const [currentRestaurantName, setCurrentRestaurantName] = useState('');

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

    const handleSearch = (value) => {
        setKeyword(value);
        fetchData(value, statusFilter);
    };

    const handleStatusChange = (value) => {
        setStatusFilter(value);
        fetchData(keyword, value);
    };

    const handleToggleStatus = async (restaurant) => {
        try {
            await toggleRestaurantStatus(restaurant.id);

            // --- SỬA DÒNG NÀY ---
            // Logic cũ: restaurant.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';

            // Logic mới: Nếu đang BLOCKED -> chuyển thành ACTIVE.
            // Còn lại (ACTIVE hoặc CLOSE) -> đều chuyển thành BLOCKED.
            const newStatus = restaurant.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';

            // Cập nhật thông báo cho đúng ngữ nghĩa
            const actionName = newStatus === 'BLOCKED' ? 'KHÓA' : 'MỞ KHÓA';
            message.success(`Đã ${actionName} nhà hàng thành công!`);

            fetchData(keyword, statusFilter);
        } catch (error) {
            const errorMsg = error.response?.data || 'Có lỗi xảy ra!';
            message.error(errorMsg);
        }
    };

    // --- HÀM MỞ MODAL XEM MENU ---
    const handleViewMenu = async (restaurant) => {
        setCurrentRestaurantName(restaurant.name);
        setIsMenuModalOpen(true);
        setMenuLoading(true);
        try {
            const data = await getRestaurantMenu(restaurant.id);
            setMenuList(data);
        } catch (error) {
            message.error('Không thể tải thực đơn của quán này');
        } finally {
            setMenuLoading(false);
        }
    };

    const showDetail = (record) => {
        setSelectedRestaurant(record);
        setIsModalOpen(true);
    };

    // --- COLUMNS CHO BẢNG MENU ---
    const menuColumns = [
        {
            title: 'Ảnh',
            dataIndex: 'image',
            width: 80,
            align: 'center',
            render: (src) => <Image width={50} height={50} src={src} style={{borderRadius: 4, objectFit: 'cover'}} fallback="https://via.placeholder.com/50" />
        },
        {
            title: 'Tên món',
            dataIndex: 'name',
            render: (text) => <b style={{ fontSize: 15 }}>{text}</b>
        },
        {
            title: 'Danh mục',
            dataIndex: 'categoryName',
            render: (text) => <Tag color="blue">{text}</Tag>
        },
        {
            title: 'Giá gốc',
            dataIndex: 'price',
            render: (price) => <span style={{color: '#d48806', fontWeight: 'bold'}}>{price ? price.toLocaleString() : 0} đ</span>
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            align: 'center',
            render: (status) => <Tag color={status === 'Đang bán' ? 'green' : 'default'}>{status}</Tag>
        }
    ];

    // --- BẢNG PHỤ: CHI TIẾT THUỘC TÍNH (Expandable) ---
    const expandedRowRender = (record) => {
        if (!record.details || record.details.length === 0) {
            return <div style={{color: '#999', paddingLeft: 20}}>Sản phẩm này không có tùy chọn thêm.</div>;
        }

        const detailColumns = [
            {
                title: 'Loại thuộc tính',
                dataIndex: 'attributeName',
                key: 'attributeName',
                render: (text) => <Tag color="geekblue">{text}</Tag>
            },
            {
                title: 'Tùy chọn',
                dataIndex: 'value',
                key: 'value',
                render: (text) => <b>{text}</b>
            },
            {
                title: 'Giá thêm',
                dataIndex: 'priceAdjustment',
                key: 'priceAdjustment',
                render: (price) => price > 0 ? <span style={{color: 'red'}}>+{price.toLocaleString()} đ</span> : <span style={{color: 'green'}}>Miễn phí</span>
            },
        ];

        return (
            <div style={{ margin: '0 20px', background: '#fafafa', padding: 10, borderRadius: 8, border: '1px dashed #d9d9d9' }}>
                <p style={{fontWeight: 'bold', marginBottom: 5, color: '#666'}}>Cấu hình chi tiết:</p>
                <Table
                    columns={detailColumns}
                    dataSource={record.details}
                    pagination={false}
                    size="small"
                    rowKey="id"
                />
            </div>
        );
    };

    // --- COLUMNS CHÍNH (QUÁN ĂN) ---
    const columns = [
        {
            title: 'Hình ảnh',
            dataIndex: 'image',
            align: 'center',
            render: (src) => (
                <Image width={50} src={src} style={{ borderRadius: 4 }} fallback="https://via.placeholder.com/50"/>
            )
        },
        {
            title: 'Tên nhà hàng',
            dataIndex: 'name',
            render: (text) => <b style={{ color: '#1677ff' }}>{text}</b>
        },
        {
            title: 'Chủ nhà hàng',
            dataIndex: 'ownerName',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            align: 'center',
            render: (status) => {
                let color = 'default';
                if (status === 'ACTIVE') color = 'green';       // Đang hoạt động
                else if (status === 'BLOCKED') color = 'red';   // Bị khóa
                else if (status === 'CLOSE') color = 'orange';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        {
            title: 'Hành động',
            align: 'center',
            render: (_, record) => (
                <Space>
                    {/* --- NÚT XEM MENU --- */}
                    <Tooltip title="Xem thực đơn">
                        <Button
                            icon={<ReadOutlined />}
                            onClick={() => handleViewMenu(record)}
                            style={{ color: '#722ed1', borderColor: '#722ed1' }}
                        />
                    </Tooltip>

                    <Tooltip title="Xem chi tiết quán">
                        <Button icon={<EyeOutlined />} onClick={() => showDetail(record)} />
                    </Tooltip>

                    <Popconfirm
                        // Sửa tiêu đề: Nếu đang BLOCKED thì hỏi Mở, ngược lại (ACTIVE/CLOSE) thì hỏi Khóa
                        title={record.status === 'BLOCKED' ? "Mở khóa nhà hàng?" : "Khóa nhà hàng này?"}
                        description={record.status === 'ACTIVE' || record.status === 'CLOSE'
                            ? "Nhà hàng sẽ bị vô hiệu hóa và không thể truy cập."
                            : "Nhà hàng sẽ được hoạt động trở lại."}
                        onConfirm={() => handleToggleStatus(record)}

                        // Sửa text nút OK
                        okText={record.status === 'BLOCKED' ? "Mở khóa" : "Khóa ngay"}
                        cancelText="Hủy"
                        // Chỉ hiện màu đỏ (danger) khi hành động là Khóa (tức là status hiện tại KHÔNG PHẢI BLOCKED)
                        okButtonProps={{ danger: record.status !== 'BLOCKED' }}
                    >
                        <Button
                            // Nếu đang BLOCKED thì nút Primary (Xanh), còn lại là Default hoặc Danger
                            type={record.status === 'BLOCKED' ? 'primary' : 'default'}
                            danger={record.status !== 'BLOCKED'} // Đỏ nếu đang ACTIVE hoặc CLOSE
                            icon={record.status === 'BLOCKED' ? <UnlockOutlined /> : <LockOutlined />}
                        >
                            {record.status === 'BLOCKED' ? 'Mở' : 'Khóa'}
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
                        <Select
                            defaultValue="ALL"
                            value={statusFilter}
                            style={{ width: 160 }}
                            onChange={handleStatusChange}
                        >
                            <Option value="ALL">Tất cả trạng thái</Option>
                            <Option value="ACTIVE">Đang hoạt động</Option>
                            <Option value="BLOCKED">Đã khóa</Option>
                            <Option value="CLOSE">Đóng cửa</Option>
                        </Select>

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

            {/* --- MODAL 1: CHI TIẾT NHÀ HÀNG --- */}
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

            {/* --- MODAL 2: CHI TIẾT MENU (THỰC ĐƠN) --- */}
            <Modal
                title={<span><CoffeeOutlined /> Thực đơn của quán: <b style={{color: '#1677ff'}}>{currentRestaurantName}</b></span>}
                open={isMenuModalOpen}
                onCancel={() => setIsMenuModalOpen(false)}
                footer={[<Button key="close" onClick={() => setIsMenuModalOpen(false)}>Đóng</Button>]}
                width={900}
                bodyStyle={{ maxHeight: '600px', overflowY: 'auto' }}
            >
                <Table
                    columns={menuColumns}
                    dataSource={menuList}
                    loading={menuLoading}
                    rowKey="id"
                    pagination={{ pageSize: 6 }}
                    // Cấu hình Expandable Row cho bảng Menu
                    expandable={{
                        expandedRowRender: expandedRowRender,
                        rowExpandable: (record) => record.details && record.details.length > 0,
                    }}
                    locale={{ emptyText: 'Quán này chưa đăng sản phẩm nào' }}
                />
            </Modal>
        </div>
    );
};

export default RestaurantsPage;