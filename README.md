# WebObs - Virtual Observations Machine
Internet-facing hosted observations system for displaying and sending patient vitals across different networks.

**Link**: [https://charlieatkinson33.github.io/WebObs/](https://charlieatkinson33.github.io/WebObs/)

## Overview

WebObs is a web-based virtual observations machine that simulates a medical patient monitoring system. It allows you to input patient vitals through a control panel and display them on a patient monitor.

## Features

- **Internet/Local Session Support**: Run via the internet with sessionIDs or locally on one machine via local
- **Peer-to-Peer Communication**: Uses WebRTC for real-time data transmission
- **Professional Monitor Display**: Designed to roughly emulate a generic obs monitor
- **Comprehensive vitals monitoring**: Heart rate, SpO2, blood pressure, temperature, respiratory rate
- **Audio feedback**: Heart rate beeps synchronized to BPM and SpO2 beeps according to rate
- **Real-time updates**: Display updates instantly when vitals are sent
- **Responsive design**: Works on desktop and mobile devices with a responsive view for display

## Quick Start

### Using the Hosted Website (Easiest)

1. **On the Control Device**:
   - Visit [https://charlieatkinson33.github.io/WebObs/](https://charlieatkinson33.github.io/WebObs/)
   - Click **Control**
   - Note the Session ID displayed at the top
   - Share this Session ID with the display device
   - Enter patient vitals and click **Send Vitals**

2. **On the Display Device** (can be anywhere with internet):
   - Visit [https://charlieatkinson33.github.io/WebObs/](https://charlieatkinson33.github.io/WebObs/)
   - Click **Display**
   - Enter the Session ID from the control device
   - Click **Connect**
   - View the patient monitor with live vitals and audio beeps


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
  - **Local Mode**: Use localStorage (same browser only, mostly for testing)
- Toggle sounds on/off

## Technical Details

- **Network Communication**: Uses PeerJS (WebRTC) for peer-to-peer connections
- **Signaling Server**: Uses free public PeerJS cloud server
- **Audio**: Web Audio API for generating beep sounds
- **Heart Rate Beeps**: Frequency matches actual BPM (60000ms / BPM)
- **SpO2 Beeps**: Fixed interval of 2 seconds
- **Session IDs**: Automatically generated unique identifiers (format: `webobs-XXXXXXXXX`)

## Browser Compatibility

Works in all modern browsers that support
Thoroughly tested in chromium.

**Note**: Internet mode requires the PeerJS library to be loaded from a CDN. If you have ad blockers or strict content security policies, you may need to whitelist `cdn.jsdelivr.net` or download the PeerJS library locally.

## Planned Updates

- Different ECG traces - asystole, VF, VT ect
- Better audio
- Customisable display
- NIBP cycling

## Security Note

Data is transmitted peer-to-peer and not stored on any server. However, for actual medical use, additional security measures would be required. This tool is for educational and demonstration purposes only.

