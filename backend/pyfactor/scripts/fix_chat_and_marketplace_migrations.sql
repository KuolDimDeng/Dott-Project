-- Fix Chat and Marketplace Migration Issues
-- Run this in dbshell on Render

-- 1. Create the chat_chatmessage table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_chatmessage (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    sender_type VARCHAR(20) NOT NULL DEFAULT 'user',
    sender_id INTEGER,
    text_content TEXT,
    image_url TEXT,
    voice_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    tenant_id INTEGER,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    message_type VARCHAR(20) DEFAULT 'text',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Create indexes for chat_chatmessage
CREATE INDEX IF NOT EXISTS idx_chat_message_conversation ON chat_chatmessage(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_sender ON chat_chatmessage(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_tenant ON chat_chatmessage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_created ON chat_chatmessage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_message_read ON chat_chatmessage(is_read, conversation_id);

-- 3. Create chat_chatconversation table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_chatconversation (
    id SERIAL PRIMARY KEY,
    consumer_id INTEGER,
    business_id INTEGER,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    consumer_unread_count INTEGER DEFAULT 0,
    business_unread_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    tenant_id INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Create indexes for chat_chatconversation
CREATE INDEX IF NOT EXISTS idx_chat_conv_consumer ON chat_chatconversation(consumer_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_business ON chat_chatconversation(business_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_tenant ON chat_chatconversation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_active ON chat_chatconversation(is_active);
CREATE INDEX IF NOT EXISTS idx_chat_conv_last_msg ON chat_chatconversation(last_message_at DESC);

-- 5. Fix marketplace_consumer_orders courier_id issue
-- Check if courier_id column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'marketplace_consumer_orders'
        AND column_name = 'courier_id'
    ) THEN
        ALTER TABLE marketplace_consumer_orders
        ADD COLUMN courier_id INTEGER;
    END IF;
END $$;

-- 6. Add foreign key constraints for chat tables
DO $$
BEGIN
    -- Add foreign key for conversation_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_chat_message_conversation'
    ) THEN
        ALTER TABLE chat_chatmessage
        ADD CONSTRAINT fk_chat_message_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES chat_chatconversation(id)
        ON DELETE CASCADE;
    END IF;
END $$;

-- 7. Check and display table status
SELECT 'chat_chatmessage' as table_name,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_chatmessage') as exists
UNION ALL
SELECT 'chat_chatconversation',
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_chatconversation')
UNION ALL
SELECT 'marketplace_consumer_orders',
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'marketplace_consumer_orders');

-- 8. Display column status for marketplace_consumer_orders
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'marketplace_consumer_orders'
AND column_name IN ('courier_id', 'delivery_status', 'delivery_notes')
ORDER BY ordinal_position;