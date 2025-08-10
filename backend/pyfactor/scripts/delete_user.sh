#!/bin/bash

# User Deletion Script for Dott Application
# This script helps delete users from the production database

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-dpg-d0u3s349c44c73a8m3rg-a.oregon-postgres.render.com}"
DB_NAME="${DB_NAME:-dott_production}"
DB_USER="${DB_USER:-dott_user}"
DB_PORT="${DB_PORT:-5432}"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        USER DELETION TOOL              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Function to connect to database
run_sql() {
    PGPASSWORD="${DB_PASSWORD}" psql "sslmode=require host=${DB_HOST} dbname=${DB_NAME} user=${DB_USER} port=${DB_PORT}" -c "$1"
}

# Function to delete user
delete_user() {
    local email="$1"
    
    echo -e "${YELLOW}Searching for user: ${email}${NC}"
    
    # First, check if user exists and get their info
    USER_INFO=$(PGPASSWORD="${DB_PASSWORD}" psql "sslmode=require host=${DB_HOST} dbname=${DB_NAME} user=${DB_USER} port=${DB_PORT}" -t -c "
        SELECT id, email, date_joined, is_active, tenant_id 
        FROM custom_auth_user 
        WHERE email = '${email}'
    " 2>/dev/null)
    
    if [ -z "$USER_INFO" ]; then
        echo -e "${GREEN}✅ User ${email} does not exist in the database${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}Found user:${NC}"
    echo "$USER_INFO"
    
    # Get user ID
    USER_ID=$(PGPASSWORD="${DB_PASSWORD}" psql "sslmode=require host=${DB_HOST} dbname=${DB_NAME} user=${DB_USER} port=${DB_PORT}" -t -c "
        SELECT id FROM custom_auth_user WHERE email = '${email}'
    " 2>/dev/null | xargs)
    
    echo -e "${YELLOW}Counting related records...${NC}"
    
    # Count related records
    PGPASSWORD="${DB_PASSWORD}" psql "sslmode=require host=${DB_HOST} dbname=${DB_NAME} user=${DB_USER} port=${DB_PORT}" -c "
        SELECT 
            'Sessions' as type, COUNT(*) as count FROM user_sessions WHERE user_id = ${USER_ID}
        UNION ALL
        SELECT 'Audit Logs', COUNT(*) FROM audit_log WHERE user_id = ${USER_ID}
        UNION ALL
        SELECT 'Smart Insights', COUNT(*) FROM smart_insights_usercredit WHERE user_id = ${USER_ID}
        UNION ALL
        SELECT 'Notifications', COUNT(*) FROM notifications_notification WHERE user_id = ${USER_ID}
        UNION ALL
        SELECT 'Employee Record', COUNT(*) FROM hr_employee WHERE user_id = ${USER_ID}
    " 2>/dev/null || true
    
    echo ""
    echo -e "${RED}⚠️  WARNING: This will permanently delete the user and ALL related data!${NC}"
    echo -e "${RED}This action cannot be undone!${NC}"
    echo ""
    read -p "Type 'DELETE' to confirm deletion of ${email}: " confirmation
    
    if [ "$confirmation" != "DELETE" ]; then
        echo -e "${YELLOW}Deletion cancelled${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}Deleting user data...${NC}"
    
    # Execute deletion
    DELETION_RESULT=$(PGPASSWORD="${DB_PASSWORD}" psql "sslmode=require host=${DB_HOST} dbname=${DB_NAME} user=${DB_USER} port=${DB_PORT}" -c "
        BEGIN;
        
        -- Delete all related data
        DELETE FROM smart_insights_credittransaction WHERE user_id = ${USER_ID};
        DELETE FROM smart_insights_usercredit WHERE user_id = ${USER_ID};
        DELETE FROM audit_log WHERE user_id = ${USER_ID};
        DELETE FROM session_events WHERE session_id IN (SELECT session_id FROM user_sessions WHERE user_id = ${USER_ID});
        DELETE FROM session_security WHERE session_id IN (SELECT session_id FROM user_sessions WHERE user_id = ${USER_ID});
        DELETE FROM user_sessions WHERE user_id = ${USER_ID};
        DELETE FROM users_userprofile WHERE user_id = ${USER_ID};
        DELETE FROM hr_employee WHERE user_id = ${USER_ID};
        DELETE FROM notifications_notification WHERE user_id = ${USER_ID};
        DELETE FROM custom_auth_user WHERE id = ${USER_ID};
        
        -- Verify deletion
        SELECT CASE 
            WHEN EXISTS (SELECT 1 FROM custom_auth_user WHERE email = '${email}')
            THEN 'FAILED'
            ELSE 'SUCCESS'
        END as status;
        
        COMMIT;
    " 2>&1)
    
    if echo "$DELETION_RESULT" | grep -q "SUCCESS"; then
        echo -e "${GREEN}✅ User ${email} has been successfully deleted${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to delete user${NC}"
        echo "Error: $DELETION_RESULT"
        return 1
    fi
}

# Main menu
main_menu() {
    echo "Choose an option:"
    echo "1. Delete a user by email"
    echo "2. Check if a user exists"
    echo "3. Dry run (show what would be deleted)"
    echo "4. Exit"
    echo ""
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            read -p "Enter email address to delete: " email
            if [ -z "$email" ]; then
                echo -e "${RED}Email address is required${NC}"
                return 1
            fi
            delete_user "$email"
            ;;
        2)
            read -p "Enter email address to check: " email
            if [ -z "$email" ]; then
                echo -e "${RED}Email address is required${NC}"
                return 1
            fi
            check_user "$email"
            ;;
        3)
            read -p "Enter email address for dry run: " email
            if [ -z "$email" ]; then
                echo -e "${RED}Email address is required${NC}"
                return 1
            fi
            dry_run "$email"
            ;;
        4)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            return 1
            ;;
    esac
}

# Check if user exists
check_user() {
    local email="$1"
    
    USER_EXISTS=$(PGPASSWORD="${DB_PASSWORD}" psql "sslmode=require host=${DB_HOST} dbname=${DB_NAME} user=${DB_USER} port=${DB_PORT}" -t -c "
        SELECT COUNT(*) FROM custom_auth_user WHERE email = '${email}'
    " 2>/dev/null | xargs)
    
    if [ "$USER_EXISTS" -eq "0" ]; then
        echo -e "${GREEN}✅ User ${email} does not exist${NC}"
    else
        echo -e "${YELLOW}⚠️  User ${email} exists in the database${NC}"
        
        # Show user details
        PGPASSWORD="${DB_PASSWORD}" psql "sslmode=require host=${DB_HOST} dbname=${DB_NAME} user=${DB_USER} port=${DB_PORT}" -c "
            SELECT id, email, date_joined, is_active, tenant_id 
            FROM custom_auth_user 
            WHERE email = '${email}'
        "
    fi
}

# Dry run - show what would be deleted
dry_run() {
    local email="$1"
    
    echo -e "${BLUE}DRY RUN - No data will be deleted${NC}"
    echo ""
    
    # Get user ID
    USER_ID=$(PGPASSWORD="${DB_PASSWORD}" psql "sslmode=require host=${DB_HOST} dbname=${DB_NAME} user=${DB_USER} port=${DB_PORT}" -t -c "
        SELECT id FROM custom_auth_user WHERE email = '${email}'
    " 2>/dev/null | xargs)
    
    if [ -z "$USER_ID" ]; then
        echo -e "${GREEN}User ${email} does not exist${NC}"
        return 0
    fi
    
    echo -e "${YELLOW}The following data would be deleted for ${email} (ID: ${USER_ID}):${NC}"
    
    PGPASSWORD="${DB_PASSWORD}" psql "sslmode=require host=${DB_HOST} dbname=${DB_NAME} user=${DB_USER} port=${DB_PORT}" -c "
        SELECT 'smart_insights_credittransaction' as table_name, COUNT(*) as records 
        FROM smart_insights_credittransaction WHERE user_id = ${USER_ID}
        UNION ALL
        SELECT 'smart_insights_usercredit', COUNT(*) 
        FROM smart_insights_usercredit WHERE user_id = ${USER_ID}
        UNION ALL
        SELECT 'audit_log', COUNT(*) 
        FROM audit_log WHERE user_id = ${USER_ID}
        UNION ALL
        SELECT 'session_events', COUNT(*) 
        FROM session_events WHERE session_id IN (SELECT session_id FROM user_sessions WHERE user_id = ${USER_ID})
        UNION ALL
        SELECT 'session_security', COUNT(*) 
        FROM session_security WHERE session_id IN (SELECT session_id FROM user_sessions WHERE user_id = ${USER_ID})
        UNION ALL
        SELECT 'user_sessions', COUNT(*) 
        FROM user_sessions WHERE user_id = ${USER_ID}
        UNION ALL
        SELECT 'users_userprofile', COUNT(*) 
        FROM users_userprofile WHERE user_id = ${USER_ID}
        UNION ALL
        SELECT 'hr_employee', COUNT(*) 
        FROM hr_employee WHERE user_id = ${USER_ID}
        UNION ALL
        SELECT 'notifications_notification', COUNT(*) 
        FROM notifications_notification WHERE user_id = ${USER_ID}
        UNION ALL
        SELECT 'custom_auth_user', COUNT(*) 
        FROM custom_auth_user WHERE id = ${USER_ID}
        ORDER BY table_name;
    " 2>/dev/null || echo "Error counting records"
}

# Check for database password
if [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}Database password not found in environment${NC}"
    read -s -p "Enter database password: " DB_PASSWORD
    echo ""
fi

# If email provided as argument, delete directly
if [ $# -eq 1 ]; then
    delete_user "$1"
else
    # Show menu
    main_menu
fi