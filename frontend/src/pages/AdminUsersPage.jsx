import React, { useEffect, useMemo, useState } from 'react';
import {
    Card,
    Table,
    Tag,
    Button,
    Space,
    message,
    Input,
    Select,
    Tabs,
    Avatar,
    Modal,
    Descriptions,
    Spin,
    Divider,
    List,
    Typography,
    Badge,
} from 'antd';
import {
    LockOutlined,
    UnlockOutlined,
    EyeOutlined,
    ShopOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import {
    getAdminCustomers,
    getAdminOwners,
    getAdminShippers,
    deactivateAccount,
    activateAccount,
    getAdminUserDetail,
} from '../services/adminService';
import ConfirmModal from '../components/ConfirmModal';
import '../css/AdminUsersPage.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const ROLE_TABS = [
    { key: 'CUSTOMER', label: 'Khách hàng' },
    { key: 'OWNER', label: 'Chủ nhà hàng' },
    { key: 'SHIPPER', label: 'Người giao hàng' },
];

const STATUS_FILTER = {
    ALL: 'ALL',
    ACTIVE: 'ACTIVE',
    INACTIVE: 'INACTIVE',
};

const AdminUsersPage = () => {
    // 3 list riêng: khách hàng / chủ nhà hàng / shipper
    const [customersRaw, setCustomersRaw] = useState([]);
    const [ownersRaw, setOwnersRaw] = useState([]);
    const [shippersRaw, setShippersRaw] = useState([]);
    const [loading, setLoading] = useState(false);

    // Tab và filter/search
    const [activeRole, setActiveRole] = useState('CUSTOMER');
    const [searchCustomer, setSearchCustomer] = useState('');
    const [searchOwner, setSearchOwner] = useState('');
    const [searchShipper, setSearchShipper] = useState('');
    const [statusFilter, setStatusFilter] = useState(STATUS_FILTER.ALL);

    // ConfirmModal (khóa / mở)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState(null); // 'deactivate' | 'activate'
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Modal xem chi tiết
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [detailAccount, setDetailAccount] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // ============ DEDUPE HELPERS ============
    const dedupeOwnersByAccountId = (list = []) => {
        const map = new Map();

        for (const item of list) {
            const id = item?.accountId;
            if (id == null) continue;

            const prev = map.get(id);

            if (!prev) {
                map.set(id, { ...item });
                continue;
            }

            // merge an toàn: ưu tiên field nào có giá trị
            map.set(id, {
                ...prev,
                ...item,
                ownerFullName: prev.ownerFullName || item.ownerFullName,
                username: prev.username || item.username,
                email: prev.email || item.email,
                phone: prev.phone || item.phone,
                // isActive nên ưu tiên từ account (thường giống nhau), nhưng giữ prev nếu item null
                isActive: (typeof item.isActive === 'boolean') ? item.isActive : prev.isActive,
            });
        }

        // sort ổn định theo ID tăng dần
        return Array.from(map.values()).sort((a, b) => (Number(a.accountId) || 0) - (Number(b.accountId) || 0));
    };

    // ============ LOAD DATA TỪ BACKEND ============
    const fetchAll = async () => {
        setLoading(true);
        try {
            const [cus, own, ship] = await Promise.all([
                getAdminCustomers(),
                getAdminOwners(),
                getAdminShippers(),
            ]);
            setCustomersRaw(cus || []);
            setOwnersRaw(dedupeOwnersByAccountId(own || []));
            setShippersRaw(ship || []);
        } catch (err) {
            console.error(err);
            message.error('Không tải được danh sách người dùng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    // ============ SORT HELPERS ============
    const compareText = (a, b) =>
        (a || '').toString().localeCompare((b || '').toString(), 'vi', { sensitivity: 'base' });
    const compareNumber = (a, b) => (Number(a) || 0) - (Number(b) || 0);

    // ============ FILTER & SEARCH ============

    const normalize = (v) => (v || '').toString().toLowerCase();

    const filterByStatus = (list) => {
        if (statusFilter === STATUS_FILTER.ALL) return list;
        if (statusFilter === STATUS_FILTER.ACTIVE) {
            return list.filter((acc) => acc.isActive === true);
        }
        if (statusFilter === STATUS_FILTER.INACTIVE) {
            return list.filter((acc) => acc.isActive === false);
        }
        return list;
    };

    // KHÁCH HÀNG: tìm theo tên / SĐT (KHÔNG email)
    const filterCustomers = (list, keyword) => {
        const q = normalize(keyword);
        if (!q) return filterByStatus(list);

        return filterByStatus(list).filter((item) => {
            const name = normalize(item.fullName || item.username);
            const phone = normalize(item.phone);
            return name.includes(q) || phone.includes(q);
        });
    };

    // SHIPPER: tên / SĐT / biển số (KHÔNG email)
    const filterShippers = (list, keyword) => {
        const q = normalize(keyword);
        if (!q) return filterByStatus(list);

        return filterByStatus(list).filter((item) => {
            const name = normalize(item.fullName || item.username);
            const phone = normalize(item.phone);
            const license = normalize(item.licensePlate);
            return name.includes(q) || phone.includes(q) || license.includes(q);
        });
    };

    // OWNER: chủ quán / SĐT
    const filterOwners = (list, keyword) => {
        const q = normalize(keyword);
        if (!q) return filterByStatus(list);

        return filterByStatus(list).filter((item) => {
            const ownerName = normalize(item.ownerFullName || item.username);
            const phone = normalize(item.phone);
            const username = normalize(item.username);
            return ownerName.includes(q) || phone.includes(q) || username.includes(q);
        });
    };


    const customers = useMemo(
        () => filterCustomers(customersRaw, searchCustomer),
        [customersRaw, searchCustomer, statusFilter],
    );

    const owners = useMemo(
        () => filterOwners(ownersRaw, searchOwner),
        [ownersRaw, searchOwner, statusFilter],
    );

    const shippers = useMemo(
        () => filterShippers(shippersRaw, searchShipper),
        [shippersRaw, searchShipper, statusFilter],
    );

    // ============ MODAL OPENERS ============

    const openDeactivateModal = (record) => {
        setSelectedAccount(record);
        setModalAction('deactivate');
        setIsModalOpen(true);
    };

    const openActivateModal = (record) => {
        setSelectedAccount(record);
        setModalAction('activate');
        setIsModalOpen(true);
    };

    const openDetailModal = async (record) => {
        setIsDetailOpen(true);
        setDetailAccount(null);
        setDetailLoading(true);

        try {
            const data = await getAdminUserDetail(record.accountId);
            setDetailAccount(data);
        } catch (err) {
            console.error(err);
            message.error('Không tải được chi tiết người dùng');
            setIsDetailOpen(false);
        } finally {
            setDetailLoading(false);
        }
    };

    // ============ CONFIRM ACTION (KHÓA / MỞ) ============

    const handleConfirmAction = async () => {
        if (!selectedAccount || !modalAction) return;

        setActionLoading(true);
        try {
            const accountId = selectedAccount.accountId;

            if (modalAction === 'deactivate') {
                await deactivateAccount(accountId);
                message.success(
                    selectedAccount.role?.toUpperCase() === 'OWNER'
                        ? `Đã khóa quán của tài khoản ${selectedAccount.username}`
                        : `Đã vô hiệu hóa tài khoản ${selectedAccount.username}`,
                );

                const update = (list) =>
                    list.map((item) =>
                        item.accountId === accountId ? { ...item, isActive: false } : item,
                    );
                setCustomersRaw((prev) => update(prev));
                setOwnersRaw((prev) => update(prev));
                setShippersRaw((prev) => update(prev));
            } else {
                await activateAccount(accountId);
                message.success(
                    selectedAccount.role?.toUpperCase() === 'OWNER'
                        ? `Đã mở lại quán của tài khoản ${selectedAccount.username}`
                        : `Đã kích hoạt lại tài khoản ${selectedAccount.username}`,
                );

                const update = (list) =>
                    list.map((item) =>
                        item.accountId === accountId ? { ...item, isActive: true } : item,
                    );
                setCustomersRaw((prev) => update(prev));
                setOwnersRaw((prev) => update(prev));
                setShippersRaw((prev) => update(prev));
            }
        } catch (err) {
            console.error(err);
            if (modalAction === 'deactivate') {
                message.error('Không thể vô hiệu hóa tài khoản');
            } else {
                message.error('Không thể kích hoạt lại tài khoản');
            }
        } finally {
            setActionLoading(false);
            setIsModalOpen(false);
            setSelectedAccount(null);
            setModalAction(null);
        }
    };

    // ============ COLUMNS & ACTION BUTTONS ============

    const renderRestaurantStatusTag = (status) => {
        if (!status) return null;

        const map = {
            ACTIVE: { color: 'green', label: 'Đang hoạt động' },
            PENDING: { color: 'gold', label: 'Chờ duyệt' },
            BLOCKED: { color: 'red', label: 'Bị khóa' },
            REJECTED: { color: 'volcano', label: 'Bị từ chối' },
        };

        const s = map[status] || { color: 'default', label: status };
        return <Tag color={s.color}>{s.label}</Tag>;
    };

    const renderShipperWorkStatusTag = (status) => {
        const s = String(status || '').toUpperCase();
        const map = {
            OFFLINE: { color: 'default', label: 'Offline' },
            ONLINE: { color: 'green', label: 'Online' },
            BUSY: { color: 'gold', label: 'Đang giao' },
        };
        const meta = map[s] || { color: 'default', label: status || '—' };
        return <Tag color={meta.color}>{meta.label}</Tag>;
    };

    const renderStatusTag = (isActive) =>
        isActive ? <Tag color="green">Đang hoạt động</Tag> : <Tag color="red">Đã vô hiệu hóa</Tag>;

    const getRestaurantImageSrc = (value) => {
        if (!value) return null;

        if (value.startsWith('/images/')) return 'http://localhost:8080' + value;

        if (value.startsWith('http://') || value.startsWith('https://')) {
            return value;
        }
        return null;
    };

    const viewOnlyButtons = (record) => (
        <Space size="small">
            <Button icon={<EyeOutlined />} size="small" onClick={() => openDetailModal(record)}>
                Xem
            </Button>
        </Space>
    );

    const lockableButtons = (record) => (
        <Space size="small">
            <Button icon={<EyeOutlined />} size="small" onClick={() => openDetailModal(record)}>
                Xem
            </Button>

            {record.isActive ? (
                <Button danger icon={<LockOutlined />} size="small" onClick={() => openDeactivateModal(record)}>
                    Khóa
                </Button>
            ) : (
                <Button type="primary" icon={<UnlockOutlined />} size="small" onClick={() => openActivateModal(record)}>
                    Mở khóa
                </Button>
            )}
        </Space>
    );

    const customerColumns = [
        {
            title: 'ID',
            dataIndex: 'accountId',
            key: 'accountId',
            width: 90,
            sorter: (a, b) => compareNumber(a.accountId, b.accountId),
            sortDirections: ['ascend', 'descend'],
            defaultSortOrder: 'ascend',
        },
        {
            title: 'Họ tên',
            key: 'fullName',
            sorter: (a, b) => compareText(a.fullName || a.username, b.fullName || b.username),
            sortDirections: ['ascend', 'descend'],
            render: (record) => record.fullName || record.username,
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'SĐT',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            key: 'isActive',
            render: renderStatusTag,
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 180,
            render: (_, record) => lockableButtons(record),
        },
    ];

    // SHIPPER: không hiển thị nút Khóa/Mở (đã có màn khác quản lý)
    const shipperColumns = [
        {
            title: 'ID',
            dataIndex: 'accountId',
            key: 'accountId',
            width: 90,
            sorter: (a, b) => compareNumber(a.accountId, b.accountId),
            sortDirections: ['ascend', 'descend'],
            defaultSortOrder: 'ascend',
        },
        {
            title: 'Họ tên',
            key: 'fullName',
            sorter: (a, b) => compareText(a.fullName || a.username, b.fullName || b.username),
            sortDirections: ['ascend', 'descend'],
            render: (record) => record.fullName || record.username,
        },
        { title: 'SĐT', dataIndex: 'phone', key: 'phone' },
        { title: 'Biển số', dataIndex: 'licensePlate', key: 'licensePlate', responsive: ['md'] },
        { title: 'Loại xe', dataIndex: 'vehicleType', key: 'vehicleType', responsive: ['lg'] },
        { title: 'Trạng thái shipper', dataIndex: 'status', key: 'shipperWorkStatus', render: renderShipperWorkStatusTag, responsive: ['lg'] },
        { title: 'Tài khoản', dataIndex: 'isActive', key: 'isActive', render: renderStatusTag },
        { title: 'Thao tác', key: 'action', width: 110, render: (_, record) => viewOnlyButtons(record) },
    ];

    const ownerColumns = [
        {
            title: 'ID',
            dataIndex: 'accountId',
            key: 'accountId',
            width: 90,
            sorter: (a, b) => compareNumber(a.accountId, b.accountId),
            sortDirections: ['ascend', 'descend'],
            defaultSortOrder: 'ascend',
        },
        {
            title: 'Chủ quán',
            key: 'ownerName',
            sorter: (a, b) => compareText(a.ownerFullName || a.username, b.ownerFullName || b.username),
            sortDirections: ['ascend', 'descend'],
            render: (record) => record.ownerFullName || record.username,
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            responsive: ['lg'],
        },
        {
            title: 'SĐT',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            key: 'isActive',
            render: renderStatusTag,
        },
        {
            title: 'Thao tác',
            key: 'action',
            width: 180,
            render: (_, record) => lockableButtons(record),
        },
    ];

    // ============ SEARCH BOX PHỤ THUỘC TAB ============

    const renderSearchBox = () => {
        if (activeRole === 'CUSTOMER') {
            return (
                <Search
                    size="large"
                    allowClear
                    placeholder="Tìm khách hàng theo tên / SĐT"
                    className="admin-users-search-input"
                    value={searchCustomer}
                    onChange={(e) => setSearchCustomer(e.target.value)}
                    onSearch={setSearchCustomer}
                />
            );
        }
        if (activeRole === 'OWNER') {
            return (
                <Search
                    size="large"
                    allowClear
                    placeholder="Tìm chủ nhà hàng theo tên / SĐT"
                    className="admin-users-search-input"
                    value={searchOwner}
                    onChange={(e) => setSearchOwner(e.target.value)}
                    onSearch={setSearchOwner}
                />
            );
        }
        return (
            <Search
                size="large"
                allowClear
                placeholder="Tìm shipper theo tên / SĐT / biển số"
                className="admin-users-search-input"
                value={searchShipper}
                onChange={(e) => setSearchShipper(e.target.value)}
                onSearch={setSearchShipper}
            />
        );
    };

    const getDataSourceForActiveTab = () => {
        if (activeRole === 'CUSTOMER') return customers;
        if (activeRole === 'OWNER') return owners;
        return shippers;
    };

    const getColumnsForActiveTab = () => {
        if (activeRole === 'OWNER') return ownerColumns;
        if (activeRole === 'SHIPPER') return shipperColumns;
        return customerColumns;
    };

    const modalTitle =
        modalAction === 'deactivate'
            ? selectedAccount?.role?.toUpperCase() === 'OWNER'
                ? 'Xác nhận khóa quán'
                : 'Xác nhận vô hiệu hóa tài khoản'
            : modalAction === 'activate'
                ? selectedAccount?.role?.toUpperCase() === 'OWNER'
                    ? 'Xác nhận mở lại quán'
                    : 'Xác nhận kích hoạt lại tài khoản'
                : 'Xác nhận';

    const modalMessage =
        modalAction === 'deactivate'
            ? selectedAccount?.role?.toUpperCase() === 'OWNER'
                ? `Bạn có chắc chắn muốn khóa quán của tài khoản "${selectedAccount?.username}" không?`
                : `Bạn có chắc chắn muốn vô hiệu hóa tài khoản "${selectedAccount?.username}" không?`
            : modalAction === 'activate'
                ? selectedAccount?.role?.toUpperCase() === 'OWNER'
                    ? `Bạn có chắc chắn muốn mở lại quán của tài khoản "${selectedAccount?.username}" không?`
                    : `Bạn có chắc chắn muốn kích hoạt lại tài khoản "${selectedAccount?.username}" không?`
                : 'Bạn có chắc chắn muốn thực hiện hành động này?';

    // ============ RENDER CHI TIẾT TÀI KHOẢN ============

    const renderDetailContent = () => {
        if (detailLoading) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                    <Spin />
                </div>
            );
        }

        if (!detailAccount) return null;

        // Sort restaurants trong modal theo status rồi theo tên
        const statusOrder = { PENDING: 1, ACTIVE: 2, BLOCKED: 3, REJECTED: 4 };

        const restaurantsSorted = [...(detailAccount.restaurants || [])].sort((a, b) => {
            const sa = String(a.status || '').toUpperCase();
            const sb = String(b.status || '').toUpperCase();
            const oa = statusOrder[sa] || 99;
            const ob = statusOrder[sb] || 99;
            if (oa !== ob) return oa - ob;

            // cùng status thì sort theo tên A-Z
            return (a.name || '').localeCompare((b.name || ''), 'vi', { sensitivity: 'base' });
        });

        const roleCode = detailAccount.role?.toUpperCase();
        const isCustomer = roleCode === 'CUSTOMER';
        const isShipper = roleCode === 'SHIPPER';
        const isOwner = roleCode === 'OWNER';

        const roleLabelMap = {
            CUSTOMER: 'Khách hàng',
            OWNER: 'Chủ nhà hàng',
            SHIPPER: 'Người giao hàng',
        };
        const roleLabel = roleLabelMap[roleCode] || roleCode || 'Không xác định';

        const commonBlock = (
            <Descriptions column={1} size="small" bordered labelStyle={{ width: 150 }}>
                <Descriptions.Item label="ID tài khoản">{detailAccount.accountId}</Descriptions.Item>
                <Descriptions.Item label="Tên đăng nhập">{detailAccount.username}</Descriptions.Item>
                <Descriptions.Item label="Vai trò">{roleLabel}</Descriptions.Item>
                {detailAccount.email && <Descriptions.Item label="Email">{detailAccount.email}</Descriptions.Item>}
                {detailAccount.phone && <Descriptions.Item label="SĐT">{detailAccount.phone}</Descriptions.Item>}
                <Descriptions.Item label="Trạng thái">{renderStatusTag(detailAccount.isActive)}</Descriptions.Item>
            </Descriptions>
        );

        const customerBlock = (
            <>
                <Divider style={{ margin: '12px 0' }} />
                <Descriptions column={1} size="small" bordered labelStyle={{ width: 150 }}>
                    {detailAccount.customerFullName && (
                        <Descriptions.Item label="Họ tên">{detailAccount.customerFullName}</Descriptions.Item>
                    )}
                    {detailAccount.customerAddress && (
                        <Descriptions.Item label="Địa chỉ">{detailAccount.customerAddress}</Descriptions.Item>
                    )}
                    {(detailAccount.customerLatitude != null || detailAccount.customerLongitude != null) && (
                        <Descriptions.Item label="Tọa độ">
                            <Text>
                                {detailAccount.customerLatitude ?? '--'} , {detailAccount.customerLongitude ?? '--'}
                            </Text>
                        </Descriptions.Item>
                    )}
                </Descriptions>
            </>
        );

        const shipperBlock = (
            <>
                <Divider style={{ margin: '12px 0' }} />
                <Descriptions column={1} size="small" bordered labelStyle={{ width: 150 }}>
                    {detailAccount.shipperFullName && (
                        <Descriptions.Item label="Họ tên">{detailAccount.shipperFullName}</Descriptions.Item>
                    )}
                    {detailAccount.shipperLicensePlate && (
                        <Descriptions.Item label="Biển số xe">{detailAccount.shipperLicensePlate}</Descriptions.Item>
                    )}
                    {detailAccount.shipperVehicleType && (
                        <Descriptions.Item label="Loại xe">{detailAccount.shipperVehicleType}</Descriptions.Item>
                    )}
                    {detailAccount.shipperStatus && (
                        <Descriptions.Item label="Trạng thái shipper">{detailAccount.shipperStatus}</Descriptions.Item>
                    )}
                    {(detailAccount.shipperCurrentLat != null || detailAccount.shipperCurrentLong != null) && (
                        <Descriptions.Item label="Vị trí hiện tại">
                            <Text>
                                {detailAccount.shipperCurrentLat ?? '--'} , {detailAccount.shipperCurrentLong ?? '--'}
                            </Text>
                        </Descriptions.Item>
                    )}
                </Descriptions>
            </>
        );

        const ownerBlock = (
            <>
                <Divider style={{ margin: '12px 0' }} />
                <Descriptions column={1} size="small" bordered labelStyle={{ width: 150 }}>
                    {detailAccount.ownerFullName && (
                        <Descriptions.Item label="Chủ quán">{detailAccount.ownerFullName}</Descriptions.Item>
                    )}
                    {detailAccount.ownerIdCardNumber && (
                        <Descriptions.Item label="CMND/CCCD">{detailAccount.ownerIdCardNumber}</Descriptions.Item>
                    )}
                </Descriptions>

                <Divider style={{ margin: '12px 0' }} />
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Danh sách nhà hàng</div>

                <List
                    bordered
                    locale={{ emptyText: 'Chưa có nhà hàng' }}
                    dataSource={restaurantsSorted}
                    renderItem={(r) => {
                        const imgSrc = getRestaurantImageSrc(r.coverImage);
                        return (
                            <List.Item>
                                <List.Item.Meta
                                    avatar={
                                        <Avatar
                                            shape="square"
                                            size={56}
                                            src={imgSrc || undefined}
                                            icon={!imgSrc && <ShopOutlined style={{ fontSize: 24 }} />}
                                        />
                                    }
                                    title={
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <span>{r.name || `Nhà hàng #${r.id}`}</span>
                                            {renderRestaurantStatusTag(r.status)}
                                        </div>
                                    }
                                    description={
                                        <div>
                                            {r.address && <div>{r.address}</div>}
                                            {r.phone && <div>SĐT: {r.phone}</div>}
                                        </div>
                                    }
                                />
                            </List.Item>
                        );
                    }}
                />
            </>
        );

        return (
            <div>
                {commonBlock}
                {isCustomer && customerBlock}
                {isShipper && shipperBlock}
                {isOwner && ownerBlock}
            </div>
        );
    };

    // ============ RENDER ============

    return (
        <div className="admin-users-page">
            <Card className="admin-users-card">
                <div className="admin-users-header">
                    <div>
                        <Title level={4} className="admin-users-title">
                            Quản lý tài khoản người dùng
                        </Title>
                        <div className="admin-users-subtitle">
                            Sắp xếp theo từng cột (ID, A→Z, Z→A) bằng icon mũi tên trên tiêu đề.
                        </div>
                    </div>

                    <Space>
                        <Button icon={<ReloadOutlined />} onClick={fetchAll} loading={loading}>
                            Tải lại
                        </Button>
                    </Space>
                </div>

                <Tabs
                    className="admin-users-tabs"
                    activeKey={activeRole}
                    onChange={setActiveRole}
                    items={ROLE_TABS.map((tab) => {
                        const count =
                            tab.key === 'CUSTOMER'
                                ? customers.length
                                : tab.key === 'OWNER'
                                    ? owners.length
                                    : shippers.length;
                        return {
                            key: tab.key,
                            label: (
                                <span className="admin-users-tab-label">
                                    {tab.label} <Badge count={count} overflowCount={999} />
                                </span>
                            ),
                        };
                    })}
                />

                <div className="admin-users-filters">
                    <div className="admin-users-search-wrapper">{renderSearchBox()}</div>

                    <div className="admin-users-status-filter">
                        <span className="admin-users-status-label">Trạng thái:</span>
                        <Select
                            size="large"
                            value={statusFilter}
                            onChange={setStatusFilter}
                            className="admin-users-status-select"
                        >
                            <Option value={STATUS_FILTER.ALL}>Tất cả</Option>
                            <Option value={STATUS_FILTER.ACTIVE}>Đang hoạt động</Option>
                            <Option value={STATUS_FILTER.INACTIVE}>Đã vô hiệu hóa</Option>
                        </Select>
                    </div>
                </div>

                <Table
                    className="admin-users-table"
                    rowKey="accountId"
                    columns={getColumnsForActiveTab()}
                    dataSource={getDataSourceForActiveTab()}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                />
            </Card>

            <ConfirmModal
                isOpen={isModalOpen}
                onClose={() => {
                    if (actionLoading) return;
                    setIsModalOpen(false);
                    setSelectedAccount(null);
                    setModalAction(null);
                }}
                onConfirm={handleConfirmAction}
                title={modalTitle}
                message={modalMessage}
                isLoading={actionLoading}
            />

            <Modal
                open={isDetailOpen}
                destroyOnClose
                onCancel={() => {
                    if (detailLoading) return;
                    setIsDetailOpen(false);
                    setDetailAccount(null);
                }}
                footer={
                    <Button
                        onClick={() => {
                            if (detailLoading) return;
                            setIsDetailOpen(false);
                            setDetailAccount(null);
                        }}
                    >
                        Đóng
                    </Button>
                }
                title={(() => {
                    if (detailLoading) return 'Đang tải chi tiết...';
                    const role = detailAccount?.role?.toUpperCase();
                    const roleLabel =
                        role === 'CUSTOMER'
                            ? 'Khách hàng'
                            : role === 'SHIPPER'
                                ? 'Người giao hàng'
                                : role === 'OWNER'
                                    ? 'Chủ nhà hàng'
                                    : 'Người dùng';
                    const name = detailAccount?.username ? ` - ${detailAccount.username}` : '';
                    return `Chi tiết ${roleLabel}${name}`;
                })()}
                className="admin-user-detail-modal"
                width={detailAccount?.role?.toUpperCase() === 'OWNER' ? 760 : 580}
            >
                {renderDetailContent()}
            </Modal>
        </div>
    );
};

export default AdminUsersPage;