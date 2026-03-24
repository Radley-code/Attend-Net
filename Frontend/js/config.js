// Global configuration for AttendNet Frontend so it be accessible from any device on the network
// This file should be loaded before any other JavaScript files

// Detect if running on localhost or network
const CURRENT_HOST = window.location.hostname;
const CURRENT_PORT = window.location.port;

// Backend server configuration
const BACKEND_CONFIG = {
  // Auto-detect based on current page location
  // If on localhost, use localhost; otherwise use current host
  HOST:
    CURRENT_HOST === "localhost" || CURRENT_HOST === "127.0.0.1"
      ? "localhost"
      : CURRENT_HOST, // Use current host instead of hardcoded IP
  PORT: 3000,

  // Get the full backend URL
  get URL() {
    return `http://${this.HOST}:${this.PORT}`;
  },
};

// For backward compatibility, also provide BACKEND_URL variable
const BACKEND_URL = BACKEND_CONFIG.URL;

console.log(
  `[AttendNet Config] Backend URL: ${BACKEND_URL}, Current Host: ${CURRENT_HOST}`,
);
