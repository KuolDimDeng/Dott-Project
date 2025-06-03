#!/usr/bin/env python3
"""
Simple standalone health server for App Runner
This bypasses Django completely to ensure health checks work
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import sys
from datetime import datetime

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ['/health/', '/health', '/health-check/', '/health-check']:
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'OK')
        elif self.path in ['/health/detailed/', '/health/detailed']:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            health_data = {
                'status': 'healthy',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'service': 'dott-backend-health',
                'python_version': sys.version,
                'environment': 'app-runner'
            }
            self.wfile.write(json.dumps(health_data).encode())
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'Not Found')
    
    def do_HEAD(self):
        # App Runner health checks might use HEAD requests
        if self.path in ['/health/', '/health', '/health-check/', '/health-check']:
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        # Simple logging
        print(f"{datetime.utcnow().isoformat()}Z [HEALTH] {format % args}")

def run_health_server():
    port = int(os.getenv('PORT', 8000))
    server = HTTPServer(('0.0.0.0', port), HealthHandler)
    print(f"Starting simple health server on port {port}")
    print(f"Health endpoint: http://0.0.0.0:{port}/health/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Shutting down health server")
        server.shutdown()

if __name__ == '__main__':
    run_health_server() 