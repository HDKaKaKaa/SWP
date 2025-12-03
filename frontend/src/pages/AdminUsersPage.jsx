import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, message } from 'antd';
import { LockOutlined, UnlockOutlined } from '@ant-design/icons';
import {
    getAllAccounts,
    deactivateAccount,
    activateAccount,
} from '../services/adminService';
import ConfirmModal from '../components/ConfirmModal';

const AdminUsersPage = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);

    // State cho ConfirmModal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalAction, setModalAction] = useState(null); // 'deactivate' | 'activate'
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const data = await getAllAccounts();
            setAccounts(data);
        } catch (err) {
            console.error(err);
            message.error('Không tải được danh sách tài khoản');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    // Mở modal xác nhận khóa
    const openDeactivateModal = (record) => {
        setSelectedAccount(record);
        setModalAction('deactivate');
        setIsModalOpen(true);
    };

    // Mở modal xác nhận mở khóa
    const openActivateModal = (record) => {
        setSelectedAccount(record);
        setModalAction('activate');
        setIsModalOpen(true);
    };

    const handleConfirmAction = async () => {
        if (!selectedAccount || !modalAction) return;

        setActionLoading(true);
        try {
            if (modalAction === 'deactivate') {
                await deactivateAccount(selectedAccount.id);
                message.success(`Đã vô hiệu hóa tài khoản ${selectedAccount.username}`);
                setAccounts((prev) =>
                    prev.map((acc) =>
                        acc.id === selectedAccount.id ? { ...acc, isActive: false } : acc
                    )
                );
            } else if (modalAction === 'activate') {
                await activateAccount(selectedAccount.id);
                message.success(`Đã kích hoạt lại tài khoản ${selectedAccount.username}`);
                setAccounts((prev) =>
                    prev.map((acc) =>
                        acc.id === selectedAccount.id ? { ...acc, isActive: true } : acc
                    )
                );
            }
        } catch (err) {
            console.error(err);
            if (modalAction === 'deactivate') {
                message.error('Không thể vô hiệu hóa tài khoản');
            } else {
                message.error('Không thể kích hoạt tài khoản');
            }
        } finally {
            setActionLoading(false);
            setIsModalOpen(false);
            setSelectedAccount(null);
            setModalAction(null);
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 70,
        },
        {
            title: 'Tên đăng nhập',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Số điện thoại',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            render: (role) => {
                let color = 'default';
                if (role === 'OWNER') color = 'geekblue';
                if (role === 'CUSTOMER') color = 'green';
                if (role === 'SHIPPER') color = 'purple';
                return <Tag color={color}>{role || 'UNKNOWN'}</Tag>;
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            key: 'isActive',
            render: (isActive) =>
                isActive ? (
                    <Tag color="green">Đang hoạt động</Tag>
                ) : (
                    <Tag color="red">Đã vô hiệu hóa</Tag>
                ),
        },
        {
            title: 'Thao tác',
            key: 'action',
            render: (_, record) => (
                <Space>
                    {record.isActive ? (
                        <Button
                            danger
                            icon={<LockOutlined />}
                            size="small"
                            onClick={() => openDeactivateModal(record)}
                        >
                            Khóa
                        </Button>
                    ) : (
                        <Button
                            type="primary"
                            icon={<UnlockOutlined />}
                            size="small"
                            onClick={() => openActivateModal(record)}
                        >
                            Mở khóa
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    const modalTitle =
        modalAction === 'deactivate'
            ? 'Xác nhận vô hiệu hóa tài khoản'
            : modalAction === 'activate'
                ? 'Xác nhận kích hoạt lại tài khoản'
                : 'Xác nhận';

    const modalMessage =
        modalAction === 'deactivate'
            ? `Bạn có chắc chắn muốn vô hiệu hóa tài khoản "${selectedAccount?.username}" không?`
            : modalAction === 'activate'
                ? `Bạn có chắc chắn muốn kích hoạt lại tài khoản "${selectedAccount?.username}" không?`
                : 'Bạn có chắc chắn muốn thực hiện hành động này?';

    return (
        <div>
            <h2 style={{ marginBottom: 16 }}>Quản lý tài khoản người dùng</h2>
            <Table
                rowKey="id"
                columns={columns}
                dataSource={accounts}
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            {/* ConfirmModal dùng chung */}
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
        </div>
    );
};

export default AdminUsersPage;
