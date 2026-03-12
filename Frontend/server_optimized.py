#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys
import threading
import time
from pathlib import Path

PORT = 8080
DIRECTORY = "."

class OptimizedHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    # Class-level cache for all instances
    file_cache = {}
    mime_cache = {}
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'public, max-age=3600')  # Cache for 1 hour
        super().end_headers()
    
    def get_content_type(self, path):
        """Optimized content type detection"""
        ext = Path(path).suffix.lower()
        mime_types = {
            '.html': 'text/html; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.svg': 'image/svg+xml',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf'
        }
        return mime_types.get(ext, 'text/plain')
    
    def do_GET(self):
        """Optimized GET handler with caching"""
        original_path = self.path
        
        # Handle icon redirects
        icon_redirects = {
            '/favicon.ico': '/favicon.svg',
            '/apple-touch-icon.png': '/apple-touch-icon.svg',
            '/apple-touch-icon-precomposed.png': '/apple-touch-icon.svg',
            '/apple-touch-icon-120x120.png': '/apple-touch-icon-120x120.svg',
            '/apple-touch-icon-120x120-precomposed.png': '/apple-touch-icon-120x120.svg',
            '/apple-touch-icon-152x152.png': '/apple-touch-icon-152x152.svg',
            '/apple-touch-icon-167x167.png': '/apple-touch-icon-167x167.svg',
            '/apple-touch-icon-180x180.png': '/apple-touch-icon-180x180.svg'
        }
        
        if self.path in icon_redirects:
            self.path = icon_redirects[self.path]
        
        # Get clean path
        path = self.path.lstrip('/')
        
        # Default to index.html
        if path == '' or path == '/':
            path = 'index.html'
        
        # Add .html extension if missing and file exists
        if not path.endswith(('.html', '.css', '.js', '.png', '.jpg', '.ico', '.svg', '.woff', '.woff2', '.ttf')):
            if os.path.exists(path + '.html'):
                path = path + '.html'
        
        full_path = os.path.join(DIRECTORY, path)
        
        # Check cache first
        cache_key = full_path + str(os.path.getmtime(full_path) if os.path.exists(full_path) else 0)
        if cache_key in self.file_cache:
            cached_data, cached_mtime = self.file_cache[cache_key]
            if cached_mtime == os.path.getmtime(full_path):
                self.send_response(200)
                content_type = self.get_content_type(path)
                self.send_header('Content-type', content_type)
                self.send_header('Content-Length', str(len(cached_data)))
                self.end_headers()
                self.wfile.write(cached_data)
                return
        
        # Serve file if exists
        if os.path.exists(full_path):
            self.send_response(200)
            content_type = self.get_content_type(path)
            self.send_header('Content-type', content_type)
            self.send_header('Content-Length', str(os.path.getsize(full_path)))
            self.end_headers()
            
            # Read and cache file
            with open(full_path, 'rb') as f:
                content = f.read()
                self.file_cache[cache_key] = (content, os.path.getmtime(full_path))
                self.wfile.write(content)
        else:
            self.send_response(404)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'404 - File Not Found')
            print(f"404: {original_path} -> {path}")

def get_local_ip():
    """Get local IP address"""
    try:
        # Try to get local IP by connecting to external DNS
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    """Threaded HTTP server for better performance"""
    daemon_threads = True

if __name__ == "__main__":
    os.chdir(DIRECTORY)
    
    # Create optimized server
    server_address = ('', PORT)
    httpd = ThreadedHTTPServer(server_address, OptimizedHTTPRequestHandler)
    
    local_ip = get_local_ip()
    
    print(f" Optimized Server running at:")
    print(f"  Local:   http://localhost:{PORT}")
    print(f"  Network: http://{local_ip}:{PORT}")
    print(f"  Files:   {os.path.abspath(DIRECTORY)}")

    
    try:
        # Start server with threaded requests
        server_thread = threading.Thread(target=httpd.serve_forever)
        server_thread.daemon = True
        server_thread.start()
        
        # Keep main thread alive
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Server stopped.")
        httpd.server_close()
