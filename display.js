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

// Waveform animation variables
let ecgCanvas, spo2Canvas, etco2Canvas;
let ecgCtx, spo2Ctx, etco2Ctx;
let ecgAnimationId, spo2AnimationId, etco2AnimationId;
let ecgOffset = 0;
let spo2Offset = 0;
let etco2Offset = 0;
let currentHeartRate = 75;

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
    
    // Initialize canvases
    initializeCanvases();
    // Start waveform animations
    startWaveformAnimations();
}

function initializeCanvases() {
    ecgCanvas = document.getElementById('ecgCanvas');
    spo2Canvas = document.getElementById('spo2Canvas');
    etco2Canvas = document.getElementById('etco2Canvas');
    
    if (ecgCanvas) ecgCtx = ecgCanvas.getContext('2d');
    if (spo2Canvas) spo2Ctx = spo2Canvas.getContext('2d');
    if (etco2Canvas) etco2Ctx = etco2Canvas.getContext('2d');
    
    // Set canvas dimensions to match display size
    function resizeCanvas(canvas) {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    
    resizeCanvas(ecgCanvas);
    resizeCanvas(spo2Canvas);
    resizeCanvas(etco2Canvas);
    
    // Handle window resize
    window.addEventListener('resize', function() {
        resizeCanvas(ecgCanvas);
        resizeCanvas(spo2Canvas);
        resizeCanvas(etco2Canvas);
    });
}

function startWaveformAnimations() {
    // Cancel any existing animations
    if (ecgAnimationId) cancelAnimationFrame(ecgAnimationId);
    if (spo2AnimationId) cancelAnimationFrame(spo2AnimationId);
    if (etco2AnimationId) cancelAnimationFrame(etco2AnimationId);
    
    // Start new animations
    animateECG();
    animateSpO2();
    animateEtCO2();
}

function animateECG() {
    if (!ecgCtx || !ecgCanvas) return;
    
    const width = ecgCanvas.width;
    const height = ecgCanvas.height;
    const centerY = height / 2;
    
    // Clear canvas
    ecgCtx.fillStyle = '#000';
    ecgCtx.fillRect(0, 0, width, height);
    
    // Draw grid
    ecgCtx.strokeStyle = '#0f0';
    ecgCtx.globalAlpha = 0.1;
    ecgCtx.lineWidth = 1;
    
    // Vertical grid lines
    for (let x = 0; x < width; x += 20) {
        ecgCtx.beginPath();
        ecgCtx.moveTo(x, 0);
        ecgCtx.lineTo(x, height);
        ecgCtx.stroke();
    }
    
    // Horizontal grid lines
    for (let y = 0; y < height; y += 20) {
        ecgCtx.beginPath();
        ecgCtx.moveTo(0, y);
        ecgCtx.lineTo(width, y);
        ecgCtx.stroke();
    }
    
    ecgCtx.globalAlpha = 1.0;
    
    // Draw ECG waveform
    ecgCtx.strokeStyle = '#0f0';
    ecgCtx.lineWidth = 2;
    ecgCtx.shadowBlur = 10;
    ecgCtx.shadowColor = '#0f0';
    ecgCtx.beginPath();
    
    const speed = 2;
    const beatsPerScreen = 3;
    const beatWidth = width / beatsPerScreen;
    
    for (let x = 0; x < width; x++) {
        const adjustedX = (x + ecgOffset) % beatWidth;
        const progress = adjustedX / beatWidth;
        
        let y = centerY;
        
        // ECG wave pattern (simplified)
        if (progress < 0.05) {
            // P wave
            y = centerY - Math.sin(progress / 0.05 * Math.PI) * 8;
        } else if (progress >= 0.15 && progress < 0.18) {
            // Q wave
            y = centerY + 5;
        } else if (progress >= 0.18 && progress < 0.22) {
            // R wave (peak)
            const rProgress = (progress - 0.18) / 0.04;
            y = centerY - Math.sin(rProgress * Math.PI) * 40;
        } else if (progress >= 0.22 && progress < 0.25) {
            // S wave
            y = centerY + 8;
        } else if (progress >= 0.35 && progress < 0.50) {
            // T wave
            const tProgress = (progress - 0.35) / 0.15;
            y = centerY - Math.sin(tProgress * Math.PI) * 12;
        }
        
        if (x === 0) {
            ecgCtx.moveTo(x, y);
        } else {
            ecgCtx.lineTo(x, y);
        }
    }
    
    ecgCtx.stroke();
    ecgCtx.shadowBlur = 0;
    
    ecgOffset += speed;
    if (ecgOffset >= beatWidth) {
        ecgOffset = 0;
    }
    
    ecgAnimationId = requestAnimationFrame(animateECG);
}

function animateSpO2() {
    if (!spo2Ctx || !spo2Canvas) return;
    
    const width = spo2Canvas.width;
    const height = spo2Canvas.height;
    const centerY = height / 2;
    
    // Clear canvas
    spo2Ctx.fillStyle = '#000';
    spo2Ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    spo2Ctx.strokeStyle = '#ff0';
    spo2Ctx.globalAlpha = 0.1;
    spo2Ctx.lineWidth = 1;
    
    for (let x = 0; x < width; x += 20) {
        spo2Ctx.beginPath();
        spo2Ctx.moveTo(x, 0);
        spo2Ctx.lineTo(x, height);
        spo2Ctx.stroke();
    }
    
    for (let y = 0; y < height; y += 20) {
        spo2Ctx.beginPath();
        spo2Ctx.moveTo(0, y);
        spo2Ctx.lineTo(width, y);
        spo2Ctx.stroke();
    }
    
    spo2Ctx.globalAlpha = 1.0;
    
    // Draw SpO2 plethysmograph waveform
    spo2Ctx.strokeStyle = '#ff0';
    spo2Ctx.lineWidth = 2;
    spo2Ctx.shadowBlur = 10;
    spo2Ctx.shadowColor = '#ff0';
    spo2Ctx.beginPath();
    
    const speed = 2;
    const beatsPerScreen = 3;
    const beatWidth = width / beatsPerScreen;
    
    for (let x = 0; x < width; x++) {
        const adjustedX = (x + spo2Offset) % beatWidth;
        const progress = adjustedX / beatWidth;
        
        let y = centerY + 20; // Baseline lower
        
        // Plethysmograph wave (smooth pulse wave)
        if (progress >= 0.1 && progress < 0.5) {
            const pulseProgress = (progress - 0.1) / 0.4;
            // Sharp rise, slower fall
            if (pulseProgress < 0.3) {
                y = centerY + 20 - Math.sin(pulseProgress / 0.3 * Math.PI / 2) * 35;
            } else {
                y = centerY + 20 - Math.cos((pulseProgress - 0.3) / 0.7 * Math.PI / 2) * 35;
            }
        }
        
        if (x === 0) {
            spo2Ctx.moveTo(x, y);
        } else {
            spo2Ctx.lineTo(x, y);
        }
    }
    
    spo2Ctx.stroke();
    spo2Ctx.shadowBlur = 0;
    
    spo2Offset += speed;
    if (spo2Offset >= beatWidth) {
        spo2Offset = 0;
    }
    
    spo2AnimationId = requestAnimationFrame(animateSpO2);
}

function animateEtCO2() {
    if (!etco2Ctx || !etco2Canvas) return;
    
    const width = etco2Canvas.width;
    const height = etco2Canvas.height;
    const centerY = height / 2;
    
    // Clear canvas
    etco2Ctx.fillStyle = '#000';
    etco2Ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    etco2Ctx.strokeStyle = '#fff';
    etco2Ctx.globalAlpha = 0.1;
    etco2Ctx.lineWidth = 1;
    
    for (let x = 0; x < width; x += 20) {
        etco2Ctx.beginPath();
        etco2Ctx.moveTo(x, 0);
        etco2Ctx.lineTo(x, height);
        etco2Ctx.stroke();
    }
    
    for (let y = 0; y < height; y += 20) {
        etco2Ctx.beginPath();
        etco2Ctx.moveTo(0, y);
        etco2Ctx.lineTo(width, y);
        etco2Ctx.stroke();
    }
    
    etco2Ctx.globalAlpha = 1.0;
    
    // Draw EtCO2 capnography waveform
    etco2Ctx.strokeStyle = '#fff';
    etco2Ctx.lineWidth = 2;
    etco2Ctx.shadowBlur = 10;
    etco2Ctx.shadowColor = '#fff';
    etco2Ctx.beginPath();
    
    const speed = 1.5;
    const breathsPerScreen = 2;
    const breathWidth = width / breathsPerScreen;
    
    for (let x = 0; x < width; x++) {
        const adjustedX = (x + etco2Offset) % breathWidth;
        const progress = adjustedX / breathWidth;
        
        let y = centerY + 30; // Baseline
        
        // Capnography wave (square wave with rounded edges)
        if (progress >= 0.1 && progress < 0.15) {
            // Inspiration (rapid rise)
            const riseProgress = (progress - 0.1) / 0.05;
            y = centerY + 30 - riseProgress * 40;
        } else if (progress >= 0.15 && progress < 0.5) {
            // Plateau (alveolar)
            y = centerY - 10;
        } else if (progress >= 0.5 && progress < 0.55) {
            // Expiration (rapid fall)
            const fallProgress = (progress - 0.5) / 0.05;
            y = centerY - 10 + fallProgress * 40;
        }
        
        if (x === 0) {
            etco2Ctx.moveTo(x, y);
        } else {
            etco2Ctx.lineTo(x, y);
        }
    }
    
    etco2Ctx.stroke();
    etco2Ctx.shadowBlur = 0;
    
    etco2Offset += speed;
    if (etco2Offset >= breathWidth) {
        etco2Offset = 0;
    }
    
    etco2AnimationId = requestAnimationFrame(animateEtCO2);
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
    document.getElementById('rrValue').textContent = vitalsData.respiratoryRate;
    
    // Store heart rate for waveform animation
    currentHeartRate = parseInt(vitalsData.heartRate) || 75;
    
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
