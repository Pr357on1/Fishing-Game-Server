import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;

const wss = new WebSocketServer({ port: PORT });

const clients = new Map();

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
    heldRarity: null
  });

  ws.send(JSON.stringify({ type: 'welcome', id }));

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    if (msg.type === 'move') {
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

      const payload = JSON.stringify({
        type: 'players',
        players: Array.from(clients.values())
      });

      for (const client of clients.keys()) {
        client.send(payload);
      }
    } else if (msg.type === 'dev-broadcast') {
      const sender = clients.get(ws);
      const payload = JSON.stringify({
        type: 'dev-broadcast',
        text: msg.text || '',
        fromName: sender?.name || 'Dev'
      });
      for (const client of clients.keys()) {
        client.send(payload);
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
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

console.log(`WebSocket server running on ${PORT}`);
