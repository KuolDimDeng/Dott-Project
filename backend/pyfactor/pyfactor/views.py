# /Users/kuoldeng/projectx/backend/pyfactor/pyfactor/views.py
from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from .user_console import console
import json
import time

@csrf_exempt
def message_stream(request):
    def event_stream():
        while True:
            message = console.get_message()
            if message:
                yield f"data: {json.dumps(message)}\n\n"
            time.sleep(0.1)

    return StreamingHttpResponse(event_stream(), content_type='text/event-stream')
