"""
Response compression middleware for API performance
"""
import gzip
import json
from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponse
import logging

logger = logging.getLogger(__name__)


class CompressionMiddleware(MiddlewareMixin):
    """
    Middleware to compress API responses using gzip
    """
    
    # Minimum size for compression (1KB)
    MIN_SIZE = 1024
    
    # Content types to compress
    COMPRESSIBLE_TYPES = [
        'application/json',
        'text/html',
        'text/plain',
        'text/css',
        'text/javascript',
        'application/javascript',
    ]
    
    def process_response(self, request, response):
        """Compress response if applicable"""
        
        # Check if client accepts gzip
        if 'gzip' not in request.META.get('HTTP_ACCEPT_ENCODING', ''):
            return response
        
        # Check if response is already compressed
        if response.get('Content-Encoding'):
            return response
        
        # Check content type
        content_type = response.get('Content-Type', '').split(';')[0]
        if content_type not in self.COMPRESSIBLE_TYPES:
            return response
        
        # Check response size
        if not hasattr(response, 'content') or len(response.content) < self.MIN_SIZE:
            return response
        
        # Don't compress streaming responses
        if response.streaming:
            return response
        
        try:
            # Compress content
            compressed_content = gzip.compress(response.content)
            
            # Only use compression if it's actually smaller
            if len(compressed_content) < len(response.content):
                response.content = compressed_content
                response['Content-Encoding'] = 'gzip'
                response['Content-Length'] = str(len(compressed_content))
                
                # Add vary header
                vary = response.get('Vary', '')
                if vary:
                    vary_headers = [h.strip() for h in vary.split(',')]
                    if 'Accept-Encoding' not in vary_headers:
                        vary_headers.append('Accept-Encoding')
                    response['Vary'] = ', '.join(vary_headers)
                else:
                    response['Vary'] = 'Accept-Encoding'
                
                logger.debug(f"Compressed response: {len(response.content)} bytes (was {len(response.content)})")
        
        except Exception as e:
            logger.error(f"Compression error: {str(e)}")
        
        return response


class JSONMinifyMiddleware(MiddlewareMixin):
    """
    Middleware to minify JSON responses by removing unnecessary whitespace
    """
    
    def process_response(self, request, response):
        """Minify JSON responses"""
        
        # Only process JSON responses
        if not response.get('Content-Type', '').startswith('application/json'):
            return response
        
        # Don't minify in debug mode
        from django.conf import settings
        if settings.DEBUG:
            return response
        
        # Skip if already compressed
        if response.get('Content-Encoding'):
            return response
        
        try:
            # Parse and re-serialize JSON without whitespace
            if hasattr(response, 'content') and response.content:
                data = json.loads(response.content.decode('utf-8'))
                minified = json.dumps(data, separators=(',', ':'), ensure_ascii=False)
                response.content = minified.encode('utf-8')
                response['Content-Length'] = str(len(response.content))
                
                logger.debug(f"Minified JSON response")
        
        except Exception as e:
            # If minification fails, return original response
            logger.debug(f"JSON minification skipped: {str(e)}")
        
        return response