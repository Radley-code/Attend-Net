#!/usr/bin/env python3
import http.server
import socket
import os
import sys

PORT = 8080
DIRECTORY = "."

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # Set proper MIME types for SVG files
        if self.path.endswith('.svg'):
            self.send_header('Content-Type', 'image/svg+xml')
        elif self.path.endswith('.ico'):
            self.send_header('Content-Type', 'image/x-icon')
        elif self.path.endswith('.json'):
            self.send_header('Content-Type', 'application/json')
        super().end_headers()

    def do_GET(self):
        # Handle specific icon requests to prevent 404s by redirecting to SVG
        original_path = self.path
        if self.path == '/favicon.ico':
            self.path = '/favicon.svg'
        elif self.path == '/apple-touch-icon.png':
            self.path = '/apple-touch-icon.svg'
        elif self.path == '/apple-touch-icon-precomposed.png':
            self.path = '/apple-touch-icon.svg'
        elif self.path == '/apple-touch-icon-120x120.png':
            self.path = '/apple-touch-icon-120x120.svg'
        elif self.path == '/apple-touch-icon-120x120-precomposed.png':
            self.path = '/apple-touch-icon-120x120.svg'
        elif self.path == '/apple-touch-icon-152x152.png':
            self.path = '/apple-touch-icon-152x152.svg'
        elif self.path == '/apple-touch-icon-167x167.png':
            self.path = '/apple-touch-icon-167x167.svg'
        elif self.path == '/apple-touch-icon-180x180.png':
            self.path = '/apple-touch-icon-180x180.svg'
        
        # Get the path
        path = self.path.lstrip('/')
        
        # Default to index.html
        if path == '' or path == '/':
            path = 'index.html'
        
        # Add .html extension if missing and file exists
        if not path.endswith(('.html', '.css', '.js', '.png', '.jpg', '.ico', '.svg')):
            if os.path.exists(path + '.html'):
                path = path + '.html'
        
        # Serve the file
        if os.path.exists(path):
            self.send_response(200)
            content_type = self.get_content_type(path)
            self.send_header('Content-type', content_type)
            self.end_headers()
            with open(path, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'404 - File Not Found')
            print(f"404: {original_path} -> {path}")
        
    def get_content_type(self, path):
        if path.endswith('.html'):
            return 'text/html'
        elif path.endswith('.css'):
            return 'text/css'
        elif path.endswith('.js'):
            return 'application/javascript'
        elif path.endswith('.svg'):
            return 'image/svg+xml'
        elif path.endswith(('.png', '.jpg', '.jpeg')):
            return 'image/' + path.split('.')[-1]
        else:
            return 'text/plain'

def get_local_ip():
        try:
                # Connect to Google DNS to get local IP
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))
                ip = s.getsockname()[0]
                s.close()
                return ip
        except:
                return "127.0.0.1"

if __name__ == "__main__":
        os.chdir(DIRECTORY)
        
        # Create server
        server_address = ('', PORT)
        httpd = http.server.HTTPServer(server_address, MyHTTPRequestHandler)
        
        local_ip = get_local_ip()
        
        print(f"Server running at:") #shows server running
        print(f"  Local:   http://localhost:{PORT}")
        print(f"  Network: http://{local_ip}:{PORT}") # port which the server is running on
        print(f"  Files:   {os.path.abspath(DIRECTORY)}") #absolute from local machine
        print("\nPress Ctrl+C to stop the server")
        
        try:
                httpd.serve_forever()
        except KeyboardInterrupt:
                print("\nServer stopped.")
                httpd.server_close() #to shut down the server
