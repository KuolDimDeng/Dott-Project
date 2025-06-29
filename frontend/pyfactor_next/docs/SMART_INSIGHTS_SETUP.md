# Smart Insights Claude API Setup

## Environment Variable Configuration

The Smart Insights feature uses Claude API for AI-powered business intelligence. You need to configure the API key in your environment variables.

### Frontend (Next.js) - Required

Add the following environment variable to your Render frontend service:

```
SMART_INSIGHTS_CLAUDE_API_KEY=your-claude-api-key-here
```

**Important**: 
- Do NOT commit the API key to your code repository
- Set this variable in Render's environment variables section
- The key should start with `sk-ant-api03-`

### How to Add in Render:

1. Go to your Render dashboard
2. Select your frontend service (dott-front)
3. Navigate to "Environment" tab
4. Add a new environment variable:
   - Key: `SMART_INSIGHTS_CLAUDE_API_KEY`
   - Value: Your Claude API key
5. Save and the service will automatically redeploy

### Backend (Django) - Not Required

The Smart Insights feature runs entirely on the frontend Next.js server, so you don't need to add the API key to the backend Django service.

## API Usage

The Smart Insights feature:
- Sends user queries to Claude API
- Receives AI-generated business insights
- Tracks token usage for cost monitoring
- Deducts credits from user's account

## Security Notes

- The API key is only used server-side in the Next.js API route
- It's never exposed to the client/browser
- All requests are authenticated with session cookies
- The API route is located at `/api/smart-insights/claude`

## Testing

After setting up the environment variable:

1. Navigate to Smart Insights in the dashboard
2. Try a sample query like "What's my revenue trend this month?"
3. Check the browser console for any errors
4. Monitor the server logs for API responses

## Troubleshooting

If you see "AI service not configured":
- Ensure the environment variable is set correctly
- Check that the service has redeployed after adding the variable
- Verify the API key is valid

If you see authentication errors:
- Check that your Claude API key is valid
- Ensure you haven't exceeded your API rate limits
- Verify the key has the correct permissions