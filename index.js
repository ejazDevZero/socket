const WebSocket = require("ws");
const http = require("http");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const server = http.createServer();
const wss = new WebSocket.Server({ server });

const clients = new Map();

wss.on("connection", (socket) => {
  const clientId = uuidv4();
  console.log(`Client connected: ${clientId}`);

  let interval;
  let apiUrl = `https://zedline.ir/api/index.php`; // پیش‌فرض اگر چیزی نیاد

  // این تابع کار ارسال داده رو انجام می‌ده
  const startSending = () => {
    interval = setInterval(async () => {
      try {
        const response = await axios.get(apiUrl);
        socket.send(JSON.stringify({
          id: clientId,
          data: response.data,
        }));
      } catch (err) {
        socket.send(JSON.stringify({
          id: clientId,
          error: "Failed to fetch data from API",
        }));
      }
    }, 1000);
  };

  let hasReceivedInitialMessage = false;

  socket.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      if (data.api) {
        apiUrl = `https://zedline.ir/api/${data.api}/`;
        console.log(`Client ${clientId} set custom API: ${apiUrl}`);
      }
    } catch (err) {
      socket.send(JSON.stringify({
        id: clientId,
        error: "Invalid JSON format.",
      }));
    }

    if (!hasReceivedInitialMessage) {
      hasReceivedInitialMessage = true;
      if (!interval) startSending();
    }
  });

  // اگر تا 2 ثانیه بعد از اتصال هیچ پیامی نیاد، لینک پیش‌فرض استفاده می‌شه
  setTimeout(() => {
    if (!hasReceivedInitialMessage && !interval) {
      console.log(`Client ${clientId} did not send initial data. Using default URL.`);
      startSending();
    }
  }, 2000);

  socket.on("close", () => {
    console.log(`Client disconnected: ${clientId}`);
    if (interval) clearInterval(interval);
    clients.delete(clientId);
  });

  clients.set(clientId, socket);
});

server.listen(process.env.PORT || 3000, () => {
  console.log("WebSocket server running...");
});
