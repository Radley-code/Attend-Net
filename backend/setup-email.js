#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 AttendNet Email Service Setup');
console.log('================================');

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('📋 Creating .env file from template...');
  
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully!');
  } else {
    console.log('❌ .env.example file not found!');
    process.exit(1);
  }
} else {
  console.log('✅ .env file already exists');
}

console.log('\n📧 Email Configuration Instructions:');
console.log('=====================================');
console.log('1. Open the .env file in the backend directory');
console.log('2. Configure your Gmail SMTP settings:');
console.log('   - EMAIL_USER: Your Gmail address');
console.log('   - EMAIL_PASS: Your Gmail app password');
console.log('');
console.log('🔑 How to get Gmail App Password:');
console.log('=====================================');
console.log('1. Enable 2-Factor Authentication on your Gmail account');
console.log('2. Go to: https://myaccount.google.com/');
console.log('3. Click on "Security" tab');
console.log('4. Scroll down to "Signing in to Google" section');
console.log('5. Click on "App Passwords"');
console.log('6. Select "Mail" and "Other (Custom name)"');
console.log('7. Enter "AttendNet" as the app name');
console.log('8. Copy the 16-character password generated');
console.log('9. Use this password in your .env file as EMAIL_PASS');
console.log('');
console.log('⚠️  Important Notes:');
console.log('==================');
console.log('- Never share your app password');
console.log('- This password is different from your regular Gmail password');
console.log('- Keep your .env file secure and never commit it to git');
console.log('- You can revoke app passwords anytime from your Google account');
console.log('');
console.log('📧 Testing Email Service:');
console.log('========================');
console.log('After configuration, you can test the email service by:');
console.log('1. Starting the backend server: npm start');
console.log('2. Using the "Preview Email" button in the coordinator dashboard');
console.log('3. Using the "Send Email" button to send test emails');
console.log('');
console.log('🎯 Features Available:');
console.log('===================');
console.log('✅ Real-time attendance notifications (students)');
console.log('✅ Weekly attendance summaries (students & coordinators)');
console.log('✅ Low attendance alerts (< 50%)');
console.log('✅ Session creation notifications');
console.log('✅ End-of-session PDF summaries (coordinators)');
console.log('✅ Department-based filtering');
console.log('✅ Email preferences management');
console.log('✅ Email preview functionality');
console.log('✅ Comprehensive email logging');
console.log('');
console.log('📅 Automated Schedule:');
console.log('======================');
console.log('Weekly summaries are automatically sent every Sunday at 9:00 AM UTC');
console.log('');
console.log('🔧 Configuration Complete!');
console.log('===========================');
console.log('Your email service is now configured and ready to use!');
console.log('');
console.log('Next steps:');
console.log('1. Update your .env file with your Gmail credentials');
console.log('2. Restart the backend server');
console.log('3. Test the email functionality from the dashboard');
console.log('');
console.log('For support, check the email logs in the database or console output.');
