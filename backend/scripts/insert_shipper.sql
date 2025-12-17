-- Script SQL để insert tài khoản shipper vào database
-- Database: shopeefood
-- Chạy script này trong MySQL Workbench hoặc command line

-- 1. Insert vào bảng accounts
-- Password: "shipper123" (đã mã hóa BCrypt)
-- BCrypt hash cho password "shipper123": $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
INSERT INTO accounts (username, password, email, phone, role, is_active)
VALUES (
    'shipper01',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'shipper01@example.com',
    '0901234567',
    'SHIPPER',
    TRUE
);

-- 2. Insert vào bảng shippers với account_id = ID của account vừa tạo
INSERT INTO shippers (account_id, full_name, license_plate, vehicle_type, current_lat, current_long, status)
VALUES (
    LAST_INSERT_ID(),
    'Nguyễn Văn Shipper',
    '30A-12345',
    'Xe máy',
    21.0285,  -- Vĩ độ (Hà Nội)
    105.8542, -- Kinh độ (Hà Nội)
    'OFFLINE' -- Trạng thái ban đầu: OFFLINE
);

-- Thông tin đăng nhập:
-- Username: shipper01
-- Password: shipper123
-- Email: shipper01@example.com


















