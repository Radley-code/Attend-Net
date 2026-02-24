const User = require("../models/user");
const getMacFromRouter = require("../helpers/getMacFromRouter");
const registerStudent = async (req, res) => {
  try {
    console.log("registerStudent body:", req.body);
    const body = req.body || {};
    const { name, email, department } = body;

    const studentIP =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    console.log("Student IP:", studentIP);
    const macAddress = await getMacFromRouter(studentIP);
    console.log("Fetched MAC Address:", macAddress);

    // Basic validation
    if (!name || !email || !department || !macAddress) {
      return res.status(400).json({
        message: "Missing required fields: name, email, department, macAddress",
      });
    }

    // Check if user with the same email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User with this email already exists" });
    }

    const newUser = new User({ name, email, department, macAddress });
    await newUser.save();
    return res
      .status(201)
      .json({ message: "Student registered successfully", user: newUser });
  } catch (error) {
    console.error(
      "Error registering student:",
      error && error.stack ? error.stack : error,
    );
    // If headers already sent, just exit
    if (res.headersSent) return;
    return res
      .status(500)
      .json({ message: "Server error during registration" });
  }
};

const getAllDepartments = async (req, res) => {
  try {
    // Get all unique departments from registered students
    const departments = await User.distinct("department");

    if (!departments || departments.length === 0) {
      return res.status(200).json({ departments: [] });
    }

    return res.status(200).json({ departments: departments.sort() });
  } catch (error) {
    console.error("Error fetching departments:", error);
    if (res.headersSent) return;
    return res.status(500).json({ message: "Error fetching departments" });
  }
};

const detectMacAddress = async (req, res) => {
  try {
    // Get client IP with better handling for different scenarios
    let studentIP = req.headers["x-forwarded-for"] || 
                   req.socket.remoteAddress || 
                   req.connection.remoteAddress;
    
    // Handle IPv6 localhost (::1) and convert to IPv4 localhost
    if (studentIP === "::1" || studentIP === "::ffff:127.0.0.1") {
      studentIP = "127.0.0.1";
    }
    
    // Remove IPv6 prefix if present
    if (studentIP.startsWith("::ffff:")) {
      studentIP = studentIP.substring(7);
    }
    
    // TEST MODE: For localhost testing, simulate a real network IP
    if (studentIP === "127.0.0.1") {
      console.log("TEST MODE: Simulating network IP for localhost testing");
      studentIP = "192.168.1.100"; // Change this to an actual device IP on your network
    }
    
    console.log("Detecting MAC for IP:", studentIP);
    
    // For localhost IPs, we can't detect MAC from router
    if (studentIP === "127.0.0.1" || studentIP.startsWith("192.168.") || studentIP.startsWith("10.") || studentIP.startsWith("172.")) {
      // Try to get MAC from router for private network IPs
      const macAddress = await getMacFromRouter(studentIP);
      console.log("Fetched MAC Address:", macAddress);

      if (macAddress) {
        return res.status(200).json({ 
          success: true, 
          macAddress: macAddress,
          message: "MAC address detected successfully"
        });
      } else {
        return res.status(404).json({ 
          success: false, 
          message: "Unable to detect MAC address from router. Please ensure you're connected to the network and enter MAC address manually." 
        });
      }
    } else {
      return res.status(400).json({ 
        success: false, 
        message: "MAC address detection only works for private network connections. Please enter MAC address manually." 
      });
    }
  } catch (error) {
    console.error("Error detecting MAC address:", error);
    if (res.headersSent) return;
    return res.status(500).json({ 
      success: false, 
      message: "Server error while detecting MAC address" 
    });
  }
};

const debugRouterConnection = async (req, res) => {
  try {
    const axios = require("axios");
    const cheerio = require("cheerio");
    
    const possibleEndpoints = [
      "http://192.168.1.1/html/lan.html",
      "http://192.168.1.1/lan.html", 
      "http://192.168.1.1/station_info.html",
      "http://192.168.1.1/api/v1/station",
      "http://192.168.1.1/cgi-bin/luci/admin/network/hosts",
      "http://192.168.1.1/",
      "http://192.168.1.1/main.html"
    ];

    let debugInfo = {
      testIP: "192.168.1.100",
      endpoints: [],
      workingEndpoints: [],
      errors: []
    };

    // Test each endpoint
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}`);
        
        const response = await axios.get(endpoint, {
          auth: {
            username: "admin",
            password: "admin"
          },
          timeout: 5000,
          validateStatus: (status) => status < 500
        });
        
        const endpointInfo = {
          url: endpoint,
          status: response.status,
          statusText: response.statusText,
          dataLength: response.data.length,
          dataPreview: response.data.substring(0, 500),
          contentType: response.headers['content-type']
        };
        
        debugInfo.endpoints.push(endpointInfo);
        
        if (response.status === 200) {
          debugInfo.workingEndpoints.push(endpointInfo);
          
          // Try to parse for MAC addresses
          const $ = cheerio.load(response.data);
          const foundData = [];
          
          $("tr").each((i, row) => {
            const columns = $(row).find("td");
            if (columns.length >= 2) {
              const rowData = [];
              columns.each((j, col) => {
                rowData.push($(col).text().trim());
              });
              foundData.push(rowData);
            }
          });
          
          endpointInfo.tableData = foundData.slice(0, 5); // First 5 rows
        }
        
      } catch (err) {
        const errorInfo = {
          url: endpoint,
          error: err.message,
          code: err.code,
          status: err.response?.status
        };
        debugInfo.errors.push(errorInfo);
        debugInfo.endpoints.push(errorInfo);
        console.log(`Failed ${endpoint}: ${err.message}`);
      }
    }

    // Also test without authentication
    try {
      console.log("Testing without authentication...");
      const response = await axios.get("http://192.168.1.1/", {
        timeout: 3000,
        validateStatus: (status) => status < 500
      });
      
      debugInfo.noAuthTest = {
        status: response.status,
        statusText: response.statusText,
        dataLength: response.data.length,
        dataPreview: response.data.substring(0, 500)
      };
    } catch (err) {
      debugInfo.noAuthTest = {
        error: err.message,
        code: err.code
      };
    }

    return res.status(200).json({
      message: "Comprehensive debug information",
      debugInfo: debugInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Debug error:", error);
    return res.status(500).json({
      message: "Debug failed",
      error: error.message,
      stack: error.stack
    });
  }
};

module.exports = {
  registerStudent,
  getAllDepartments,
  detectMacAddress,
  debugRouterConnection,
};
