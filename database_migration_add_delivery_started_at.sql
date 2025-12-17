-- Migration: Thêm cột delivery_started_at vào bảng orders
-- Thời gian shipper bắt đầu giao hàng (sau khi đã nhận đơn)

-- Kiểm tra xem cột đã tồn tại chưa, nếu chưa thì thêm vào
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'delivery_started_at'
    ) THEN
        ALTER TABLE orders 
        ADD COLUMN delivery_started_at TIMESTAMP NULL;
        
        RAISE NOTICE 'Đã thêm cột delivery_started_at vào bảng orders';
    ELSE
        RAISE NOTICE 'Cột delivery_started_at đã tồn tại trong bảng orders';
    END IF;
END $$;

-- Kiểm tra lại cột đã được tạo thành công
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'delivery_started_at';





