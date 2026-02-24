const axios = require("axios");
const { execSync } = require("child_process");
const os = require("os");

async function getMacFromRouter(ip) {
  try {
    // For localhost, we can't get MAC from router
    if (ip === "127.0.0.1") {
      console.log("Cannot detect MAC for localhost IP");
      return null;
    }

    // First, try Windows ARP cache (fastest and most reliable)
    console.log(`Attempting to fetch MAC for IP: ${ip} from ARP cache...`);
    const macFromArp = getMacFromArpCache(ip);
    if (macFromArp) {
      console.log(`Found MAC via ARP cache: ${macFromArp}`);
      return macFromArp;
    }

    console.log(
      "MAC not found in ARP cache. Device may not have communicated with this network yet.",
    );
    console.log(
      "User will need to enter MAC address manually or trigger network communication first.",
    );
    return null;
  } catch (err) {
    console.log("MAC detection error:", err.message);
    return null;
  }
}

// Get MAC address from Windows ARP cache
function getMacFromArpCache(ip) {
  try {
    // Only works on Windows
    if (os.platform() !== "win32") {
      console.log("ARP lookup only supported on Windows");
      return null;
    }

    // Execute arp -a command and search for the IP
    const arpOutput = execSync("arp -a", { encoding: "utf-8" });
    const lines = arpOutput.split("\n");

    for (const line of lines) {
      // ARP output format: IP    Physical Address      Type
      // Example: 192.168.1.100 aa-bb-cc-dd-ee-ff     dynamic

      if (line.includes(ip)) {
        // Extract MAC address (format: aa-bb-cc-dd-ee-ff)
        const macMatch = line.match(/([0-9a-f]{2}[-:]){5}([0-9a-f]{2})/i);
        if (macMatch) {
          // Convert dashes to colons for consistency
          const mac = macMatch[0].replace(/-/g, ":");
          console.log(`Found MAC in ARP table: ${mac}`);
          return mac.toUpperCase();
        }
      }
    }

    console.log(`IP ${ip} not found in ARP cache`);
    return null;
  } catch (err) {
    console.log(`ARP lookup failed: ${err.message}`);
    return null;
  }
}

module.exports = getMacFromRouter;
