import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  console.log('[Claude Test] Starting test...');
  console.log('[Claude Test] API Key exists:', !!process.env.CLAUDE_TAX_API_KEY);
  console.log('[Claude Test] API Key length:', process.env.CLAUDE_TAX_API_KEY?.length);
  
  if (!process.env.CLAUDE_TAX_API_KEY) {
    return NextResponse.json({ 
      error: 'CLAUDE_TAX_API_KEY not configured',
      keyExists: false 
    });
  }
  
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_TAX_API_KEY,
    });
    
    console.log('[Claude Test] Calling Claude API...');
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: 'What is the sales tax rate in Utah? Reply with just the number.'
        }
      ]
    });
    
    console.log('[Claude Test] Response:', message.content[0].text);
    
    return NextResponse.json({ 
      success: true,
      response: message.content[0].text,
      keyExists: true,
      keyLength: process.env.CLAUDE_TAX_API_KEY.length
    });
  } catch (error) {
    console.error('[Claude Test] Error:', error);
    return NextResponse.json({ 
      error: error.message,
      keyExists: true,
      errorType: error.constructor.name
    });
  }
}