import { NextResponse } from 'next/server';
import { logger } from '@/utils/logger';
import { cookies } from 'next/headers';

// Claude API configuration
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-3-sonnet-20240229'; // You can change this to claude-3-opus-20240229 for better performance

export async function POST(request) {
  try {
    logger.info('[SmartInsights-Claude] Processing AI query request');
    
    // Verify session
    const cookieStore = await cookies();
    const sidCookie = cookieStore.get('sid');
    
    if (!sidCookie?.value) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    // Get Claude API key from environment variable
    const claudeApiKey = process.env.SMART_INSIGHTS_CLAUDE_API_KEY;
    
    if (!claudeApiKey) {
      logger.error('[SmartInsights-Claude] Claude API key not configured');
      return NextResponse.json(
        { error: 'AI service not configured. Please contact support.' },
        { status: 500 }
      );
    }

    // Parse request body
    const { query, context } = await request.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    logger.info('[SmartInsights-Claude] Query:', query);

    // Prepare the system prompt for business insights
    const systemPrompt = `You are a smart business insights assistant for a comprehensive business management platform. 
You have access to analyze business data including:
- Sales and revenue trends
- Customer analytics and behavior
- Inventory and product performance
- Financial metrics and reports
- Employee and HR data

Provide clear, actionable insights based on the user's query. Use specific numbers and percentages when available.
Format your responses with:
- Brief summary
- Key findings (bullet points)
- Recommendations when applicable
Keep responses concise but informative.`;

    // Make request to Claude API
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `${systemPrompt}\n\nUser Query: ${query}${context ? `\n\nContext: ${context}` : ''}`
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.error('[SmartInsights-Claude] Claude API error:', errorData);
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'AI service authentication failed' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to get AI response' },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    // Extract the response content
    const aiResponse = data.content[0].text;
    
    logger.info('[SmartInsights-Claude] Response generated successfully');
    
    return NextResponse.json({
      response: aiResponse,
      usage: {
        input_tokens: data.usage.input_tokens,
        output_tokens: data.usage.output_tokens
      }
    });

  } catch (error) {
    logger.error('[SmartInsights-Claude] Error:', error);
    
    return NextResponse.json(
      { error: 'Failed to process AI query' },
      { status: 500 }
    );
  }
}