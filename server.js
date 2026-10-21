const path = require('node:path');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const express = require('express');
const { Server } = require('socket.io');
const { saveMessage, getRecentMessages } = require('./db');

// Express serves the frontend and Socket.io handles real-time events.
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Strip a leading "#" and tidy whitespace so " #general " becomes "general".
function normalizeRoomName(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/^#+/, '').trim().replace(/\s+/g, ' ');
}

// A socket joins one Socket.io room, so only that room receives its messages.
function getRoomUsers(room) {
  const users = new Set();

  for (const socket of io.sockets.sockets.values()) {
    if (socket.data.room === room && socket.data.username) {
      users.add(socket.data.username);
    }
  }

  return [...users].sort((a, b) => a.localeCompare(b));
}

function broadcastRoomUsers(room) {
  io.to(room).emit('room users', {
    room,
    users: getRoomUsers(room)
  });
}

function sendSystemMessage(room, text) {
  io.to(room).emit('system message', {
    id: randomUUID(),
    text,
    createdAt: new Date().toISOString()
  });
}

function sendError(acknowledge, error) {
  if (typeof acknowledge === 'function') {
    acknowledge({ ok: false, error });
  }
}

function sendSuccess(acknowledge, payload) {
  if (typeof acknowledge === 'function') {
    acknowledge(payload);
  }
}

io.on('connection', (socket) => {
  // Join an existing room, or create it implicitly if nobody is there yet.
  socket.on('join', (payload, acknowledge) => {
    if (socket.data.username) {
      sendError(acknowledge, 'Leave your current room before joining another one.');
      return;
    }

    const username = typeof payload?.username === 'string' ? payload.username.trim() : '';
    const room = normalizeRoomName(payload?.room);

    if (username.length < 2 || username.length > 32) {
      sendError(acknowledge, 'Username must be 2 to 32 characters.');
      return;
    }

    if (room.length < 2 || room.length > 32) {
      sendError(acknowledge, 'Room name must be 2 to 32 characters.');
      return;
    }

    const messages = getRecentMessages(room);
    const isNewRoom = getRoomUsers(room).length === 0 && messages.length === 0;

    socket.data.username = username;
    socket.data.room = room;
    socket.join(room);

    // Send history in the join acknowledgement so the client can render it
    // before any new room events arrive.
    sendSuccess(acknowledge, { ok: true, username, room, messages });

    if (isNewRoom) {
      sendSystemMessage(room, `${username} created the room`);
    } else {
      sendSystemMessage(room, `${username} joined the room`);
    }

    broadcastRoomUsers(room);
  });

  // Messages are sent only to the socket's current room.
  socket.on('chat message', (rawText, acknowledge) => {
    const { username, room } = socket.data;

    if (!username || !room) {
      sendError(acknowledge, 'Join a room before sending messages.');
      return;
    }

    const text = typeof rawText === 'string' ? rawText.trim() : '';

    if (!text || text.length > 2000) {
      sendError(acknowledge, 'Message must be 1 to 2000 characters.');
      return;
    }

    // Sending a message means the sender has stopped typing.
    socket.to(room).emit('typing', { username, isTyping: false });

    // Store first, then broadcast, so joins can replay the last 50 messages.
    const message = saveMessage({
      room,
      username,
      text,
      createdAt: new Date().toISOString()
    });

    io.to(room).emit('chat message', message);
    sendSuccess(acknowledge, { ok: true });
  });

  // Relay typing state to everyone else in the same room.
  socket.on('typing', (isTyping) => {
    const { username, room } = socket.data;

    if (!username || !room) {
      return;
    }

    socket.to(room).emit('typing', {
      username,
      isTyping: isTyping === true
    });
  });

  // Leave the current room without disconnecting the socket.
  socket.on('leave room', (acknowledge) => {
    const { username, room } = socket.data;

    if (!username || !room) {
      sendSuccess(acknowledge, { ok: true });
      return;
    }

    socket.leave(room);
    socket.data.username = null;
    socket.data.room = null;

    socket.to(room).emit('system message', {
      id: randomUUID(),
      text: `${username} left the room`,
      createdAt: new Date().toISOString()
    });

    broadcastRoomUsers(room);
    sendSuccess(acknowledge, { ok: true });
  });

  // A closed tab also counts as leaving the room.
  socket.on('disconnect', () => {
    const { username, room } = socket.data;

    if (!username || !room) {
      return;
    }

    socket.to(room).emit('system message', {
      id: randomUUID(),
      text: `${username} left the room`,
      createdAt: new Date().toISOString()
    });

    broadcastRoomUsers(room);
  });
});

server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});
