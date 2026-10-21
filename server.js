const path = require('node:path');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const express = require('express');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

function getOnlineCount() {
  let count = 0;
  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.username) {
      count += 1;
    }
  }
  return count;
}

function broadcastPresence() {
  io.emit('presence', { online: getOnlineCount() });
}

io.on('connection', (socket) => {
  socket.on('join', (rawUsername, acknowledge) => {
    const username = typeof rawUsername === 'string' ? rawUsername.trim() : '';

    if (socket.data.username) {
      if (typeof acknowledge === 'function') {
        acknowledge({ ok: false, error: 'You have already joined this chat.' });
      }
      return;
    }

    if (username.length < 2 || username.length > 32) {
      if (typeof acknowledge === 'function') {
        acknowledge({ ok: false, error: 'Username must be 2 to 32 characters.' });
      }
      return;
    }

    socket.data.username = username;

    io.emit('system message', {
      id: randomUUID(),
      text: `${username} joined the chat`,
      createdAt: new Date().toISOString()
    });

    broadcastPresence();

    if (typeof acknowledge === 'function') {
      acknowledge({ ok: true, username });
    }
  });

  socket.on('chat message', (rawText, acknowledge) => {
    if (!socket.data.username) {
      if (typeof acknowledge === 'function') {
        acknowledge({ ok: false, error: 'Join the chat before sending messages.' });
      }
      return;
    }

    const text = typeof rawText === 'string' ? rawText.trim() : '';

    if (!text || text.length > 2000) {
      if (typeof acknowledge === 'function') {
        acknowledge({ ok: false, error: 'Message must be 1 to 2000 characters.' });
      }
      return;
    }

    const message = {
      id: randomUUID(),
      username: socket.data.username,
      text,
      createdAt: new Date().toISOString()
    };

    io.emit('chat message', message);

    if (typeof acknowledge === 'function') {
      acknowledge({ ok: true });
    }
  });

  socket.on('disconnect', () => {
    if (!socket.data.username) {
      return;
    }

    socket.broadcast.emit('system message', {
      id: randomUUID(),
      text: `${socket.data.username} left the chat`,
      createdAt: new Date().toISOString()
    });

    broadcastPresence();
  });
});

server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});
