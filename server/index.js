import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8080;

const wss = new WebSocketServer({ port: PORT });

const clients = new Map();

wss.on('connection', (ws) => {
  const id = Math.random().toString(36).slice(2);
  clients.set(ws, { id, x: 0, y: 0 });

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

      const payload = JSON.stringify({
        type: 'players',
        players: Array.from(clients.values())
      });

      for (const client of clients.keys()) {
        client.send(payload);
      }
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

console.log(`WebSocket server running on ${PORT}`);
