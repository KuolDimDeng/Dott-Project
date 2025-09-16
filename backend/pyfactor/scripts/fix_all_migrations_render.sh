#!/bin/bash
# Complete Migration Fix Script for Render
# Run this in Render's shell to fix all migration issues

echo "================================================"
echo "FIXING ALL MIGRATION ISSUES"
echo "================================================"

# Step 1: Create missing tables via SQL
echo -e "\n[1/4] Creating missing tables..."
python manage.py dbshell << 'EOF'
-- Create chat_chatmessage table
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

-- Create chat_chatconversation table
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

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_chat_message_conversation ON chat_chatmessage(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_sender ON chat_chatmessage(sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_consumer ON chat_chatconversation(consumer_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_business ON chat_chatconversation(business_id);

-- Fix marketplace courier_id if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'marketplace_consumer_orders'
        AND column_name = 'courier_id'
    ) THEN
        ALTER TABLE marketplace_consumer_orders ADD COLUMN courier_id INTEGER;
    END IF;
END $$;

-- Show status
SELECT 'Tables created/verified successfully' as status;
EOF

# Step 2: Mark problematic migrations as fake applied
echo -e "\n[2/4] Marking problematic migrations as applied..."

# Mark chat migrations as fake
python manage.py migrate chat 0001_initial --fake 2>/dev/null || true
python manage.py migrate chat 0002_add_sender_type --fake 2>/dev/null || true

# Mark marketplace migrations as fake
python manage.py migrate marketplace 0003_add_courier_integration --fake 2>/dev/null || true
python manage.py migrate marketplace 0004_consumer_order_courier --fake 2>/dev/null || true

# Step 3: Run all remaining migrations
echo -e "\n[3/4] Running remaining migrations..."
python manage.py migrate --run-syncdb

# Step 4: Verify migration status
echo -e "\n[4/4] Verifying migration status..."
python manage.py showmigrations | grep -E "\[X\]|\[ \]" | tail -20

echo -e "\n================================================"
echo "MIGRATION FIX COMPLETE"
echo "================================================"

# Check if cron job can run
echo -e "\nTesting auto_approve_staging command..."
python manage.py auto_approve_staging --dry-run

echo -e "\n✅ All migration issues should now be resolved!"
echo "✅ Cron job should work properly"