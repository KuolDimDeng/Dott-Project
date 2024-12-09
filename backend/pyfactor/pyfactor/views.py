# /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/views.py

from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from .user_console import console
import json
import time
import asyncio
from asgiref.sync import sync_to_async  # Changed this line
from django.http import HttpResponse
from typing import AsyncGenerator

@sync_to_async
def get_message_from_console():
    """Get message from console in a database-safe way"""
    return console.get_message()

async def message_generator() -> AsyncGenerator[str, None]:
    """Asynchronous generator for messages"""
    while True:
        try:
            # Get message with proper async handling
            message = await get_message_from_console()
            
            if message:
                # Format message as server-sent event
                yield f"data: {json.dumps(message)}\n\n"
            
            # Use proper async sleep
            await asyncio.sleep(0.1)
            
        except Exception as e:
            # Log error but continue streaming
            print(f"Error in message generator: {str(e)}")
            await asyncio.sleep(1)  # Back off on error

@csrf_exempt
async def message_stream(request):
    """Async view to handle server-sent events stream"""
    try:
        # Set up response with proper headers
        response = StreamingHttpResponse(
            message_generator(),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        
        # Important: handle client disconnection
        request.META["wsgi.input"].set_blocking(False)
        
        return response

    except Exception as e:
        # Handle errors gracefully
        print(f"Error setting up message stream: {str(e)}")
        return HttpResponse(
            status=500,
            content=json.dumps({"error": "Failed to initialize message stream"})
        )