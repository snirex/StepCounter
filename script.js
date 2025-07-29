let steps = 0;
let metersPerStep = 0.75;
let distanceBySteps = 0;
let totalDistance = 0;
let gpsPositions = [];
let lastAccel = { x: 0, y: 0, z: 0 };
let cooldown = false;
let stepThreshold = 12;
let isTracking = true;
let distanceForBeep = 100;
let lastBeepAt = 0;
let lastGPS = null;
const stepCountElem = document.getElementById("stepCount");
const distanceElem = document.getElementById("distance");
const beepSound = document.getElementById("beep");

// Chart setup
const ctx = document.getElementById("chart").getContext("2d");
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'מרחק (מטרים)',
      data: [],
      borderColor: 'green',
      fill: false
    }]
  },
  options: {
    responsive: true,
    scales: {
      x: { title: { display: true, text: 'זמן (שניות)' } },
      y: { beginAtZero: true }
    }
  }
});

function updateDisplay() {
  distanceBySteps = steps * metersPerStep;
  totalDistance = Math.max(distanceBySteps, totalDistance);
  stepCountElem.textContent = steps;
  distanceElem.textContent = totalDistance.toFixed(2) + " מטר";
  let seconds = Math.floor((Date.now() - startTime) / 1000);
  chart.data.labels.push(seconds);
  chart.data.datasets[0].data.push(totalDistance);
  chart.update();
  if (totalDistance - lastBeepAt >= distanceForBeep) {
    beepSound.play();
    lastBeepAt = totalDistance;
  }
}

function handleMotion(event) {
  if (!isTracking) return;
  const acc = event.accelerationIncludingGravity;
  if (!acc) return;
  const delta =
    Math.abs(acc.x - lastAccel.x) +
    Math.abs(acc.y - lastAccel.y) +
    Math.abs(acc.z - lastAccel.z);
  if (delta > stepThreshold && !cooldown) {
    steps++;
    updateDisplay();
    cooldown = true;
    setTimeout(() => cooldown = false, 400);
  }
  lastAccel = { x: acc.x, y: acc.y, z: acc.z };
}

// GPS + Map
let map = L.map('map').setView([32.08, 34.78], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
}).addTo(map);
let gpsPath = L.polyline([], { color: 'blue' }).addTo(map);

function updateMap(position) {
  const latlng = [position.coords.latitude, position.coords.longitude];
  gpsPositions.push(latlng);
  gpsPath.setLatLngs(gpsPositions);
  map.setView(latlng, 16);
  if (lastGPS) {
    const dist = getDistance(lastGPS, position.coords);
    totalDistance += dist;
    updateDisplay();
  }
  lastGPS = position.coords;
}

function getDistance(pos1, pos2) {
  const R = 6371000;
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(pos2.latitude - pos1.latitude);
  const dLon = toRad(pos2.longitude - pos1.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(pos1.latitude)) * Math.cos(toRad(pos2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// שליטה
document.getElementById("toggleTracking").addEventListener("click", () => {
  isTracking = !isTracking;
  document.getElementById("toggleTracking").textContent = isTracking ? "⏸️ עצור מדידה" : "▶️ המשך מדידה";
});

document.getElementById("soundDistance").addEventListener("change", (e) => {
  distanceForBeep = parseInt(e.target.value);
});

// התחלה
let startTime = Date.now();
function startTracking() {
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    DeviceMotionEvent.requestPermission().then(response => {
      if (response === 'granted') {
        window.addEventListener('devicemotion', handleMotion);
      }
    });
  } else {
    window.addEventListener('devicemotion', handleMotion);
  }

  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(updateMap, console.error, {
      enableHighAccuracy: true,
      maximumAge: 1000
    });
  }
}

window.onload = startTracking;
