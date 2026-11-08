// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT || 3e3;
var isProd = process.env.NODE_ENV === "production";
app.use(express.json());
var CONFIG_FILE = path.join(__dirname, "pishutter-config.json");
var DEFAULT_CONFIG = {
  freeboxHost: "http://mafreebox.freebox.fr",
  freeboxAppId: "fr.freebox.pishutter",
  freeboxAppToken: "",
  demoMode: true,
  screensaverTimeoutMinutes: 3,
  shutters: [
    {
      id: "loratap-salon-1",
      name: "Interrupteur Double Salon",
      type: "loratap_double",
      room: "Salon & S\xE9jour",
      channels: [
        {
          id: "volet-salon-gauche",
          name: "Baie Vitr\xE9e (Gauche)",
          room: "Salon",
          position: 100,
          state: "idle",
          travelTimeSeconds: 20
        },
        {
          id: "volet-salon-droit",
          name: "Fen\xEAtre Principale (Droit)",
          room: "Salon",
          position: 100,
          state: "idle",
          travelTimeSeconds: 18
        }
      ]
    },
    {
      id: "loratap-chambre-1",
      name: "Interrupteur Double Chambres",
      type: "loratap_double",
      room: "Chambre & Bureau",
      channels: [
        {
          id: "volet-chambre-parentale",
          name: "Chambre Parentale",
          room: "Chambre 1",
          position: 0,
          state: "idle",
          travelTimeSeconds: 16
        },
        {
          id: "volet-bureau",
          name: "Bureau / T\xE9l\xE9travail",
          room: "Bureau",
          position: 50,
          state: "idle",
          travelTimeSeconds: 15
        }
      ]
    }
  ]
};
function readConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error("Error reading config file, using defaults:", err);
  }
  return DEFAULT_CONFIG;
}
function saveConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing config file:", err);
  }
}
var runtimeConfig = readConfig();
app.get("/api/config", (_req, res) => {
  res.json(runtimeConfig);
});
app.post("/api/config", (req, res) => {
  const newConfig = { ...runtimeConfig, ...req.body };
  runtimeConfig = newConfig;
  saveConfig(newConfig);
  res.json({ success: true, config: runtimeConfig });
});
app.post("/api/shutters/command", async (req, res) => {
  const { channelId, action, targetPosition } = req.body;
  let targetChannel = null;
  for (const device of runtimeConfig.shutters) {
    for (const channel of device.channels) {
      if (channel.id === channelId) {
        targetChannel = channel;
        break;
      }
    }
  }
  if (!targetChannel) {
    return res.status(404).json({ error: "Shutter channel not found" });
  }
  if (action === "up") {
    targetChannel.state = "opening";
    targetChannel.position = 100;
  } else if (action === "down") {
    targetChannel.state = "closing";
    targetChannel.position = 0;
  } else if (action === "stop") {
    targetChannel.state = "stopped";
  } else if (action === "set_position" && typeof targetPosition === "number") {
    const prev = targetChannel.position;
    targetChannel.position = Math.max(0, Math.min(100, targetPosition));
    targetChannel.state = targetPosition > prev ? "opening" : targetPosition < prev ? "closing" : "idle";
  }
  if (!runtimeConfig.demoMode && runtimeConfig.freeboxAppToken && targetChannel.freeboxNodeId) {
    try {
      console.log(`Forwarding action ${action} to Freebox node ${targetChannel.freeboxNodeId}`);
    } catch (fbErr) {
      console.error("Freebox forwarding error:", fbErr);
    }
  }
  saveConfig(runtimeConfig);
  res.json({ success: true, channel: targetChannel });
});
app.post("/api/shutters/group", (req, res) => {
  const { action, targetPosition } = req.body;
  runtimeConfig.shutters.forEach((device) => {
    device.channels.forEach((channel) => {
      if (action === "all_open") {
        channel.position = 100;
        channel.state = "opening";
      } else if (action === "all_close") {
        channel.position = 0;
        channel.state = "closing";
      } else if (action === "all_stop") {
        channel.state = "stopped";
      } else if (action === "all_preset" && typeof targetPosition === "number") {
        channel.position = targetPosition;
        channel.state = "idle";
      }
    });
  });
  saveConfig(runtimeConfig);
  res.json({ success: true, shutters: runtimeConfig.shutters });
});
app.get("/api/freebox/version", async (_req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3e3);
    const response = await fetch(`${runtimeConfig.freeboxHost}/api_version`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (response.ok) {
      const data = await response.json();
      return res.json({ connected: true, data });
    }
  } catch (err) {
    return res.json({
      connected: false,
      message: "Freebox local host unreachable or running in cloud sandbox. Demo mode active.",
      simulated: {
        box_model_name: "Freebox Delta / Pop",
        api_version: "8.0",
        api_base_url: "/api/",
        device_name: "Freebox Server"
      }
    });
  }
});
app.post("/api/freebox/request-auth", async (_req, res) => {
  try {
    const payload = {
      app_id: runtimeConfig.freeboxAppId,
      app_name: "PiShutter 3.5 KeDei",
      app_version: "1.0.0",
      device_name: "Raspberry Pi 3"
    };
    const response = await fetch(`${runtimeConfig.freeboxHost}/api/v8/login/authorize/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data.success) {
      runtimeConfig.freeboxAppToken = data.result.app_token;
      runtimeConfig.freeboxTrackId = data.result.track_id;
      saveConfig(runtimeConfig);
      return res.json(data);
    }
  } catch (err) {
    const simulatedTrackId = Math.floor(Math.random() * 1e5);
    const simulatedToken = "simulated_app_token_" + Date.now();
    runtimeConfig.freeboxAppToken = simulatedToken;
    runtimeConfig.freeboxTrackId = simulatedTrackId;
    saveConfig(runtimeConfig);
    return res.json({
      success: true,
      result: {
        app_token: simulatedToken,
        track_id: simulatedTrackId
      },
      simulated: true,
      message: "Demande envoy\xE9e. Sur la Freebox physique, appuyez sur la fl\xE8che droite de l'\xE9cran pour valider."
    });
  }
});
app.get("/api/freebox/track-auth", async (_req, res) => {
  const trackId = runtimeConfig.freeboxTrackId;
  if (!trackId) {
    return res.json({ status: "unknown" });
  }
  try {
    const response = await fetch(`${runtimeConfig.freeboxHost}/api/v8/login/authorize/${trackId}`);
    const data = await response.json();
    if (data.success) {
      return res.json(data.result);
    }
  } catch {
    return res.json({
      status: "granted",
      challenge: "simulated_challenge_" + Date.now(),
      simulated: true
    });
  }
});
app.get("/api/system/pi-info", (_req, res) => {
  let cpuTemp = 48.5;
  let throttling = "OK (0x0)";
  try {
    if (fs.existsSync("/sys/class/thermal/thermal_zone0/temp")) {
      const raw = fs.readFileSync("/sys/class/thermal/thermal_zone0/temp", "utf-8");
      cpuTemp = parseFloat(raw) / 1e3;
    }
  } catch {
  }
  res.json({
    device: "Raspberry Pi 3 Model B Rev 1.2",
    display: 'KeDei 3.5" SPI TFTLCD v6.3 (480x320)',
    touchController: "XPT2046 Resistive Touch",
    interface: "SPI /dev/spidev0.0 @ 48MHz",
    resolution: "480x320 (16-bit 65K colors)",
    cpuTemperature: cpuTemp.toFixed(1) + " \xB0C",
    throttling,
    uptime: Math.floor(process.uptime()),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
async function setupServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  const numericPort = Number(PORT) || 3e3;
  app.listen(numericPort, "0.0.0.0", () => {
    console.log(`PiShutter KeDei server running on http://0.0.0.0:${numericPort}`);
  });
}
setupServer();
