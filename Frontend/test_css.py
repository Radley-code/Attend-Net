#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8081

class SimpleHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Remove query parameters
        path = self.path.lstrip('/')
        if '?' in path:
            path = path.split('?')[0]
        
        print(f"Request: {self.path} -> {path}")
        
        if os.path.exists(path):
            self.send_response(200)
            if path.endswith('.css'):
                self.send_header('Content-type', 'text/css')
            elif path.endswith('.html'):
                self.send_header('Content-type', 'text/html')
            self.end_headers()
            with open(path, 'rb') as f:
                self.wfile.write(f.read())
            print(f"200: {path}")
        else:
            self.send_response(404)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(b'404 - File Not Found')
            print(f"404: {path}")

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), SimpleHTTPRequestHandler) as httpd:
        print(f"Test server running at http://localhost:{PORT}")
        print("Try accessing: http://localhost:8081/css/student-registration.css?v=1.1")
        httpd.serve_forever()
