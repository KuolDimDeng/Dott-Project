#!/bin/bash

# Script to add mobile money payment environment variables

ENV_FILE=".env"

echo "📱 Adding Mobile Money Payment Environment Variables"
echo "===================================================="

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating new .env file..."
    touch "$ENV_FILE"
fi

# Check if variables already exist
if grep -q "PAYMENT_TEST_MODE" "$ENV_FILE"; then
    echo "⚠️  PAYMENT_TEST_MODE already exists in .env"
else
    echo "" >> "$ENV_FILE"
    echo "# Mobile Money Payment Configuration" >> "$ENV_FILE"
    echo "PAYMENT_TEST_MODE=True  # Set to False for production" >> "$ENV_FILE"
    echo "✅ Added PAYMENT_TEST_MODE"
fi

if grep -q "FIELD_ENCRYPTION_KEY" "$ENV_FILE"; then
    echo "⚠️  FIELD_ENCRYPTION_KEY already exists in .env"
else
    echo "FIELD_ENCRYPTION_KEY=KEW5YU-eunM16piy00EEY6tUtNI4MlFeJDM_vkx0utg=" >> "$ENV_FILE"
    echo "✅ Added FIELD_ENCRYPTION_KEY"
fi

if grep -q "MOMO_SANDBOX_SUBSCRIPTION_KEY" "$ENV_FILE"; then
    echo "⚠️  MOMO_SANDBOX_SUBSCRIPTION_KEY already exists in .env"
else
    echo "MOMO_SANDBOX_SUBSCRIPTION_KEY=326d22e6674c4d0e93831b138f4d6407" >> "$ENV_FILE"
    echo "✅ Added MOMO_SANDBOX_SUBSCRIPTION_KEY"
fi

# Optional: Add M-Pesa credentials if you have them
if grep -q "MPESA_CONSUMER_KEY" "$ENV_FILE"; then
    echo "⚠️  M-Pesa credentials already exist in .env"
else
    echo "" >> "$ENV_FILE"
    echo "# M-Pesa Configuration (update with your actual credentials)" >> "$ENV_FILE"
    echo "MPESA_CONSUMER_KEY=your_consumer_key_here" >> "$ENV_FILE"
    echo "MPESA_CONSUMER_SECRET=your_consumer_secret_here" >> "$ENV_FILE"
    echo "MPESA_SHORTCODE=174379  # Sandbox shortcode" >> "$ENV_FILE"
    echo "MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919  # Sandbox passkey" >> "$ENV_FILE"
    echo "✅ Added M-Pesa placeholder credentials"
fi

echo ""
echo "===================================================="
echo "✅ Environment variables have been configured!"
echo ""
echo "📝 Next steps:"
echo "1. Review the .env file to ensure values are correct"
echo "2. Update M-Pesa credentials when you have them"
echo "3. Set PAYMENT_TEST_MODE=False when ready for production"
echo "4. Add these same variables to your Render/staging environment"
echo ""
echo "🚀 Your mobile money integration is ready to use!"