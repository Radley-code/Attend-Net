#!/usr/bin/env python3
"""
Installation script for network interface detection dependencies
Run this if you want better network interface detection
"""

import subprocess
import sys

def install_package(package):
    """Install a Python package"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✅ Successfully installed {package}")
        return True
    except subprocess.CalledProcessError:
        print(f"❌ Failed to install {package}")
        return False

def main():
    print("🔧 Installing network interface detection dependencies...")
    print("This will help the server detect all available network interfaces")
    print("Optional - server will work without this, but with limited network detection")
    print()
    
    # Try to install netifaces
    if install_package("netifaces"):
        print("\n✅ Network interface detection is now enhanced!")
        print("🌐 The server will now detect all network interfaces automatically")
    else:
        print("\n⚠️  Could not install netifaces")
        print("🔧 Server will still work with basic network detection")
    
    print("\n🚀 You can now run: python server_optimized.py")

if __name__ == "__main__":
    main()
