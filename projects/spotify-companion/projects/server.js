// spotify-companion/server.js
const cropper = require("./modules/cropper");

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
// Only allow access from localhost (127.0.0.1)
const restrictToLocal = process.env.RESTRICT_TO_LOCALHOST === "false";

if (restrictToLocal) {
  app.use((req, res, next) => {
    const ip = req.connection.remoteAddress;
    if (ip !== "::1" && ip !== "127.0.0.1" && ip !== "::ffff:127.0.0.1") {
      return res.status(403).send("Access denied: Localhost only");
    }
    next();
  });
}

app.use(express.static(path.join(__dirname, "public")));

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
let access_token = "";

app.get("/login", (req, res) => {
  const scopes =
    "user-read-playback-state user-modify-playback-state user-library-read";
  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${CLIENT_ID}&scope=${scopes}&redirect_uri=${REDIRECT_URI}`;
  res.redirect(authUrl);
});

// OAuth callback
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  const params = new URLSearchParams();
  params.append("code", code);
  params.append("redirect_uri", REDIRECT_URI);
  params.append("grant_type", "authorization_code");

  try {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      params,
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    access_token = response.data.access_token;
    res.redirect("/");
  } catch (error) {
    console.error(error);
    res.send("Error during authentication");
  }
});

app.get("/playback-check", async (req, res) => {
  try {
    const playback = await axios.get(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const data = playback.data;
    const trackId = data?.item?.id;
    const progressMs = data?.progress_ms;

    console.log("Playback data:", {
      trackId,
      progressMs,
      isPlaying: data?.is_playing,
      name: data?.item?.name,
    });

    if (trackId && typeof progressMs === "number") {
      await cropper.checkAndSkipCrop(trackId, progressMs, access_token);
    } else {
      console.warn("Missing trackId or progressMs, skipping crop check.");
    }

    res.json(data);
  } catch (err) {
    console.error(
      "Error in /playback-check:",
      err.response?.data || err.message
    );
    res.status(500).send("Error getting playback info");
  }
});

// Skip to next track
app.post("/skip", async (req, res) => {
  try {
    await axios.post(
      "https://api.spotify.com/v1/me/player/next",
      {},
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );
    res.sendStatus(204);
  } catch (err) {
    res.status(500).send("Failed to skip");
  }
});
// Read crop data
app.get("/crop-data", (req, res) => {
  const data = fs.readFileSync("./crop-data.json");
  res.json(JSON.parse(data));
});

// Save crop data
app.post("/crop-data", (req, res) => {
  fs.writeFileSync("./crop-data.json", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

app.listen(8888, () => console.log("Backend running at http://localhost:8888"));
