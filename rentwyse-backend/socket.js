// socket.js
const { Server } = require("socket.io");

let io;
let userSockets = {}; // This will map user IDs to their socket IDs
let queuedMessages = {}; // Maps user IDs to arrays of messages that are queued.

module.exports = {
  init: (httpServer) => {
    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      console.log("a user connected thru socket: ", socket.id);

      // When the client sends their user ID, update the mapping
      socket.on("registerUser", (userId) => {
        userSockets[userId] = socket.id;
        console.log(`User ${userId} connected with socket ID ${socket.id}`);

        // Check if there are queued messages for this user
        if (queuedMessages[userId] && queuedMessages[userId].length > 0) {
          // Send all queued messages to this user
          queuedMessages[userId].forEach((message) => {
            socket.emit("newMessage", message);
          });
          // Clear the queue for this user
          delete queuedMessages[userId];
        }
      });

      socket.on("disconnect", () => {
        console.log("user disconnected");
        // Remove the user from the userSockets mapping
        Object.keys(userSockets).forEach((userId) => {
          if (userSockets[userId] === socket.id) {
            delete userSockets[userId];
            console.log(`User ${userId} disconnected`);
          }
        });
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized!");
    }
    return io;
  },
  getUserSockets: () => userSockets,
  getQueuedMessages: () => queuedMessages,

  // Use this method to add a message to the queue
  addQueuedMessage: (userId, message) => {
    if (!queuedMessages[userId]) {
      queuedMessages[userId] = [];
    }
    queuedMessages[userId].push(message);
  },

  // Call this method when a user connects to send them their queued messages
  sendQueuedMessages: (userId) => {
    if (queuedMessages[userId] && queuedMessages[userId].length > 0) {
      const userSocketId = userSockets[userId];
      if (userSocketId) {
        queuedMessages[userId].forEach((message) => {
          io.to(userSocketId).emit("newMessage", message);
        });
        delete queuedMessages[userId];
      }
    }
  },
};
