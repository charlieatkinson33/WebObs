# WebObs - Virtual Observations Machine

Internet-facing hosted observations system for displaying and sending patient vitals across different networks.

## Overview

WebObs is a web-based virtual observations machine that simulates a medical patient monitoring system. It allows you to input patient vitals through a control panel and display them on a patient monitor with realistic audio beeps for heart rate and SpO2. **Now with internet connectivity** - control and display can be on completely different machines and networks!

## Features

- **Three-page interface**: Landing page, Control panel, and Display monitor
- **🌐 Internet Session Support**: Connect control and display across different networks using session IDs
- **Peer-to-Peer Communication**: Uses WebRTC for real-time data transmission
- **Professional Monitor Display**: Display looks like an actual OBS patient monitor with glowing indicators
- **Comprehensive vitals monitoring**: Heart rate, SpO2, blood pressure, temperature, respiratory rate
- **Audio feedback**: Heart rate beeps synchronized to BPM and SpO2 beeps every 2 seconds
- **Real-time updates**: Display updates instantly when vitals are sent
- **Responsive design**: Works on desktop and mobile devices
- **Backwards compatible**: Still supports local mode using localStorage

## Quick Start

### Internet Mode (Recommended)

1. **On the Control Device**:
   - Open `index.html` in a web browser
   - Click **Control**
   - Note the Session ID displayed at the top
   - Share this Session ID with the display device
   - Enter patient vitals and click **Send Vitals**

2. **On the Display Device** (can be anywhere with internet):
   - Open `index.html` in a web browser
   - Click **Display**
   - Enter the Session ID from the control device
   - Click **Connect**
   - View the patient monitor with live vitals and audio beeps

### Local Mode (Same Browser)

1. Open `index.html` in a web browser
2. Click **Control** to access the vitals input panel
3. Enter patient vitals and click **Send Vitals**
4. Return to the landing page and click **Display**
5. Click **Use Local Mode**
6. View the patient monitor with live vitals

## Pages

### Landing Page (index.html)
Choose between Control and Display modes.

### Control Panel (control.html)
- Generates a unique Session ID for internet connectivity
- Shows connection status (number of connected displays)
- Input patient vitals:
  - Heart Rate (BPM)
  - SpO2 (%)
  - Blood Pressure (Systolic/Diastolic mmHg)
  - Temperature (°C)
  - Respiratory Rate (breaths/min)
  - Clinical observations/notes
- Copy Session ID to clipboard with one click

### Patient Monitor (display.html)
- Professional OBS-style display with glowing indicators
- Two connection modes:
  - **Internet Mode**: Connect via Session ID (works across networks)
  - **Local Mode**: Use localStorage (same browser only)
- Real-time display with:
  - Color-coded vital signs with monitor-style glow effects
  - Connection status indicator
  - Audio beeps for heart rate and SpO2
  - Observations section
  - Last updated timestamp
- Toggle sounds on/off

## Technical Details

- **Network Communication**: Uses PeerJS (WebRTC) for peer-to-peer connections
- **Signaling Server**: Uses free public PeerJS cloud server (no setup required)
- **Data Storage**: localStorage for backwards compatibility
- **Audio**: Web Audio API for generating beep sounds
- **Heart Rate Beeps**: Frequency matches actual BPM (60000ms / BPM)
- **SpO2 Beeps**: Fixed interval of 2 seconds
- **Session IDs**: Automatically generated unique identifiers (format: `webobs-XXXXXXXXX`)

## Browser Compatibility

Works in all modern browsers that support:
- localStorage API
- Web Audio API
- WebRTC (for internet mode)
- ES6 JavaScript

**Note**: Internet mode requires the PeerJS library to be loaded from a CDN. If you have ad blockers or strict content security policies, you may need to whitelist `cdn.jsdelivr.net` or download the PeerJS library locally.

## Deployment

### Simple Deployment (No Server Required)
Simply open `index.html` directly in a browser or host all files on any static web server.

### Web Hosting
Upload all files to any web hosting service:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting provider

No build process or server-side code required!

## How It Works

### Internet Mode
1. Control page creates a PeerJS peer with a unique Session ID
2. Display page connects to that peer using the Session ID
3. When vitals are submitted, data is sent directly to all connected displays via WebRTC
4. Connection works across different networks, even behind NAT/firewalls

### Local Mode
1. Control page stores vitals in browser localStorage
2. Display page reads from localStorage
3. Works only on the same browser/device

## Security Note

Data is transmitted peer-to-peer and not stored on any server. However, for actual medical use, additional security measures would be required. This tool is for educational and demonstration purposes only.

## Troubleshooting

### Internet Mode Not Available
If you see "PeerJS library not loaded" on the control page:
- Check that your browser can access `cdn.jsdelivr.net`
- Disable ad blockers or content blockers temporarily
- Check your network's firewall settings
- Try using a different browser
- As a fallback, use Local Mode (same browser/device only)

### Connection Issues
If the display cannot connect to a session ID:
- Verify the Session ID is correct (copy/paste recommended)
- Check that both devices have internet access
- Ensure WebRTC is not blocked by your firewall
- Try refreshing both pages and generating a new session

### Audio Not Playing
- Click the "Sounds On/Off" button to enable audio
- Some browsers require user interaction before playing audio
- Check your device's volume settings

## Educational Use

This tool is designed for educational and demonstration purposes only. It is not intended for actual medical use.
