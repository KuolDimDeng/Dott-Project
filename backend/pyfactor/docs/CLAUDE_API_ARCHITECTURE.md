# Claude API Integration Architecture

## Overview
The Dott application uses a dual Claude API setup to optimize costs and separate functionality between different features.

## API Configuration

### Tax API (Existing)
- **Environment Variable**: `CLAUDE_API_KEY`
- **Model**: `claude-3-opus-20240229`
- **Purpose**: Tax calculations, compliance checks, regulatory guidance
- **Use Cases**:
  - Complex tax computations requiring high accuracy
  - Tax compliance verification
  - Regulatory guidance and interpretations
  - Financial calculations where precision is critical
- **Cost**: Higher per token (premium model for accuracy)

### Smart Insights API (New)
- **Environment Variable**: `CLAUDE_SMART_INSIGHTS_API_KEY`
- **Model**: `claude-3-sonnet-20240229`
- **Purpose**: Business intelligence and customer insights
- **Use Cases**:
  - Customer analysis and recommendations
  - Revenue trend analysis
  - Business performance insights
  - General business queries and advice
- **Features**:
  - Credit-based system (1 credit per query)
  - Rate limiting (10 requests per minute)
  - Monthly spending caps ($500 per user)
  - Comprehensive audit logging
- **Cost**: Lower per token (cost-effective for general queries)

## Benefits of Dual API Setup

### 1. Cost Optimization
- **Opus Model**: Used only for precision-critical tax calculations
- **Sonnet Model**: Used for general business intelligence queries
- **Result**: Significant cost savings while maintaining accuracy where needed

### 2. Feature Separation
- **Independent API Keys**: Prevents one feature from affecting another
- **Separate Rate Limits**: Tax queries don't interfere with Smart Insights usage
- **Budget Isolation**: Different spending controls for different features

### 3. Specialized Model Selection
- **Tax Calculations**: Opus model ensures maximum accuracy for financial computations
- **Business Insights**: Sonnet model provides good quality responses at lower cost
- **Future Flexibility**: Easy to upgrade/downgrade models per feature

### 4. Security and Compliance
- **API Key Isolation**: Compromised key affects only one feature
- **Audit Trails**: Separate logging for different use cases
- **Access Control**: Different permission levels per feature

## Environment Variables

### Backend (Django)
```env
# Tax API (existing)
CLAUDE_API_KEY=sk-ant-api03-...
CLAUDE_API_MODEL=claude-3-opus-20240229
CLAUDE_API_MAX_TOKENS=1000

# Smart Insights API (new)
CLAUDE_SMART_INSIGHTS_API_KEY=sk-ant-api03-...
CLAUDE_SMART_INSIGHTS_MODEL=claude-3-sonnet-20240229
CLAUDE_SMART_INSIGHTS_MAX_TOKENS=1000
```

### Configuration Notes
- If `CLAUDE_SMART_INSIGHTS_*` variables are not set, the system will fallback to default values
- Both API keys must be valid Anthropic Claude API keys
- Models can be changed via environment variables without code changes

## Usage Examples

### Tax API Usage
```python
# Used in tax calculation modules
client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)
response = client.messages.create(
    model=settings.CLAUDE_API_MODEL,
    # Tax calculation logic...
)
```

### Smart Insights API Usage
```python
# Used in Smart Insights feature
client = anthropic.Anthropic(api_key=settings.CLAUDE_SMART_INSIGHTS_API_KEY)
response = client.messages.create(
    model=settings.CLAUDE_SMART_INSIGHTS_MODEL,
    # Business intelligence logic...
)
```

## Cost Analysis

### Tax API (Opus Model)
- Higher per-token cost
- Used sparingly for critical calculations
- Estimated monthly cost: $50-100 (depending on tax query volume)

### Smart Insights API (Sonnet Model)
- Lower per-token cost (~60% cheaper than Opus)
- Credit-based system with user limits
- Monthly spending cap: $500 per user
- Estimated break-even: ~1,000 credit purchases

## Migration Notes

### Existing Tax Features
- No changes required
- Continue using `CLAUDE_API_KEY`
- Existing functionality unaffected

### New Smart Insights Features
- Requires new `CLAUDE_SMART_INSIGHTS_API_KEY` environment variable
- Uses dedicated credit system
- Separate rate limiting and spending controls

## Troubleshooting

### Common Issues
1. **Missing API Key**: Ensure `CLAUDE_SMART_INSIGHTS_API_KEY` is set in Render environment
2. **Model Configuration**: Verify model names match Anthropic's API specifications
3. **Rate Limiting**: Check Redis connection for distributed rate limiting
4. **Credit System**: Ensure database migrations are applied for Smart Insights models

### Error Messages
- `CLAUDE_SMART_INSIGHTS_API_KEY environment variable is not set`: Add the environment variable
- `Could not resolve authentication method`: API key is invalid or missing
- `Rate limit exceeded`: User has exceeded 10 requests per minute

## Future Enhancements

### Planned Features
- Model switching based on query complexity
- Dynamic rate limiting based on subscription plans
- Advanced analytics for API usage
- Integration with other AI providers for redundancy

### Scalability Considerations
- Redis-based rate limiting supports multiple server instances
- Database-backed credit system scales with user growth
- Environment-based configuration allows easy model upgrades