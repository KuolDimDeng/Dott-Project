"""
Simple WSGI application for AWS Elastic Beanstalk health checks
"""

def application(environ, start_response):
    """
    Simple WSGI application that responds to health checks
    """
    path = environ.get('PATH_INFO', '')
    
    # Respond to all requests with a 200 OK
    status = '200 OK'
    headers = [('Content-type', 'text/plain')]
    start_response(status, headers)
    
    if path == '/health/':
        return [b'Healthy']
    else:
        return [b'Dott Application - Testing Docker with AWS Elastic Beanstalk']

if __name__ == '__main__':
    # For local testing
    from wsgiref.simple_server import make_server
    httpd = make_server('', 8080, application)
    print("Serving on port 8080...")
    httpd.serve_forever()
