import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const PORT = process.env.PORT || 8080;

const wss = new WebSocketServer({ port: PORT });

const clients = new Map();
const persistentRoot = process.env.RENDER_PERSISTENT_DIR || '/var/data';
const dataDir = fs.existsSync(persistentRoot) ? persistentRoot : path.join(process.cwd(), 'data');
const dataFile = path.join(dataDir, 'players.json');
const memoryStore = {};

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const RAIN_BOUNDS = {
  minX: -120,
  maxX: 2540,
  minY: -200,
  maxY: 1400
};
const RAIN_DROPS_COUNT = 140;
const weatherState = { type: 'sunny', drops: [] };

function broadcast(payload) {
  const message = JSON.stringify(payload);
  for (const client of clients.keys()) {
    client.send(message);
  }
}

function generateRainDrops() {
  const drops = [];
  for (let i = 0; i < RAIN_DROPS_COUNT; i++) {
    drops.push({
      x: RAIN_BOUNDS.minX + Math.random() * (RAIN_BOUNDS.maxX - RAIN_BOUNDS.minX),
      y: RAIN_BOUNDS.minY + Math.random() * (RAIN_BOUNDS.maxY - RAIN_BOUNDS.minY),
      speed: 3 + Math.random() * 4,
      length: 10 + Math.random() * 10,
      alpha: 0.35 + Math.random() * 0.3
    });
  }
  return drops;
}

function setWeather(type) {
  if (!['sunny', 'rain'].includes(type)) return;
  weatherState.type = type;
  weatherState.drops = type === 'rain' ? generateRainDrops() : [];
  broadcast({ type: 'weather', weather: type, drops: weatherState.drops });
}

setInterval(() => {
  const next = weatherState.type === 'rain' ? 'sunny' : 'rain';
  setWeather(next);
}, 180000);

function loadStore() {
  try {
    if (!fs.existsSync(dataFile)) return {};
    const raw = fs.readFileSync(dataFile, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveStore(store) {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(dataFile, JSON.stringify(store, null, 2));
}

async function loadPlayerRecord(name) {
  const trimmed = String(name || '').trim();
  const needle = trimmed.toLowerCase();
  if (memoryStore[trimmed]) {
    return { ...memoryStore[trimmed], name: trimmed };
  }
  const memKey = Object.keys(memoryStore).find((key) => key.toLowerCase() === needle);
  if (memKey) {
    return { ...memoryStore[memKey], name: memKey };
  }
  if (supabase) {
    const { data, error } = await supabase
      .from('players')
      .select('name, passcode, state')
      .eq('name', trimmed)
      .maybeSingle();
    if (error) {
      console.warn('Supabase load error, falling back to local store.', error.message || error);
    }
    if (data) {
      memoryStore[data.name] = { passcode: data.passcode, state: data.state };
      return data || null;
    }
    if (!needle) return null;
    const { data: fallback, error: fallbackError } = await supabase
      .from('players')
      .select('name, passcode, state')
      .ilike('name', trimmed)
      .limit(1)
      .maybeSingle();
    if (fallbackError) {
      console.warn('Supabase fallback error, falling back to local store.', fallbackError.message || fallbackError);
    }
    if (fallback) {
      memoryStore[fallback.name] = { passcode: fallback.passcode, state: fallback.state };
      return fallback || null;
    }
  }
  const store = loadStore();
  if (store[trimmed]) {
    memoryStore[trimmed] = store[trimmed];
    return { ...store[trimmed], name: trimmed };
  }
  if (!needle) return null;
  const matchKey = Object.keys(store).find((key) => key.toLowerCase() === needle);
  if (!matchKey) return null;
  memoryStore[matchKey] = store[matchKey];
  return { ...store[matchKey], name: matchKey };
}

async function savePlayerRecord(name, passcode, state) {
  const trimmed = String(name || '').trim();
  if (trimmed) {
    memoryStore[trimmed] = { passcode, state };
  }
  if (supabase) {
    const { error } = await supabase
      .from('players')
      .upsert({ name, passcode, state, updated_at: new Date().toISOString() });
    if (error) {
      console.warn('Supabase save error, falling back to local store.', error.message || error);
    } else {
      return;
    }
  }
  const store = loadStore();
  store[trimmed || name] = { passcode, state };
  saveStore(store);
}

function findClientById(id) {
  for (const [client, data] of clients.entries()) {
    if (data.id === id) return client;
  }
  return null;
}

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).slice(2);
  clients.set(ws, {
    id,
    x: 0,
    y: 0,
    name: 'Guest',
    avatar: 'reef',
    facingRight: true,
    hasRod: false,
    rodSprite: null,
    heldSprite: null,
    heldWeight: 0,
    heldRarity: null,
    money: 0,
    pingMs: 0
  });

  ws.send(JSON.stringify({ type: 'welcome', id, weather: weatherState.type, drops: weatherState.drops }));

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    handleMessage(msg).catch(() => {});
  });

  async function handleMessage(msg) {
    if (msg.type === 'auth') {
      const name = String(msg.name || '').slice(0, 16);
      const passcode = String(msg.passcode || '');
      if (!name || !passcode) {
        ws.send(JSON.stringify({ type: 'auth-error', message: 'Name and passcode required.' }));
        return;
      }
      const record = await loadPlayerRecord(name);
      if (record) {
        const resolvedName = record.name || name;
        if (record.passcode !== passcode) {
          ws.send(JSON.stringify({ type: 'auth-error', message: 'Passcode incorrect.' }));
          return;
        }
        const player = clients.get(ws);
        if (player) {
          player.name = resolvedName;
          player.avatar = msg.avatar || player.avatar;
        }
        ws.send(JSON.stringify({ type: 'auth-ok', state: record.state || null, name: resolvedName }));
      } else {
        await savePlayerRecord(name, passcode, null);
        const player = clients.get(ws);
        if (player) {
          player.name = name;
          player.avatar = msg.avatar || player.avatar;
        }
        ws.send(JSON.stringify({ type: 'auth-new' }));
      }
    } else if (msg.type === 'save-state') {
      const state = msg.state || {};
      const name = state.name;
      const passcode = state.passcode;
      if (!name || !passcode) return;
      const record = await loadPlayerRecord(name);
      if (!record || record.passcode !== passcode) return;
      await savePlayerRecord(name, passcode, state);
    } else if (msg.type === 'weather-set') {
      setWeather(msg.weather);
    } else if (msg.type === 'ping') {
      const player = clients.get(ws);
      if (!player) return;
      const sent = Number(msg.t || 0);
      const now = Date.now();
      const pingMs = sent ? Math.max(0, now - sent) : 0;
      player.pingMs = pingMs;
      ws.send(JSON.stringify({ type: 'pong', pingMs }));
    } else if (msg.type === 'move') {
      const player = clients.get(ws);
      if (!player) return;
      player.x = msg.x;
      player.y = msg.y;
      player.name = typeof msg.name === 'string' ? msg.name.slice(0, 16) : player.name;
      player.avatar = typeof msg.avatar === 'string' ? msg.avatar : player.avatar;
      player.facingRight = typeof msg.facingRight === 'boolean' ? msg.facingRight : player.facingRight;
      player.hasRod = Boolean(msg.hasRod);
      player.rodSprite = msg.rodSprite || null;
      player.heldSprite = msg.heldSprite || null;
      player.heldWeight = typeof msg.heldWeight === 'number' ? msg.heldWeight : 0;
      player.heldRarity = msg.heldRarity || null;
      player.money = typeof msg.money === 'number' ? msg.money : player.money;

      broadcast({
        type: 'players',
        players: Array.from(clients.values())
      });
    } else if (msg.type === 'dev-broadcast') {
      const sender = clients.get(ws);
      const payload = {
        type: 'dev-broadcast',
        text: msg.text || '',
        fromName: sender?.name || 'Dev'
      };
      broadcast(payload);
    } else if (msg.type === 'dev-prank') {
      const sender = clients.get(ws);
      const payload = {
        type: 'dev-prank',
        prank: msg.prank,
        fromName: sender?.name || 'Dev'
      };
      if (msg.toId === 'all') {
        broadcast(payload);
      } else {
        const target = findClientById(msg.toId);
        if (target) {
          target.send(JSON.stringify(payload));
        }
      }
    } else if (msg.type === 'gift' || msg.type === 'trade-request' || msg.type === 'trade-accept' || msg.type === 'trade-decline') {
      const target = findClientById(msg.toId);
      if (!target) return;
      const sender = clients.get(ws);
      const outgoing = {
        ...msg,
        fromId: sender?.id || null,
        fromName: sender?.name || 'Player'
      };
      target.send(JSON.stringify(outgoing));
    }
  }

  ws.on('close', () => {
    clients.delete(ws);
  });
});

console.log(`WebSocket server running on ${PORT}`);
