// modules/cropper.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const cropDataPath = path.join(__dirname, '..', 'crop-data.json');

function getCropData() {
  const raw = fs.readFileSync(cropDataPath);
  return JSON.parse(raw);
}

async function checkAndSkipCrop(currentTrackId, progressMs, accessToken) {
  const cropPoints = getCropData();
  const crop = cropPoints.find(item => item.track_id === currentTrackId);

  if (crop && progressMs > crop.crop_end_ms) {
    console.log(`Cropping ${currentTrackId} at ${progressMs}ms`);

    await axios.post('https://api.spotify.com/v1/me/player/next', {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    return true; // Skipped
  }

  return false; // No skip
}

module.exports = {
  checkAndSkipCrop
};
