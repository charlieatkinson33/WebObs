# WebObs - Virtual Observations Machine

Internet-facing hosted observations system for displaying and sending patient vitals.

## Overview

WebObs is a web-based virtual observations machine that simulates a medical patient monitoring system. It allows you to input patient vitals through a control panel and display them on a patient monitor with realistic audio beeps for heart rate and SpO2.

## Features

- **Three-page interface**: Landing page, Control panel, and Display monitor
- **Comprehensive vitals monitoring**: Heart rate, SpO2, blood pressure, temperature, respiratory rate
- **Audio feedback**: Heart rate beeps synchronized to BPM and SpO2 beeps every 2 seconds
- **Real-time updates**: Display refreshes every second
- **Responsive design**: Works on desktop and mobile devices
- **No dependencies**: Pure HTML, CSS, and JavaScript

## Quick Start

1. Open `index.html` in a web browser
2. Click **Control** to access the vitals input panel
3. Enter patient vitals and any observations
4. Click **Send Vitals** to save
5. Return to the landing page and click **Display**
6. View the patient monitor with live vitals and audio beeps
7. Use the **Sounds On/Off** toggle to control audio

## Pages

### Landing Page (index.html)
Choose between Control and Display modes.

### Control Panel (control.html)
Input patient vitals:
- Heart Rate (BPM)
- SpO2 (%)
- Blood Pressure (Systolic/Diastolic mmHg)
- Temperature (°C)
- Respiratory Rate (breaths/min)
- Clinical observations/notes

### Patient Monitor (display.html)
Real-time display with:
- Color-coded vital signs cards
- Audio beeps for heart rate and SpO2
- Observations section
- Last updated timestamp

## Technical Details

- **Data Storage**: Uses browser localStorage for data transfer between pages
- **Audio**: Web Audio API for generating beep sounds
- **Refresh Rate**: Display updates every 1 second
- **Heart Rate Beeps**: Frequency matches actual BPM (60000ms / BPM)
- **SpO2 Beeps**: Fixed interval of 2 seconds

## Browser Compatibility

Works in all modern browsers that support:
- localStorage API
- Web Audio API
- ES6 JavaScript

## Deployment

Simply host all files on any web server or open `index.html` directly in a browser. No build process or server-side code required.

## Educational Use

This tool is designed for educational and demonstration purposes only. It is not intended for actual medical use.
