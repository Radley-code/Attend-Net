const express = require("express");
const cors = require("cors");

const app = express();

// Enable CORS for all origins
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

// Simple test route
app.get("/", (req, res) => {
  res.json({
    message: "Backend is running",
    timestamp: new Date().toISOString(),
    ip: req.ip || req.connection.remoteAddress,
  });
});

// Import user routes
const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

const PORT = 3000;
const HOST = "0.0.0.0"; // Listen on all interfaces

app.listen(PORT, HOST, () => {
  console.log(`🚀 Backend running on http://${HOST}:${PORT}`);
  console.log(`📍 Local access: http://localhost:${PORT}`);
  console.log(`🌐 Network access: http://192.168.1.101:${PORT}`);
  console.log(`✅ CORS enabled for all origins`);
  console.log(`📝 Test with: http://192.168.1.101:${PORT}/`);
});
