import React, { useState, useEffect } from 'react';
import { Tag, Tooltip } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, StopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';

// Kích hoạt các plugin cần thiết của dayjs
dayjs.extend(duration);
dayjs.extend(relativeTime);

const TimerDisplay = ({ status, shippedAt, completedAt }) => {
    const [elapsedString, setElapsedString] = useState('-');
    // State để hứng thời gian thực mỗi giây, buộc component re-render
    const [, setTick] = useState(0);

    // Hàm format từ mili-giây sang dạng HH:mm:ss
    const formatDuration = (diffMs) => {
        if (diffMs < 0) return '00:00';
        const dur = dayjs.duration(diffMs);
        const hours = dur.hours();
        const minutes = dur.minutes();
        const seconds = dur.seconds();

        const formatTwoDigits = (num) => String(num).padStart(2, '0');

        if (hours > 0) {
            return `${formatTwoDigits(hours)}:${formatTwoDigits(minutes)}:${formatTwoDigits(seconds)}`;
        }
        return `${formatTwoDigits(minutes)}:${formatTwoDigits(seconds)}`;
    };

    useEffect(() => {
        let intervalId;

        // TRƯỜNG HỢP 1: ĐANG GIAO (SHIPPING) -> Đồng hồ chạy real-time
        if (status === 'SHIPPING' && shippedAt) {
            // Cài đặt interval chạy mỗi 1 giây (1000ms)
            intervalId = setInterval(() => {
                // Cập nhật state tick để trigger re-render
                setTick(tick => tick + 1);
            }, 1000);
        }

        // Dọn dẹp interval khi component unmount hoặc status thay đổi
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [status, shippedAt]); // Chỉ chạy lại effect khi status hoặc shippedAt thay đổi

    // --- TÍNH TOÁN GIÁ TRỊ HIỂN THỊ (Chạy mỗi lần render) ---
    let displayContent = <span style={{ color: '#ccc' }}>-</span>;

    if (status === 'SHIPPING' && shippedAt) {
        const start = dayjs(shippedAt);
        const now = dayjs();
        const diffMs = now.diff(start);

        // Nếu giao quá lâu (ví dụ > 45 phút) thì đổi màu cảnh báo
        const isLongDelivery = dayjs.duration(diffMs).asMinutes() > 45;

        displayContent = (
            <Tooltip title={`Bắt đầu giao lúc: ${start.format('HH:mm:ss')}`}>
                <Tag icon={<ClockCircleOutlined spin />} color={isLongDelivery ? 'error' : 'processing'}>
                    {formatDuration(diffMs)}
                </Tag>
            </Tooltip>
        );
    }
    else if ((status === 'COMPLETED' || status === 'CANCELLED') && shippedAt && completedAt) {
        // TRƯỜNG HỢP 2: ĐÃ KẾT THÚC -> Hiển thị tổng thời gian cố định
        const start = dayjs(shippedAt);
        const end = dayjs(completedAt);
        const diffMs = end.diff(start);

        const icon = status === 'COMPLETED' ? <CheckCircleOutlined /> : <StopOutlined />;
        const color = status === 'COMPLETED' ? 'success' : 'default';

        displayContent = (
            <Tooltip title={`Hoàn thành trong: ${dayjs.duration(diffMs).humanize()}`}>
                <Tag icon={icon} color={color}>
                    {formatDuration(diffMs)}
                </Tag>
            </Tooltip>
        );
    }

    return displayContent;
};

export default TimerDisplay;