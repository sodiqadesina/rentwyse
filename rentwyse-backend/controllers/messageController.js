// controllers/messageController.js

/**
 * Message Controller
 *
 * Handles:
 *  - Creating messages (and creating/reusing conversations)
 *  - Marking messages as read within a conversation
 *  - Retrieving unread message count
 *
 * NOTE:
 *  - All routes using this controller should be protected by auth middleware
 *    that sets `req.userData.userId` (your existing JWT middleware).
 */

const Message = require("../models/message");
const Conversation = require("../models/conversation");
const User = require("../models/user");
const socket = require("../socket");

/**
 * Lightweight logger wrapper for this controller.
 * Replace with Winston/pino/etc in future if needed.
 */
const logger = {
  info: (...args) => console.log("[INFO] [MessageController]", ...args),
  error: (...args) => console.error("[ERROR] [MessageController]", ...args),
};

/**
 * Create a new message.
 *
 * POST /api/messages
 *
 * Expected body:
 *  {
 *    "conversationId": "optional-existing-conversation-id",
 *    "receiver": "receiver-user-id (required if conversationId is not provided)",
 *    "content": "message text"
 *  }
 *
 * Behavior:
 *  - If conversationId is provided:
 *      -> Use that conversation.
 *  - Else if receiver is provided:
 *      -> Reuse existing conversation between sender/receiver, or create a new one.
 *  - Create a Message linked to the conversation.
 *  - Emit "newMessage" via Socket.io to online receiver,
 *    or queue the message if receiver is offline.
 */
exports.createMessage = async (req, res) => {
  try {
    const { conversationId, receiver, content } = req.body;
    const sender = req.userData.userId;

    logger.info("createMessage called", {
      sender,
      conversationId,
      receiver,
    });

    let conversation;

    if (conversationId) {
      // Existing conversation: fetch by ID
      conversation = await Conversation.findById(conversationId);
      logger.info("Using existing conversation", {
        conversationId: conversationId,
        found: !!conversation,
      });
    } else if (receiver) {
      // New or existing conversation between sender and receiver
      conversation = await Conversation.findOne({
        participants: { $all: [sender, receiver] },
      });

      if (!conversation) {
        logger.info("No existing conversation found. Creating new one.", {
          sender,
          receiver,
        });

        conversation = new Conversation({
          participants: [sender, receiver],
        });
        await conversation.save();

        logger.info("New conversation created", {
          conversationId: conversation._id,
        });
      } else {
        logger.info("Reusing existing conversation", {
          conversationId: conversation._id,
        });
      }
    } else {
      // Neither conversationId nor receiver provided: invalid request
      logger.error(
        "createMessage error: missing receiver and conversationId"
      );
      throw new Error("A receiver or conversationId must be provided");
    }

    // Create and save the message
    const message = new Message({
      conversationId: conversation._id,
      sender,
      receiver, // May be undefined when conversationId is provided, which is allowed by existing logic
      content,
    });
    await message.save();

    logger.info("Message created", {
      messageId: message._id,
      conversationId: conversation._id,
      sender,
      receiver,
    });

    // Socket handling: notify receiver (online or offline)
    const userSockets = socket.getUserSockets();
    logger.info("Current userSockets map", Object.keys(userSockets));

    const receiverSocketId = userSockets[req.body.receiver]; // receiver is user ID
    logger.info("Resolved receiverSocketId", {
      receiver,
      receiverSocketId,
    });

    // Get sender details for username display in notification
    const senderDetails = await User.findById(sender);
    const senderUsername = senderDetails ? senderDetails.username : null;

    logger.info("Sender username resolved", { sender, senderUsername });

    const payload = {
      conversationId: conversation._id,
      message: content,
      sender: sender,
      receiver: receiver,
      senderUsername: senderUsername,
    };

    if (receiverSocketId) {
      // Receiver is online: emit immediately
      logger.info("Receiver online, emitting Socket.io event", {
        receiver,
        receiverSocketId,
      });

      const io = socket.getIO();
      io.to(receiverSocketId).emit("newMessage", payload);
    } else {
      // Receiver is offline: queue message in memory/cache
      logger.info("Receiver offline, queueing message", {
        receiver,
      });

      socket.addQueuedMessage(receiver, payload);
    }

    res
      .status(201)
      .json({ message: "Message sent successfully", messageId: message._id });
  } catch (error) {
    logger.error("createMessage error:", error);

    res.status(500).json({
      message: "Failed to send message",
      error: error.message,
    });
  }
};

/**
 * Placeholder: Get all messages for a user.
 *
 * GET /api/messages (or similar)
 *
 * TODO:
 *  - Implement as needed (e.g., paginate messages by user or conversation).
 */
exports.getMessagesForUser = async (req, res) => {
  // Implement logic to get all messages for a user
  logger.info("getMessagesForUser called (not implemented)");
  res.status(501).json({ message: "Not implemented" });
};

/**
 * Mark all unread messages in a specific conversation as "read"
 * for the currently authenticated user.
 *
 * PATCH /api/messages/:conversationId/read
 *
 * Params:
 *  - conversationId: ID of the conversation
 *
 * Behavior:
 *  - Only updates messages where:
 *      - conversationId matches
 *      - receiver is the current user
 *      - read === false
 *
 * Response:
 *  - 204 No Content if at least one message was updated
 *  - 200 with a message if there was nothing to update
 */
exports.readMessagesInConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userData.userId;

    logger.info("readMessagesInConversation called", {
      conversationId,
      userId,
    });

    const result = await Message.updateMany(
      { conversationId: conversationId, receiver: userId, read: false },
      { $set: { read: true } }
    );

    logger.info("readMessagesInConversation updateMany result", {
      nMatched: result.n,
      nModified: result.nModified,
    });

    // Send 204 No Content if successful since no content is returned
    if (result.nModified > 0) {
      return res.status(204).send();
    } else {
      // No messages were updated, possibly because they were already marked as read
      return res.status(200).json({ message: "No messages to update" });
    }
  } catch (error) {
    logger.error("readMessagesInConversation error:", error);

    res.status(500).json({
      message: "Failed to update messages",
      error: error.message,
    });
  }
};

/**
 * Get the count of unread messages for the current user.
 *
 * GET /api/messages/unread/count
 *
 * Behavior:
 *  - Counts messages where:
 *      - receiver is the current user
 *      - read === false
 *
 * Response:
 *  - { "count": number }
 */
exports.getUnreadMessagesCount = async (req, res) => {
  try {
    const userId = req.userData.userId;

    logger.info("getUnreadMessagesCount called", { userId });

    const count = await Message.countDocuments({
      receiver: userId,
      read: false,
    });

    logger.info("Unread messages count", { userId, count });

    res.json({ count });
  } catch (error) {
    logger.error("getUnreadMessagesCount error:", error);

    res.status(500).json({
      message: "Failed to get unread messages count",
      error: error.message,
    });
  }
};
