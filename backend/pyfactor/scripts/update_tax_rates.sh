#!/bin/bash
# Script to update tax rates - can be run manually or via cron

# Set up environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🌍 Tax Rate Update Script${NC}"
echo "=============================="
echo "Project root: $PROJECT_ROOT"
echo "Date: $(date)"
echo ""

# Check if we're in the right directory
if [ ! -f "$PROJECT_ROOT/manage.py" ]; then
    echo -e "${RED}Error: manage.py not found in $PROJECT_ROOT${NC}"
    echo "Please run this script from the correct location."
    exit 1
fi

# Parse command line arguments
COMMAND="weekly_tax_update"
FORCE_ALL=""
POPULATE_ALL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --populate-all)
            POPULATE_ALL=true
            COMMAND="populate_all_countries"
            shift
            ;;
        --force-all)
            FORCE_ALL="--force-all"
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --populate-all    Run initial population of all countries (first time setup)"
            echo "  --force-all       Force update of all rates, regardless of last update time"
            echo "  --help            Show this help message"
            echo ""
            echo "Examples:"
            echo "  # First time setup - populate all countries:"
            echo "  $0 --populate-all"
            echo ""
            echo "  # Weekly update (default):"
            echo "  $0"
            echo ""
            echo "  # Force update all rates:"
            echo "  $0 --force-all"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Change to project directory
cd "$PROJECT_ROOT" || exit

# Activate virtual environment if it exists
if [ -f "venv/bin/activate" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
elif [ -f ".venv/bin/activate" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
fi

# Load environment variables if .env exists
if [ -f ".env" ]; then
    echo "Loading environment variables..."
    export $(grep -v '^#' .env | xargs)
fi

# Check if Claude API key is set
if [ -z "$CLAUDE_API_KEY" ] && [ -z "$CLAUDE_TAX_API_KEY" ]; then
    echo -e "${RED}Error: No Claude API key found!${NC}"
    echo "Please set CLAUDE_API_KEY or CLAUDE_TAX_API_KEY in your environment"
    exit 1
fi

# Run the appropriate Django management command
if [ "$POPULATE_ALL" = true ]; then
    echo -e "${YELLOW}Running initial population of all countries...${NC}"
    echo "This may take 10-15 minutes to complete."
    echo ""
    python manage.py populate_all_countries --batch-size 10
else
    echo -e "${YELLOW}Running weekly tax rate update...${NC}"
    python manage.py weekly_tax_update $FORCE_ALL
fi

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Tax rate update completed successfully!${NC}"
    
    # Log to system log
    if command -v logger &> /dev/null; then
        logger -t tax_rates "Tax rate update completed successfully"
    fi
else
    echo ""
    echo -e "${RED}❌ Tax rate update failed with exit code $EXIT_CODE${NC}"
    
    # Log to system log
    if command -v logger &> /dev/null; then
        logger -t tax_rates "Tax rate update failed with exit code $EXIT_CODE"
    fi
fi

echo ""
echo "Finished at: $(date)"
echo "=============================="

exit $EXIT_CODE