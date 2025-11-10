// Control page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('vitalsForm');
    const successMessage = document.getElementById('successMessage');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Gather form data
        const vitalsData = {
            heartRate: document.getElementById('heartRate').value,
            spo2: document.getElementById('spo2').value,
            bloodPressureSys: document.getElementById('bloodPressureSys').value,
            bloodPressureDia: document.getElementById('bloodPressureDia').value,
            temperature: document.getElementById('temperature').value,
            respiratoryRate: document.getElementById('respiratoryRate').value,
            observations: document.getElementById('observations').value,
            timestamp: new Date().toISOString()
        };
        
        // Store data in localStorage for the display page
        localStorage.setItem('vitalsData', JSON.stringify(vitalsData));
        
        // Show success message
        successMessage.style.display = 'block';
        
        // Hide success message after 3 seconds
        setTimeout(function() {
            successMessage.style.display = 'none';
        }, 3000);
    });
});
