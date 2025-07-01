# Environment Variables Documentation

## Claude API Keys

The application uses two separate Claude API keys for different features:

### 1. Tax API (`CLAUDE_TAX_API_KEY`)
- **Purpose**: Used for tax-related AI suggestions and calculations
- **Required by**: 
  - `/src/app/api/taxes/suggestions/route.js` - Tax suggestions endpoint
  - Tax Settings page for AI-powered tax rate lookups
- **Model**: Claude 3 Opus (high accuracy for tax compliance)
- **Environment Variable**: `CLAUDE_TAX_API_KEY`
- **Example**: `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`

### 2. Smart Insights API (`CLAUDE_SMART_INSIGHTS_API_KEY`)
- **Purpose**: Used for business intelligence and customer insights
- **Required by**: Smart Insights features
- **Model**: Claude 3 Sonnet (cost-effective for general queries)
- **Environment Variable**: `CLAUDE_SMART_INSIGHTS_API_KEY`

## Configuration Locations

### Production (Render)
- Frontend (dott-front): Environment variables set in Render dashboard
- Backend (dott-api): Environment variables set in Render dashboard
- Both services have `CLAUDE_TAX_API_KEY` configured

### Development
Add to `.env.local`:
```bash
CLAUDE_TAX_API_KEY=your-tax-api-key-here
CLAUDE_SMART_INSIGHTS_API_KEY=your-insights-api-key-here
```

## Important Notes
1. **DO NOT** use `CLAUDE_API_KEY` - this is deprecated
2. Tax features specifically require `CLAUDE_TAX_API_KEY`
3. Smart Insights features require `CLAUDE_SMART_INSIGHTS_API_KEY`
4. Both frontend and backend need these keys for full functionality

## Troubleshooting
If tax suggestions are returning zeros:
1. Check that `CLAUDE_TAX_API_KEY` is set in environment
2. Verify the API key is valid and has appropriate permissions
3. Check logs for JSON parsing errors - Claude's response format may need adjustment
4. Ensure both frontend and backend have the same API key configured