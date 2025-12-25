const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

const users = new Map(); // socket -> { username, room }
const rooms = {}; // room -> Set(sockets)

console.log("WebSocket server running on ws://localhost:8080");

wss.on("connection", (socket) => {

  socket.send(JSON.stringify({
    type: "rooms",
    rooms: Object.keys(rooms)
  }));

  socket.on("message", (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    /* JOIN ROOM */
    if (msg.type === "join") {
      const { username, room } = msg;

      for (let u of users.values()) {
        if (u.username === username) {
          socket.send(JSON.stringify({
            type: "error",
            message: "Username already taken"
          }));
          return;
        }
      }

      // Leave previous room
      const prev = users.get(socket);
      if (prev) {
        rooms[prev.room]?.delete(socket);
        broadcast(prev.room, {
          type: "notification",
          message: `${prev.username} left the room`
        });
      }

      users.set(socket, { username, room });

      if (!rooms[room]) rooms[room] = new Set();
      rooms[room].add(socket);

      broadcast(room, {
        type: "notification",
        message: `${username} joined the room`
      });

      broadcastAllRooms();
      broadcastUsers(room);
    }

    /* MESSAGE */
    if (msg.type === "message") {
      const user = users.get(socket);
      if (!user) return;

      broadcast(user.room, {
        type: "message",
        username: user.username,
        text: msg.text,
        time: msg.time
      });
    }

    /* TYPING */
    if (msg.type === "typing") {
      const user = users.get(socket);
      if (!user) return;

      broadcast(user.room, {
        type: "typing",
        username: user.username
      });
    }
  });

  socket.on("close", () => {
    const user = users.get(socket);
    if (!user) return;

    rooms[user.room]?.delete(socket);
    if (rooms[user.room]?.size === 0) delete rooms[user.room];

    broadcast(user.room, {
      type: "notification",
      message: `${user.username} left the room`
    });

    users.delete(socket);
    broadcastAllRooms();
  });
});

/* HELPERS */
function broadcast(room, data) {
  rooms[room]?.forEach(c => {
    if (c.readyState === WebSocket.OPEN)
      c.send(JSON.stringify(data));
  });
}

function broadcastAllRooms() {
  wss.clients.forEach(c => {
    c.send(JSON.stringify({
      type: "rooms",
      rooms: Object.keys(rooms)
    }));
  });
}

function broadcastUsers(room) {
  const userList = [];
  rooms[room]?.forEach(s => {
    userList.push(users.get(s).username);
  });

  broadcast(room, {
    type: "users",
    users: userList
  });
}
