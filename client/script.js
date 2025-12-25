const loginScreen = document.getElementById("loginScreen");
const chatScreen = document.getElementById("chatScreen");
const usernameInput = document.getElementById("usernameInput");
const roomInput = document.getElementById("roomInput");
const joinBtn = document.getElementById("joinBtn");
const messages = document.getElementById("messages");
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");
const roomList = document.getElementById("roomList");
const userList = document.getElementById("userList");
const typing = document.getElementById("typing");

let socket, username, room;

joinBtn.onclick = () => {
  username = usernameInput.value.trim();
  room = roomInput.value.trim() || "general";

  if (!username) {
    return;
  }

  socket = new WebSocket("ws://localhost:8080");

  socket.onopen = () => {
    socket.send(JSON.stringify({ type: "join", username, room }));
    loginScreen.classList.add("hidden");
    chatScreen.classList.remove("hidden");
  };

  socket.onmessage = (e) => {
    const d = JSON.parse(e.data);

    if (d.type === "rooms") renderRooms(d.rooms);
    if (d.type === "users") renderUsers(d.users);
    if (d.type === "typing") typing.innerText = `${d.username} is typing...`;

    if (d.type === "message") {
      typing.innerText = "";
      addMessage(d.username, d.text, d.time);
    }

    if (d.type === "notification") addNotification(d.message);
  };
};

sendBtn.onclick = sendMessage;

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

messageInput.oninput = () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "typing" }));
  }
};

function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;

  socket.send(
    JSON.stringify({
      type: "message",
      text,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    })
  );
  messageInput.value = "";
}

function renderRooms(rooms) {
  roomList.innerHTML = "";
  rooms.forEach((r) => {
    const li = document.createElement("li");
    li.innerText = r;
    li.onclick = () => {
      messages.innerHTML = "";
      socket.send(JSON.stringify({ type: "join", username, room: r }));
    };
    roomList.appendChild(li);
  });
}

function renderUsers(users) {
  userList.innerHTML = "";
  users.forEach((u) => {
    const li = document.createElement("li");
    li.innerText = u;
    userList.appendChild(li);
  });
}

/**
 * card-style message:
 *  - .bubble-card
 *  - .bubble
 *  - .bubble-footer with name + time
 */
function addMessage(user, text, time) {
  const wrapper = document.createElement("div");
  wrapper.className = "message " + (user === username ? "my" : "other");

  const safeUser = user || "unknown";
  const safeText = text || "";
  const safeTime =
    time ||
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  wrapper.innerHTML = `
    <div class="bubble-card">
      <div class="bubble">
        ${safeText}
      </div>
      <div class="bubble-footer">
        <span class="bubble-name">${safeUser}</span>
        <span class="bubble-time">${safeTime}</span>
      </div>
    </div>
  `;

  messages.appendChild(wrapper);
  messages.scrollTop = messages.scrollHeight;
}

function addNotification(text) {
  const p = document.createElement("p");
  p.className = "notification";
  p.innerText = text;
  messages.appendChild(p);
  messages.scrollTop = messages.scrollHeight;
}
