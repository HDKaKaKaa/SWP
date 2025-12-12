import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import { PieChartOutlined, ShopOutlined, FileTextOutlined,AreaChartOutlined, CommentOutlined,IssuesCloseOutlined } from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';

const { Header, Content, Sider } = Layout;

const OwnerLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const { token: { colorBgContainer } } = theme.useToken();

    const items = [
        { key: '/owner/dashboard', icon: <PieChartOutlined />, label: 'Tổng quan' },
        { key: '/owner/products', icon: <ShopOutlined />, label: 'Các món' },
        { key: '/owner/orders', icon: <FileTextOutlined />, label: 'Đơn hàng' },
        { key: '/owner/feedback', icon: <CommentOutlined />, label: 'Đánh giá' },
        { key: '/owner/issues', icon: <IssuesCloseOutlined />, label: 'Sự cố' },
        { key: '/owner/reports', icon: <AreaChartOutlined />, label: 'Báo cáo' },
    ];

    return (
        <Layout style={{ minHeight: '100vh'}}>

            <Sider
                collapsible
                collapsed={collapsed}
                onCollapse={setCollapsed}
                style={{}}
            >
                {/* <div
                    className="sider-header"
                    style={{
                        height: 48,
                        background: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        textAlign: 'center',
                        lineHeight: '48px',
                        fontWeight: 'bold'
                    }}
                >
                    OWNER
                </div> */}

                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    items={items}
                    onClick={({ key }) => navigate(key)}
                />
            </Sider>

            <Layout style={{ margin: 0, padding: 0 }}>
                <Header style={{ background: colorBgContainer, padding: 0 }} />
                <Content style={{ }}>
                    <div style={{
                        padding: 24,
                        minHeight: '100%',
                        background: colorBgContainer
                    }}>
                        <Outlet />
                    </div>
                </Content>
            </Layout>

        </Layout>
    );
};

export default OwnerLayout;
