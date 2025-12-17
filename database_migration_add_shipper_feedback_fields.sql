ALTER TABLE feedbacks
ADD COLUMN IF NOT EXISTS shipper_to_customer_rating INTEGER NULL,
ADD COLUMN IF NOT EXISTS shipper_to_customer_comment TEXT NULL;


