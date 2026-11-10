// server.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import crypto from "crypto";
import dgram from "dgram";
import dotenv from "dotenv";
import TuyAPI from "tuyapi";
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
var currentSessionToken = null;
var sessionExpiresAt = 0;
function normalizeHost(host) {
  return (host || "http://mafreebox.freebox.fr").replace(/\/+$/, "");
}
async function getFreeboxSessionToken(forceRefresh = false) {
  if (!runtimeConfig.freeboxAppToken || runtimeConfig.freeboxAppToken.startsWith("simulated_")) {
    throw new Error("Aucun jeton Freebox valide enregistr\xE9. Veuillez associer la Freebox.");
  }
  if (!forceRefresh && currentSessionToken && Date.now() < sessionExpiresAt) {
    return currentSessionToken;
  }
  const host = normalizeHost(runtimeConfig.freeboxHost);
  const loginRes = await fetch(`${host}/api/v8/login/`);
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.result?.challenge) {
    throw new Error(loginData.msg || "Impossible de r\xE9cup\xE9rer le challenge Freebox.");
  }
  const challenge = loginData.result.challenge;
  const password = crypto.createHmac("sha1", runtimeConfig.freeboxAppToken).update(challenge).digest("hex");
  const sessionRes = await fetch(`${host}/api/v8/login/session/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app_id: runtimeConfig.freeboxAppId,
      app_version: "1.0.0",
      password
    })
  });
  const sessionData = await sessionRes.json();
  if (!sessionData.success || !sessionData.result?.session_token) {
    throw new Error(sessionData.msg || `\xC9chec ouverture session Freebox (${sessionData.error_code || "erreur"})`);
  }
  currentSessionToken = sessionData.result.session_token;
  sessionExpiresAt = Date.now() + 25 * 60 * 1e3;
  return currentSessionToken;
}
async function freeboxFetch(apiPath, options = {}) {
  const host = normalizeHost(runtimeConfig.freeboxHost);
  let token = await getFreeboxSessionToken(false);
  let res = await fetch(`${host}${apiPath}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers || {},
      "X-Fbx-App-Auth": token
    }
  });
  let data = await res.json();
  if (!data.success && (data.error_code === "auth_required" || data.error_code === "invalid_session")) {
    token = await getFreeboxSessionToken(true);
    res = await fetch(`${host}${apiPath}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers || {},
        "X-Fbx-App-Auth": token
      }
    });
    data = await res.json();
  }
  return data;
}
async function sendFreeboxShutterCommand(channel, action, targetPosition) {
  if (runtimeConfig.demoMode || !runtimeConfig.freeboxAppToken || !channel.freeboxNodeId) {
    return;
  }
  const nodeId = channel.freeboxNodeId;
  let endpointId;
  let payload = { value: null };
  if (action === "up") {
    if (channel.freeboxUpEndpointId) {
      endpointId = channel.freeboxUpEndpointId;
      payload = { value: true };
    } else if (channel.freeboxEndpointId) {
      endpointId = channel.freeboxEndpointId;
      payload = { value: 100 };
    }
  } else if (action === "down") {
    if (channel.freeboxDownEndpointId) {
      endpointId = channel.freeboxDownEndpointId;
      payload = { value: true };
    } else if (channel.freeboxEndpointId) {
      endpointId = channel.freeboxEndpointId;
      payload = { value: 0 };
    }
  } else if (action === "stop") {
    if (channel.freeboxStopEndpointId) {
      endpointId = channel.freeboxStopEndpointId;
      payload = { value: true };
    }
  } else if (action === "set_position" && typeof targetPosition === "number") {
    if (channel.freeboxEndpointId) {
      endpointId = channel.freeboxEndpointId;
      payload = { value: Math.max(0, Math.min(100, Math.round(targetPosition))) };
    }
  }
  if (!endpointId) {
    return;
  }
  const data = await freeboxFetch(`/api/v8/home/endpoints/${nodeId}/${endpointId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  if (!data.success) {
    console.error(`Freebox command error on node ${nodeId}/${endpointId}:`, data);
  }
}
async function sendTuyaShutterCommand(channel, action, targetPosition) {
  if (runtimeConfig.demoMode || !channel.tuyaDeviceId || !channel.tuyaLocalKey) {
    return;
  }
  const device = new TuyAPI({
    id: channel.tuyaDeviceId,
    key: channel.tuyaLocalKey,
    ip: channel.tuyaIp || void 0,
    version: channel.tuyaVersion || "3.3",
    issueRefreshOnConnect: false
  });
  const controlDps = channel.tuyaControlDps ?? 1;
  const positionDps = channel.tuyaPositionDps ?? 2;
  try {
    await device.find({ timeout: 3 });
    await device.connect();
    if (action === "up") {
      await device.set({ dps: controlDps, set: "open" });
    } else if (action === "down") {
      await device.set({ dps: controlDps, set: "close" });
    } else if (action === "stop") {
      await device.set({ dps: controlDps, set: "stop" });
    } else if (action === "set_position" && typeof targetPosition === "number") {
      await device.set({
        dps: positionDps,
        set: Math.max(0, Math.min(100, Math.round(targetPosition)))
      });
    }
  } finally {
    try {
      await device.disconnect();
    } catch {
    }
  }
}
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
  try {
    await sendFreeboxShutterCommand(targetChannel, action, targetPosition);
    await sendTuyaShutterCommand(targetChannel, action, targetPosition);
  } catch (err) {
    console.error("Shutter forwarding error:", err);
  }
  saveConfig(runtimeConfig);
  res.json({ success: true, channel: targetChannel });
});
app.post("/api/shutters/group", async (req, res) => {
  const { action, targetPosition } = req.body;
  const promises = [];
  runtimeConfig.shutters.forEach((device) => {
    device.channels.forEach((channel) => {
      if (action === "all_open") {
        channel.position = 100;
        channel.state = "opening";
        promises.push(sendFreeboxShutterCommand(channel, "up").catch(() => {
        }));
        promises.push(sendTuyaShutterCommand(channel, "up").catch(() => {
        }));
      } else if (action === "all_close") {
        channel.position = 0;
        channel.state = "closing";
        promises.push(sendFreeboxShutterCommand(channel, "down").catch(() => {
        }));
        promises.push(sendTuyaShutterCommand(channel, "down").catch(() => {
        }));
      } else if (action === "all_stop") {
        channel.state = "stopped";
        promises.push(sendFreeboxShutterCommand(channel, "stop").catch(() => {
        }));
        promises.push(sendTuyaShutterCommand(channel, "stop").catch(() => {
        }));
      } else if (action === "all_preset" && typeof targetPosition === "number") {
        channel.position = targetPosition;
        channel.state = "idle";
        promises.push(sendFreeboxShutterCommand(channel, "set_position", targetPosition).catch(() => {
        }));
        promises.push(sendTuyaShutterCommand(channel, "set_position", targetPosition).catch(() => {
        }));
      }
    });
  });
  await Promise.all(promises);
  saveConfig(runtimeConfig);
  res.json({ success: true, shutters: runtimeConfig.shutters });
});
app.get("/api/tuya/scan", async (_req, res) => {
  const found = /* @__PURE__ */ new Map();
  const udpKey = crypto.createHash("md5").update("yGAdlopoPVldABfn").digest();
  const tryParsePacket = (msg, rinfo, encrypted) => {
    try {
      let jsonStr = "";
      if (!encrypted) {
        const start = msg.indexOf("{");
        const end = msg.lastIndexOf("}");
        if (start !== -1 && end !== -1) {
          jsonStr = msg.subarray(start, end + 1).toString("utf8");
        }
      } else if (msg.length > 28) {
        const payload = msg.subarray(20, msg.length - 8);
        const decipher = crypto.createDecipheriv("aes-128-ecb", udpKey, null);
        const decrypted = Buffer.concat([decipher.update(payload), decipher.final()]);
        jsonStr = decrypted.toString("utf8");
      }
      if (!jsonStr) return;
      const parsed = JSON.parse(jsonStr);
      if (parsed.gwId) {
        found.set(parsed.gwId, {
          id: parsed.gwId,
          ip: parsed.ip || rinfo.address,
          version: parsed.version || "3.3",
          productKey: parsed.productKey
        });
      }
    } catch {
    }
  };
  const s6666 = dgram.createSocket({ type: "udp4", reuseAddr: true });
  const s6667 = dgram.createSocket({ type: "udp4", reuseAddr: true });
  s6666.on("error", () => {
  });
  s6667.on("error", () => {
  });
  s6666.on("message", (msg, rinfo) => tryParsePacket(msg, rinfo, false));
  s6667.on("message", (msg, rinfo) => tryParsePacket(msg, rinfo, true));
  try {
    s6666.bind(6666);
    s6667.bind(6667);
  } catch {
  }
  await new Promise((resolve) => setTimeout(resolve, 4e3));
  try {
    s6666.close();
  } catch {
  }
  try {
    s6667.close();
  } catch {
  }
  res.json({
    success: true,
    devices: Array.from(found.values())
  });
});
app.get("/api/freebox/discover", async (_req, res) => {
  try {
    const tilesData = await freeboxFetch("/api/v8/home/tileset/all");
    if (!tilesData.success) {
      return res.json({
        success: false,
        errorCode: tilesData.error_code,
        message: tilesData.error_code === "insufficient_rights" ? "Droits insuffisants : activez la permission 'Gestion de l'alarme et maison' pour PiShutter dans Freebox OS (Param\xE8tres -> Gestion des acc\xE8s -> Applications)." : tilesData.msg || "Impossible de lire les \xE9quipements Freebox Home.",
        tiles: []
      });
    }
    const rawTiles = tilesData.result || [];
    const discovered = rawTiles.map((tile) => {
      const eps = tile.data || [];
      let positionEndpointId;
      let upEndpointId;
      let downEndpointId;
      let stopEndpointId;
      let currentValue;
      for (const ep of eps) {
        const name = (ep.name || "").toLowerCase();
        const uiClass = (ep.ui_class || "").toLowerCase();
        if (name === "position" || name === "position_set" || uiClass === "position") {
          positionEndpointId = ep.ep_id;
          if (typeof ep.value === "number") currentValue = ep.value;
        } else if (name === "up" || name === "open") {
          upEndpointId = ep.ep_id;
        } else if (name === "down" || name === "close") {
          downEndpointId = ep.ep_id;
        } else if (name === "stop") {
          stopEndpointId = ep.ep_id;
        }
      }
      return {
        nodeId: tile.node_id,
        label: tile.label || `\xC9quipement #${tile.node_id}`,
        type: tile.type || "unknown",
        action: tile.action,
        endpointId: positionEndpointId,
        positionEndpointId,
        upEndpointId,
        downEndpointId,
        stopEndpointId,
        currentValue,
        rawEndpoints: eps.map((ep) => ({
          id: ep.ep_id,
          name: ep.name,
          label: ep.label,
          ui_class: ep.ui_class,
          value_type: ep.value_type,
          value: ep.value
        }))
      };
    });
    return res.json({ success: true, tiles: discovered });
  } catch (err) {
    return res.json({
      success: false,
      message: err?.message || "Erreur lors de la d\xE9couverte des \xE9quipements Freebox.",
      tiles: []
    });
  }
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
