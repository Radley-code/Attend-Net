# AttendNet - Student Attendance System

A modern, web-based attendance tracking system that uses MAC address detection for automated student attendance monitoring. AttendNet provides coordinators with real-time session management and comprehensive reporting capabilities.

## 🚀 Features

### For Students
- **Device-Based Registration**: Register once using your personal device (laptop, tablet, or phone)
- **MAC Address Tracking**: Automatic attendance detection through device MAC addresses
- **Department Organization**: Students are organized by academic departments
- **Dark/Light Theme**: Toggle between light and dark themes for comfortable viewing

### For Coordinators
- **Session Management**: Create and manage attendance sessions with specific time windows
- **Real-Time Monitoring**: Live attendance tracking during active sessions
- **Department Filtering**: Target specific departments for attendance tracking
- **Comprehensive Reports**: View detailed attendance statistics and export reports
- **Automated Scanning**: Configurable interval-based or manual attendance scanning
- **Mobile Responsive**: Full functionality on desktop and mobile devices

### Technical Features
- **Socket.io Integration**: Real-time updates for live attendance monitoring
- **JWT Authentication**: Secure coordinator login and session management
- **MongoDB Database**: Scalable data storage for users, sessions, and attendance records
- **Network Detection**: Automatic MAC address detection from network devices
- **Cross-Platform**: Works on localhost and network deployments

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **Socket.io** for real-time communication
- **JWT** for authentication
- **bcryptjs** for password hashing
- **cors** for cross-origin requests

### Frontend
- **HTML5** with semantic markup
- **CSS3** with custom animations and themes
- **Vanilla JavaScript** (no framework dependencies)
- **Bootstrap 5** for responsive design
- **Font Awesome** for icons
- **SweetAlert2** for beautiful alerts

## 📁 Project Structure

```
Attend-Net/
├── backend/
│   ├── controllers/          # Business logic handlers
│   │   ├── attendanceControllers.js
│   │   ├── sessionControllers.js
│   │   └── userController.js
│   ├── middleware/           # Authentication and validation
│   │   └── auth.js
│   ├── models/              # MongoDB schemas
│   │   ├── User.js          # Student model
│   │   ├── Session.js       # Attendance session model
│   │   ├── Attendance.js    # Attendance record model
│   │   └── coordinator.js   # Coordinator model
│   ├── routes/              # API endpoints
│   │   ├── userRoutes.js
│   │   ├── sessionRoutes.js
│   │   ├── attendanceRoutes.js
│   │   └── loginRoutes.js
│   ├── utils/               # Utility functions
│   │   ├── socket.js        # Socket.io configuration
│   │   └── sessionScheduler.js
│   ├── helpers/             # Helper modules
│   │   └── getMacFromRouter.js
│   ├── .env                 # Environment variables
│   ├── package.json
│   └── server.js            # Main server file
├── Frontend/
│   ├── css/                 # Stylesheets
│   │   ├── styles.css
│   │   ├── dashboard-styles.css
│   │   ├── student-registration.css
│   │   └── dark-theme.css
│   ├── js/                  # JavaScript modules
│   │   ├── config.js        # Backend configuration
│   │   ├── dashboard.js     # Coordinator dashboard
│   │   ├── student_registration.js
│   │   └── login.js
│   ├── index.html           # Landing page
│   ├── coordinator_dashboard.html
│   ├── student_registration.html
│   ├── login.html
│   └── studentpage.html
├── package.json             # Root dependencies
└── README.md
```

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- Git

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Attend-Net
```

### 2. Install Dependencies
run the python file

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Return to root directory
cd ..
```

### 3. Environment Configuration
Create a `.env` file in the `backend/` directory:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/attendnet

# Server Configuration
PORT=3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# Network Configuration (optional)
NETWORK_IP=192.168.1.101
```

### 4. Start the Application

#### Backend Server
```bash
cd backend
node server.js
```
The backend will start on `http://localhost:3000`

#### Frontend
The frontend can be served in multiple ways:

**Option 1: Using Python's built-in server**
```bash
cd Frontend
python install_network_deps.py (to install indepedencies)
python serve.py (to start the server)
```

**Option 2: Using Node.js serve package**
```bash
cd Frontend
npx serve -s . -l 8080 (was removed due to dependency issues)
```

**Option 3: Using Live Server extension in VS Code**
- Right-click on `index.html` and select "Open with Live Server"

The frontend will be available at `http://localhost:8080`

## 🔧 Configuration

### Network Setup
The application is configured to work on both localhost and network environments:

- **Local Development**: Uses `localhost:3000` for backend
- **Network Deployment**: Uses `192.168.1.101:3000` (configurable in `Frontend/js/config.js`)

### MAC Address Detection
The system uses network-based MAC address detection. Ensure:
- Students and the server are on the same network
- Network administrator permissions for MAC address scanning
- Proper firewall configuration for network access

## 📖 Usage Guide

### For Students

1. **Registration**
   - Navigate to the AttendNet landing page
   - Click "Student Registration"
   - Fill in your details (name, email, department)
   - **Important**: Use the device you'll use daily for attendance
   - Submit the form - your MAC address will be automatically detected

2. **Attendance**
   - Ensure your device is connected to the network
   - Attendance is automatically tracked when sessions are active
   - No manual action required during attendance periods

### For Coordinators

1. **Login**
   - Navigate to the AttendNet landing page
   - Click "Coordinator Login"
   - Enter your credentials (contact admin for account setup)

2. **Creating Sessions**
   - From the dashboard, go to "Sessions" tab
   - Click "Create New Session"
   - Fill in session details:
     - Course name
     - Date and time window
     - Target departments
     - Scanning interval (minutes)
   - Save the session

3. **Monitoring Attendance**
   - Active sessions show real-time attendance
   - View present/absent students
   - Manual scan option for immediate updates
   - Automatic scanning based on configured intervals

4. **Reports**
   - Access comprehensive attendance reports
   - Filter by date, course, or department
   - Export attendance data
   - View attendance statistics and trends

## 🔐 Authentication & Security

### Coordinator Authentication
- JWT-based authentication system
- Secure password hashing with bcryptjs
- Session-based login management
- Protected API routes for sensitive operations

### Data Protection
- MAC addresses are stored securely
- Email uniqueness validation
- Department-based access control
- CORS configuration for API security

## 🌐 API Endpoints

### User Management
- `POST /api/users/register` - Register new student
- `GET /api/users/departments` - Get all departments
- `GET /api/users/detect-mac` - Detect client MAC address

### Session Management
- `POST /api/sessions/create` - Create new session (protected)
- `GET /api/sessions/mine` - Get coordinator's sessions (protected)

### Attendance
- `POST /api/attendance/mark` - Mark attendance (protected)
- `GET /api/attendance/session/:id` - Get session attendance (protected)

### Authentication
- `POST /api/coordinator/login` - Coordinator login
- `POST /api/coordinator/register` - Register new coordinator

### Session Summary
- `POST /api/session-summary/create` - Create session summary (protected)
- `GET /api/session-summary/session/:id` - Get session summary (protected)


## 🔧 Troubleshooting

### Common Issues

1. **MAC Address Detection Fails**
   - Ensure devices are on the same network
   - Check network permissions
   - Verify router configuration for MAC address access

2. **Database Connection Issues**
   - Verify MongoDB is running
   - Check connection string in `.env` file
   - Ensure MongoDB credentials are correct

3. **CORS Errors**
   - Verify frontend URL is in CORS whitelist
   - Check backend CORS configuration in `server.js`

4. **Socket.io Connection Issues**
   - Ensure both frontend and backend are running
   - Check network connectivity
   - Verify firewall settings

### Debug Mode
Enable debug logging by setting:
```env
DEBUG=attendnet:*
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the package.json file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team(check out the link in bio)
- Check the troubleshooting section above

---

**AttendNet** - Making attendance tracking simple, reliable, and efficient.
