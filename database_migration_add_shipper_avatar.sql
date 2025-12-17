-- Migration: Thêm cột avatar vào bảng shippers
-- URL ảnh đại diện của shipper

-- Kiểm tra xem cột đã tồn tại chưa, nếu chưa thì thêm vào
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'shippers' 
        AND column_name = 'avatar'
    ) THEN
        ALTER TABLE shippers 
        ADD COLUMN avatar VARCHAR(500) NULL;
        
        RAISE NOTICE 'Đã thêm cột avatar vào bảng shippers';
    ELSE
        RAISE NOTICE 'Cột avatar đã tồn tại trong bảng shippers';
    END IF;
END $$;

-- Kiểm tra lại cột đã được tạo thành công
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'shippers' 
AND column_name = 'avatar';





