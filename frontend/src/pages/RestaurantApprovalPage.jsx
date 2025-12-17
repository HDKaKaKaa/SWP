import React, { useState, useEffect } from 'react';
import {
    Table, Button, Card, Tag, Space, Modal, Image, message, Popconfirm, Descriptions, Divider, Row, Col, Typography, DatePicker, Input
} from 'antd';
import {
    EyeOutlined,
    ReloadOutlined,
    UserOutlined,
    ShopOutlined,
    EnvironmentOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    FileProtectOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import axios from 'axios';

import '../css/RestaurantApprovalPage.css';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
const { TextArea } = Input; // <--- Import TextArea

const API_URL = 'http://localhost:8080/api/admin/restaurants';

const RestaurantApprovalPage = () => {
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState([]);
    const [keyword, setKeyword] = useState('');

    // Modal xem chi tiết
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);

    // --- STATE CHO MODAL TỪ CHỐI ---
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectLoading, setRejectLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async (dates = dateRange, searchKey = keyword) => {
        setLoading(true);
        try {
            const params = {};
            if (dates && dates.length === 2) {
                params.startDate = dates[0].format('YYYY-MM-DD');
                params.endDate = dates[1].format('YYYY-MM-DD');
            }
            if (searchKey) {
                params.keyword = searchKey;
            }
            const response = await axios.get(`${API_URL}/pending`, { params });
            setRestaurants(response.data);
        } catch (error) {
            message.error('Không thể tải danh sách nhà hàng chờ duyệt');
        } finally {
            setLoading(false);
        }
    };

    const handleRangeChange = (dates) => {
        setDateRange(dates);
        fetchData(dates, keyword);
    };

    const handleSearch = (value) => {
        setKeyword(value);
        fetchData(dateRange, value);
    };

    // --- LOGIC DUYỆT / TỪ CHỐI ---

    // 1. Hàm xử lý Duyệt (Approve)
    const handleApprove = async () => {
        if (!selectedRestaurant) return;
        try {
            await axios.put(`${API_URL}/${selectedRestaurant.id}/approve`, null, {
                params: { isApproved: true }
            });
            message.success('Đã duyệt hồ sơ thành công!');
            setIsModalOpen(false); // Đóng modal chi tiết
            fetchData();
        } catch (error) {
            message.error(error.response?.data || 'Có lỗi xảy ra!');
        }
    };

    // 2. Mở Modal Từ chối
    const openRejectModal = () => {
        setRejectionReason(''); // Reset lý do
        setIsRejectModalOpen(true);
    };

    // 3. Hàm xử lý Từ chối (Submit Reject)
    const handleRejectSubmit = async () => {
        if (!rejectionReason.trim()) {
            message.error('Vui lòng nhập lý do từ chối!');
            return;
        }

        setRejectLoading(true);
        try {
            await axios.put(`${API_URL}/${selectedRestaurant.id}/approve`, null, {
                params: {
                    isApproved: false,
                    reason: rejectionReason // Gửi lý do lên server
                }
            });
            message.success('Đã từ chối hồ sơ!');
            setIsRejectModalOpen(false); // Đóng modal từ chối
            setIsModalOpen(false);       // Đóng modal chi tiết
            fetchData();
        } catch (error) {
            message.error(error.response?.data || 'Có lỗi xảy ra!');
        } finally {
            setRejectLoading(false);
        }
    };

    const showApplication = (record) => {
        setSelectedRestaurant(record);
        setIsModalOpen(true);
    };

    const openGoogleMaps = (lat, lng) => {
        if (lat && lng) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
        } else {
            message.warning('Tọa độ không khả dụng');
        }
    };

    const columns = [
        {
            title: 'Mã hồ sơ',
            dataIndex: 'id',
            width: 80,
            align: 'center',
            render: (id) => <Text type="secondary">#{id}</Text>
        },
        {
            title: 'Tên nhà hàng',
            dataIndex: 'name',
            render: (text, record) => (
                <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
                    <Image
                        src={record.image}
                        width={45} height={45}
                        className="table-thumb-img"
                        fallback="https://via.placeholder.com/45"
                        preview={false}
                    />
                    <span className="table-restaurant-name">{text}</span>
                </div>
            )
        },
        {
            title: 'Chủ sở hữu',
            dataIndex: 'ownerName',
            render: (text) => <span><UserOutlined style={{marginRight: 6}} />{text}</span>
        },
        {
            title: 'Ngày nộp đơn',
            dataIndex: 'createdAt',
            align: 'center',
            sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        },
        {
            title: 'Trạng thái',
            align: 'center',
            render: () => <Tag color="orange" icon={<ReloadOutlined spin />}>CHỜ DUYỆT</Tag>
        },
        {
            title: 'Hành động',
            align: 'center',
            render: (_, record) => (
                <Button
                    className="btn-view-detail"
                    icon={<FileTextOutlined />}
                    onClick={() => showApplication(record)}
                >
                    Xem đơn
                </Button>
            ),
        },
    ];

    return (
        <div className="restaurant-approval-page">
            <Card
                title={<Title level={4} style={{margin:0}}>📬 Duyệt Đăng Ký Nhà Hàng</Title>}
                className="approval-card"
                bodyStyle={{ padding: '0 24px 24px' }}
                extra={<Button icon={<ReloadOutlined />} onClick={() => fetchData()}>Làm mới</Button>}
            >
                <div style={{ display: 'flex', gap: 16, marginBottom: 24, marginTop: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 250 }}>
                        <Input.Search
                            placeholder="Tìm kiếm theo tên nhà hàng..."
                            onSearch={handleSearch}
                            onChange={(e) => { if(e.target.value === '') handleSearch('') }}
                            enterButton
                            allowClear
                            size="large"
                        />
                    </div>
                    <div>
                        <RangePicker
                            placeholder={['Từ ngày', 'Đến ngày']}
                            value={dateRange}
                            onChange={handleRangeChange}
                            format="DD/MM/YYYY"
                            size="large"
                            style={{ width: 280 }}
                        />
                    </div>
                </div>

                <Table
                    rowKey="id"
                    dataSource={restaurants}
                    columns={columns}
                    loading={loading}
                    pagination={{ pageSize: 8 }}
                    locale={{ emptyText: 'Không có đơn đăng ký nào cần duyệt' }}
                />
            </Card>

            {/* --- MODAL HIỂN THỊ ĐƠN ĐĂNG KÝ (CHI TIẾT) --- */}
            <Modal
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                width={850}
                centered
                title={
                    <div className="modal-header-wrapper">
                        <FileTextOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                        <div>
                            <div style={{ fontSize: 18, fontWeight: '700' }}>Đơn đăng ký đối tác</div>
                            <div style={{ fontSize: 12, fontWeight: 'normal', color: '#888' }}>
                                Mã hồ sơ: #{selectedRestaurant?.id} • Gửi ngày: {selectedRestaurant?.createdAt}
                            </div>
                        </div>
                    </div>
                }
                footer={[
                    <Button key="cancel" onClick={() => setIsModalOpen(false)} size="large">Đóng</Button>,

                    // NÚT TỪ CHỐI -> Mở Modal nhập lý do
                    <Button key="reject" danger size="large" icon={<CloseCircleOutlined />} onClick={openRejectModal}>
                        Từ chối
                    </Button>,

                    // NÚT DUYỆT -> Popconfirm Yes/No
                    <Popconfirm
                        title="Duyệt hồ sơ này?"
                        description="Nhà hàng sẽ được kích hoạt ngay lập tức."
                        onConfirm={handleApprove}
                        okText="Duyệt ngay" cancelText="Hủy"
                    >
                        <Button key="approve" type="primary" size="large" icon={<CheckCircleOutlined />} style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}>
                            Duyệt hồ sơ
                        </Button>
                    </Popconfirm>
                ]}
            >
                {selectedRestaurant && (
                    <div style={{ padding: '10px 5px' }}>
                        {/* 1. Hình ảnh Cover */}
                        <div className="modal-cover-container">
                            <Image
                                src={selectedRestaurant.image}
                                width="100%" height="100%"
                                style={{ objectFit: 'cover' }}
                                fallback="https://via.placeholder.com/800x200?text=No+Cover+Image"
                            />
                            <div className="cover-badge">Ảnh đại diện quán</div>
                        </div>

                        <Row gutter={24}>
                            <Col span={12}>
                                <Card type="inner" title={<Space><UserOutlined /> Thông tin Chủ sở hữu</Space>} size="small" className="info-card">
                                    <Descriptions column={1} layout="vertical" size="small">
                                        <Descriptions.Item label={<span className="label-secondary">Họ và tên</span>}>
                                            <span className="text-value-bold">{selectedRestaurant.ownerName}</span>
                                        </Descriptions.Item>
                                        <Descriptions.Item label={<span className="label-secondary">Số CCCD / CMND</span>}>
                                            <span className="text-value-bold" style={{letterSpacing: 1}}>{selectedRestaurant.ownerIdCard}</span>
                                        </Descriptions.Item>
                                        <Descriptions.Item label={<span className="label-secondary">Số điện thoại liên hệ</span>}>
                                            <span className="text-value-bold">{selectedRestaurant.phone}</span>
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Card>
                            </Col>

                            <Col span={12}>
                                <Card type="inner" title={<Space><ShopOutlined /> Thông tin Doanh nghiệp</Space>} size="small" className="info-card">
                                    <Descriptions column={1} layout="vertical" size="small">
                                        <Descriptions.Item label={<span className="label-secondary">Tên thương hiệu</span>}>
                                            <span className="text-value-bold" style={{color: '#1677ff'}}>{selectedRestaurant.name}</span>
                                        </Descriptions.Item>
                                        <Descriptions.Item label={<span className="label-secondary">Địa chỉ kinh doanh</span>}>
                                            {selectedRestaurant.address}
                                        </Descriptions.Item>
                                        <Descriptions.Item label={<span className="label-secondary">Vị trí bản đồ</span>}>
                                            {selectedRestaurant.latitude ? (
                                                <Button size="small" type="dashed" icon={<EnvironmentOutlined />} onClick={() => openGoogleMaps(selectedRestaurant.latitude, selectedRestaurant.longitude)}>
                                                    Mở Google Maps
                                                </Button>
                                            ) : <Tag color="default">Chưa cập nhật</Tag>}
                                        </Descriptions.Item>
                                    </Descriptions>
                                </Card>
                            </Col>
                        </Row>

                        <div style={{ marginTop: 20 }}>
                            <Card type="inner" size="small" title={<Space><FileProtectOutlined /> Giấy phép kinh doanh</Space>} className="info-card">
                                {selectedRestaurant.licenseImage ? (
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        {(() => {
                                            let images = [];
                                            try {
                                                if (selectedRestaurant.licenseImage.trim().startsWith('[')) {
                                                    images = JSON.parse(selectedRestaurant.licenseImage);
                                                } else {
                                                    images = [selectedRestaurant.licenseImage];
                                                }
                                            } catch (e) {
                                                images = [selectedRestaurant.licenseImage];
                                            }
                                            return images.map((imgUrl, index) => (
                                                <Image key={index} src={imgUrl} width={150} height={200} style={{ objectFit: 'contain', border: '1px solid #eee', borderRadius: 8, background: '#fff' }} fallback="https://via.placeholder.com/150x200?text=Error" />
                                            ));
                                        })()}
                                    </div>
                                ) : <Tag color="default">Chưa cập nhật giấy phép</Tag>}
                            </Card>
                        </div>

                        <div style={{ marginTop: 20 }}>
                            <Card type="inner" size="small" title="Mô tả / Giới thiệu quán" className="info-card">
                                <Text style={{ fontStyle: 'italic', color: '#555', lineHeight: 1.6 }}>
                                    "{selectedRestaurant.description || 'Không có mô tả chi tiết.'}"
                                </Text>
                            </Card>
                        </div>
                    </div>
                )}
            </Modal>

            {/* --- MODAL NHẬP LÝ DO TỪ CHỐI (MỚI) --- */}
            <Modal
                title={
                    <div style={{color: '#ff4d4f', display: 'flex', alignItems: 'center', gap: 8}}>
                        <CloseCircleOutlined /> Từ chối hồ sơ đăng ký
                    </div>
                }
                open={isRejectModalOpen}
                onCancel={() => setIsRejectModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setIsRejectModalOpen(false)}>Hủy</Button>,
                    <Button key="submit" type="primary" danger loading={rejectLoading} onClick={handleRejectSubmit}>
                        Xác nhận Từ chối
                    </Button>
                ]}
            >
                <div style={{marginBottom: 16}}>
                    <Text strong>Vui lòng nhập lý do từ chối để gửi thông báo cho đối tác:</Text>
                </div>
                <TextArea
                    rows={4}
                    placeholder="Ví dụ: Giấy phép kinh doanh bị mờ, Sai địa chỉ, Ảnh đại diện không hợp lệ..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    maxLength={500}
                    showCount
                />
            </Modal>
        </div>
    );
};

export default RestaurantApprovalPage;