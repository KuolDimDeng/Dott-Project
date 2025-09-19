-- Verify the table structure is correct
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'marketplace_consumer_orders'
AND column_name IN ('service_fee', 'pickup_pin', 'consumer_delivery_pin', 'delivery_pin', 'items')
ORDER BY column_name;