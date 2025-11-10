// Display page JavaScript
let audioEnabled = true;
let heartRateInterval;
let spo2Interval;
let audioContext;
let heartRateBeepCount = 0;
let peer;
let connection;
let useLocalMode = false;
let peerAvailable = false;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize audio context
    initAudioContext();
    
    // Check if PeerJS is available
    if (typeof Peer !== 'undefined') {
        peerAvailable = true;
    } else {
        console.warn('PeerJS library not loaded. Internet mode unavailable.');
        // Hide internet connection option if PeerJS not available
        const internetOption = document.querySelector('.connection-option:first-child');
        if (internetOption) {
            internetOption.style.display = 'none';
        }
        const divider = document.querySelector('.connection-divider');
        if (divider) {
            divider.style.display = 'none';
        }
    }
    
    // Set up audio toggle
    const toggleAudioBtn = document.getElementById('toggleAudio');
    toggleAudioBtn.addEventListener('click', toggleAudio);
    
    // Set up connection buttons
    const connectBtn = document.getElementById('connectBtn');
    const localModeBtn = document.getElementById('localModeBtn');
    const sessionIdInput = document.getElementById('sessionIdInput');
    
    connectBtn.addEventListener('click', function() {
        if (!peerAvailable) {
            showConnectionStatus('PeerJS library not loaded. Please use Local Mode.', 'error');
            return;
        }
        const sessionId = sessionIdInput.value.trim();
        if (sessionId) {
            connectToSession(sessionId);
        } else {
            showConnectionStatus('Please enter a Session ID', 'error');
        }
    });
    
    localModeBtn.addEventListener('click', function() {
        useLocalMode = true;
        showMonitorDisplay();
        // Load and display vitals data from localStorage
        loadVitalsData();
        // Set up periodic refresh for local mode
        setInterval(loadVitalsData, 1000);
    });
    
    // Allow Enter key to connect
    sessionIdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            connectBtn.click();
        }
    });
});

function initAudioContext() {
    // Create audio context (will be started on user interaction)
    if (window.AudioContext || window.webkitAudioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function connectToSession(sessionId) {
    showConnectionStatus('Connecting...', 'info');
    
    // Create peer connection
    peer = new Peer({
        debug: 0
    });
    
    peer.on('open', function(id) {
        console.log('Peer opened with ID:', id);
        
        // Connect to the control session
        connection = peer.connect(sessionId);
        
        connection.on('open', function() {
            console.log('Connected to control session');
            showConnectionStatus('Connected to control session!', 'success');
            setTimeout(showMonitorDisplay, 1000);
        });
        
        connection.on('data', function(data) {
            console.log('Received data:', data);
            updateVitalsDisplay(data);
        });
        
        connection.on('close', function() {
            console.log('Connection closed');
            updateConnectionIndicator(false);
        });
        
        connection.on('error', function(err) {
            console.error('Connection error:', err);
            showConnectionStatus('Connection error: ' + err.type, 'error');
        });
    });
    
    peer.on('error', function(err) {
        console.error('Peer error:', err);
        let errorMsg = 'Connection failed';
        if (err.type === 'peer-unavailable') {
            errorMsg = 'Session ID not found. Please check and try again.';
        } else if (err.type === 'network') {
            errorMsg = 'Network error. Please check your internet connection.';
        }
        showConnectionStatus(errorMsg, 'error');
    });
}

function showConnectionStatus(message, type) {
    const statusDiv = document.getElementById('connectionStatus');
    statusDiv.textContent = message;
    statusDiv.className = 'connection-status ' + type;
}

function showMonitorDisplay() {
    document.getElementById('sessionConnect').style.display = 'none';
    document.getElementById('monitorDisplay').style.display = 'block';
    updateConnectionIndicator(true);
}

function updateConnectionIndicator(connected) {
    const indicator = document.getElementById('connectionIndicator');
    const text = document.getElementById('connectionText');
    
    if (connected) {
        indicator.className = 'indicator-dot connected';
        text.textContent = useLocalMode ? 'Local Mode' : 'Connected';
    } else {
        indicator.className = 'indicator-dot disconnected';
        text.textContent = 'Disconnected';
    }
}

function updateVitalsDisplay(vitalsData) {
    // Update display values
    document.getElementById('hrValue').textContent = vitalsData.heartRate;
    document.getElementById('spo2Value').textContent = vitalsData.spo2;
    document.getElementById('bpValue').textContent = `${vitalsData.bloodPressureSys}/${vitalsData.bloodPressureDia}`;
    document.getElementById('tempValue').textContent = vitalsData.temperature;
    document.getElementById('rrValue').textContent = vitalsData.respiratoryRate;
    
    // Update observations
    const observationsContent = document.getElementById('observationsContent');
    if (vitalsData.observations && vitalsData.observations.trim() !== '') {
        observationsContent.innerHTML = `<p>${vitalsData.observations}</p>`;
    } else {
        observationsContent.innerHTML = '<p class="no-data">No observations recorded</p>';
    }
    
    // Update timestamp
    const timestamp = new Date(vitalsData.timestamp);
    document.getElementById('timestamp').textContent = `Last updated: ${timestamp.toLocaleString()}`;
    
    // Start beeping sounds if audio is enabled
    if (audioEnabled && audioContext) {
        startHeartRateBeep(parseInt(vitalsData.heartRate));
        startSpo2Beep(parseInt(vitalsData.spo2));
    }
}

function loadVitalsData() {
    // This function is used for local mode only
    if (!useLocalMode) {
        return;
    }
    
    const vitalsDataString = localStorage.getItem('vitalsData');
    
    if (!vitalsDataString) {
        return;
    }
    
    const vitalsData = JSON.parse(vitalsDataString);
    updateVitalsDisplay(vitalsData);
}

function startHeartRateBeep(bpm) {
    // Clear existing interval
    if (heartRateInterval) {
        clearInterval(heartRateInterval);
    }
    
    // Don't beep if heart rate is 0 or invalid
    if (!bpm || bpm <= 0) {
        return;
    }
    
    // Calculate interval in milliseconds (60000ms per minute / BPM)
    const interval = 60000 / bpm;
    
    // Play initial beep
    playHeartRateBeep();
    
    // Set up repeating beep
    heartRateInterval = setInterval(function() {
        playHeartRateBeep();
    }, interval);
}

function startSpo2Beep(spo2Value) {
    // Clear existing interval
    if (spo2Interval) {
        clearInterval(spo2Interval);
    }
    
    // Don't beep if SpO2 is 0 or invalid
    if (!spo2Value || spo2Value <= 0) {
        return;
    }
    
    // SpO2 beeps every 2 seconds
    playSpo2Beep();
    
    spo2Interval = setInterval(function() {
        playSpo2Beep();
    }, 2000);
}

function playHeartRateBeep() {
    if (!audioEnabled || !audioContext) {
        return;
    }
    
    // Resume audio context if needed (browsers require user interaction)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    // Create oscillator for heart rate beep (lower pitch)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Heart rate beep: 800 Hz, short duration
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    // Volume envelope
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function playSpo2Beep() {
    if (!audioEnabled || !audioContext) {
        return;
    }
    
    // Resume audio context if needed
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    // Create oscillator for SpO2 beep (higher pitch)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // SpO2 beep: 1200 Hz, medium duration
    oscillator.frequency.value = 1200;
    oscillator.type = 'sine';
    
    // Volume envelope
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
}

function toggleAudio() {
    audioEnabled = !audioEnabled;
    
    const audioIcon = document.getElementById('audioIcon');
    const audioText = document.getElementById('audioText');
    const audioBtn = document.getElementById('toggleAudio');
    
    if (audioEnabled) {
        audioIcon.textContent = '🔊';
        audioText.textContent = 'Sounds On';
        audioBtn.classList.remove('muted');
        
        // Resume audio context and restart beeps
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Reload vitals to restart beeps
        if (useLocalMode) {
            loadVitalsData();
        }
    } else {
        audioIcon.textContent = '🔇';
        audioText.textContent = 'Sounds Off';
        audioBtn.classList.add('muted');
        
        // Stop all beeps
        if (heartRateInterval) {
            clearInterval(heartRateInterval);
        }
        if (spo2Interval) {
            clearInterval(spo2Interval);
        }
    }
}
