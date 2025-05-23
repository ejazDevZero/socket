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
  let apiUrl = null;

  socket.on("message", async (message) => {
    try {
      const data = JSON.parse(message);
      if (data.api) {
        apiUrl = `https://zedline.ir/api/${data.api}/`;
        console.log(`Client ${clientId} requested URL: ${apiUrl}`);

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
      }
    } catch (err) {
      socket.send(JSON.stringify({
        id: clientId,
        error: "Invalid JSON or missing 'api' field.",
      }));
    }
  });

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
