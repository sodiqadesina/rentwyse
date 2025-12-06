const Conversation = require("../models/conversation");
const Message = require("../models/message");
const Post = require("../models/post");
const fs = require("fs");
const path = require("path");
const socket = require("../socket");
const User = require("../models/user");

//importing paypal client

// const { paypalClient } = require("../config/papalConfig");
// const checkoutNodeJssdk = require("@paypal/checkout-server-sdk");

/**
 * Lightweight logger for this controller.
 * If you introduce a central logger (Winston/pino), you can wire it in here.
 */
const logger = {
  info: (...args) => console.log("[INFO] [ConversationController]", ...args),
  error: (...args) => console.error("[ERROR] [ConversationController]", ...args),
};

// async function createPayPalTransaction(conversationId) {
//   const client = paypalClient();
//   const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
//   request.prefer("return=representation");
//   console.log('we in the func create paypal transaction')
//   const conversation = await Conversation.findById(conversationId);
//   if (!conversation) {
//     throw new Error("Conversation not found");
//   }

//   request.requestBody({
//     intent: "CAPTURE",
//     purchase_units: [
//       {
//         amount: {
//           currency_code: "CAD",
//           value: '50',
//         },
//       },
//     ],
//   });

//   try {
//     const response = await client.execute(request);
//     return response.result;
//   } catch (err) {
//     console.error(err);
//     throw err;
//   }
// }

/**
 * Start a new conversation or fetch an existing one between
 * the authenticated user and a recipient for a specific post.
 *
 * POST /api/conversations
 *
 * Body:
 *  - recipientId: string (ObjectId of the other user)
 *  - postId     : string (ObjectId of the related post)
 */
exports.startOrGetConversation = async (req, res) => {
  try {
    const { userId } = req.userData; // Sender, authenticated user
    const { recipientId, postId } = req.body; // Receiver + Post

    logger.info("startOrGetConversation called", {
      userId,
      recipientId,
      postId,
    });

    // Conversation is unique per (user A, user B, postId)
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, recipientId] },
      postId: postId,
    });

    if (!conversation) {
      // Start a new conversation if it does not exist for this post
      logger.info("No existing conversation found, creating new one", {
        userId,
        recipientId,
        postId,
      });

      conversation = new Conversation({
        participants: [userId, recipientId],
        postId: postId,
      });
      await conversation.save();
    }

    res.status(200).json({
      message: "Conversation fetched successfully",
      conversationId: conversation._id,
      postId: postId,
    });
  } catch (error) {
    logger.error("startOrGetConversation error", error);
    res.status(500).json({ message: "Failed to get conversation" });
  }
};

/**
 * Get all messages for a specific conversation.
 *
 * GET /api/conversations/:conversationId/messages
 */
exports.getConversationMessages = async (req, res) => {
  logger.info("getConversationMessages called", {
    conversationId: req.params.conversationId,
  });

  try {
    const { conversationId } = req.params;

    const messages = await Message.find({ conversationId: conversationId })
      .populate("sender", "username")
      .populate("receiver", "username")
      .exec();

    res.status(200).json({ messages });
  } catch (error) {
    logger.error("getConversationMessages error", error);
    res
      .status(500)
      .json({ message: "Failed to get messages", error: error.message });
  }
};

/**
 * Get all conversations for a specific user, including:
 *  - Participant info
 *  - Linked post
 *  - Last message in each conversation
 *  - Unread message count
 *  - Viewing date (if set)
 *
 * GET /api/conversations/user/:userId
 */
exports.getAllConversationsForUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    logger.info("getAllConversationsForUser called", { userId });

    // Conversations that include the given user
    const conversations = await Conversation.find({ participants: userId })
      .populate("participants", "username") // Adjust the fields you want to include from the 'User' model
      .populate("postId")
      .exec();

    // Create an array to hold conversations with unread messages count
    const conversationsWithUnread = [];

    for (let conversation of conversations) {
      // Fetch the last message for each conversation
      const lastMessage = await Message.findOne({
        conversationId: conversation._id,
      })
        .sort({ createdAt: -1 })
        .populate("sender", "username")
        .populate("receiver", "username")
        .exec();

      // Count unread messages where the current user is the receiver
      const unreadCount = await Message.count({
        conversationId: conversation._id,
        receiver: userId,
        read: false,
      });

      // Combine conversation info with the last message and unread count
      conversationsWithUnread.push({
        ...conversation.toObject(),
        lastMessage,
        unreadCount, // Including the unread messages count here
        viewingDate: conversation.viewingDate ? conversation.viewingDate : null, // Include viewingDate here
      });
    }

    logger.info("getAllConversationsForUser success", {
      userId,
      count: conversationsWithUnread.length,
    });

    res.status(200).json(conversationsWithUnread); // Send this modified array back
  } catch (error) {
    logger.error("getAllConversationsForUser error", error);
    res.status(500).json({ message: "Fetching conversations failed." });
  }
};

/**
 * Set a viewing date on a conversation (e.g., agreed date to view the car),
 * only allowed by the post creator.
 *
 * PATCH /api/conversations/:conversationId/viewing-date
 *
 * Body:
 *  - viewingDate: ISO date string
 */
exports.setViewingDate = async (req, res) => {
  const { viewingDate } = req.body;
  const conversationId = req.params.conversationId;

  logger.info("setViewingDate called", {
    conversationId,
    viewingDate,
    userId: req.userData && req.userData.userId,
  });

  try {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      logger.info("setViewingDate - conversation not found", { conversationId });
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check if the user is the creator of the post linked to the conversation
    const post = await Post.findById(conversation.postId);
    if (!post) {
      logger.info("setViewingDate - post not found", {
        postId: conversation.postId,
      });
      return res.status(404).json({ message: "Post not found" });
    }

    if (req.userData.userId !== post.creator.toString()) {
      logger.info("setViewingDate - unauthorized user", {
        conversationId,
        postCreator: post.creator,
        requester: req.userData.userId,
      });
      return res
        .status(403)
        .json({ message: "Not authorized to set the viewing date" });
    }

    // Ensure viewingDate is a valid date
    if (!viewingDate || isNaN(new Date(viewingDate).getTime())) {
      return res.status(400).json({ message: "Invalid viewing date" });
    }

    conversation.viewingDate = viewingDate;
    await conversation.save();

    // Emitting an event to notify the other participant
    const otherParticipantId = conversation.participants.find(
      (p) => p.toString() !== req.userData.userId
    );

    await emitNotificationToUser(
      req.userData.userId,
      otherParticipantId,
      conversation._id,
      `Viewing date set for ${viewingDate}`
    );

    logger.info("setViewingDate success", { conversationId, viewingDate });

    res.status(200).json({
      message: "Viewing date set successfully",
      viewingDate: conversation.viewingDate,
      conversation: conversation,
    });
  } catch (error) {
    logger.error("Error in setViewingDate:", error);
    res.status(500).json({
      message: "Failed to set viewing date",
      error: error.toString(),
    });
  }
};

/**
 * Helper: emit a Socket.IO notification to a specific user for a given conversation.
 *
 * This is used for system-level notifications (viewing date set, document uploaded, etc).
 */
async function emitNotificationToUser(
  senderId,
  receiverId,
  conversationId,
  message
) {
  try {
    logger.info("emitNotificationToUser called", {
      senderId,
      receiverId,
      conversationId,
      message,
    });

    const sender = await User.findById(senderId);
    const senderUsername = sender ? sender.username : "Unknown";

    const userSocketId = socket.getUserSockets()[receiverId];
    if (userSocketId) {
      socket.getIO().to(userSocketId).emit("newMessage", {
        conversationId: conversationId,
        message: message,
        sender: senderId,
        receiver: receiverId,
        senderUsername: senderUsername,
      });
      logger.info("Notification emitted via socket", {
        receiverId,
        socketId: userSocketId,
      });
    } else {
      logger.info("No active socket for receiver, skipping emit", {
        receiverId,
      });
    }
  } catch (err) {
    logger.error("Error in emitNotificationToUser:", err);
  }
}

/**
 * Upload agreement/signed-agreement documents for a conversation.
 * Behavior:
 *  - If uploader is post creator → push to `agreementDocuments`.
 *  - Otherwise → push to `signedAgreementDocuments` and mark `agreementSigned = true`.
 *
 * POST /api/conversations/:conversationId/documents
 *
 * This expects `multer` to have attached `req.files` (array of files).
 */
exports.uploadAgreementDocument = async (req, res) => {
  const conversationId = req.params.conversationId;
  const documents = req.files; // This will be an array of files
  let document;

  logger.info("uploadAgreementDocument called", {
    conversationId,
    userId: req.userData && req.userData.userId,
    fileCount: documents ? documents.length : 0,
  });

  try {
    const conversation = await Conversation.findById(conversationId).populate(
      "postId"
    );
    if (!conversation) {
      logger.info("uploadAgreementDocument - conversation not found", {
        conversationId,
      });
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Process each uploaded document
    documents.forEach((doc) => {
      // Extract only the filename from the path
      const filename = doc.filename;

      // Check if the authenticated user is the post creator
      if (req.userData.userId === conversation.postId.creator.toString()) {
        // Post creator is uploading the agreement document
        conversation.agreementDocuments.push(filename);
        document = "Agreement Document";
      } else {
        // Other participant is uploading the signed agreement document
        conversation.signedAgreementDocuments.push(filename);
        conversation.agreementSigned = true; // Mark as signed
        document = "Signed Agreement Document";
      }
    });

    await conversation.save();

    // After uploading document, emit a notification
    const otherParticipantId = conversation.participants.find(
      (p) => p.toString() !== req.userData.userId
    );
    await emitNotificationToUser(
      req.userData.userId,
      otherParticipantId,
      conversation._id,
      `${document} uploaded`
    );

    logger.info("uploadAgreementDocument success", {
      conversationId,
      documentType: document,
    });

    res.status(200).json({
      message: "Document uploaded successfully",
      documentPaths: documents.map((doc) => doc.filename), // Send back only filenames
      agreementSigned: conversation.agreementSigned,
    });
  } catch (error) {
    logger.error("uploadAgreementDocument error", error);
    res.status(500).json({
      message: "Failed to upload document",
      error: error.message,
    });
  }
};

/**
 * Serve a document file by filename from the `documents/` folder.
 *
 * GET /api/conversations/documents/:filename
 */
exports.viewDocument = (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, "..", "documents", filename);

  logger.info("viewDocument called", { filename, filepath });

  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    logger.info("viewDocument - file not found", { filename });
    res.status(404).send("File not found");
  }
};

/**
 * Delete a document associated with a conversation from:
 *  - `agreementDocuments`
 *  - `signedAgreementDocuments`
 * and from disk as well.
 *
 * DELETE /api/conversations/:conversationId/documents/:filename
 */
exports.deleteDocument = async (req, res) => {
  const { conversationId, filename } = req.params;

  logger.info("deleteDocument called", {
    conversationId,
    filename,
    userId: req.userData && req.userData.userId,
  });

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      logger.info("deleteDocument - conversation not found", { conversationId });
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Checking if the document is in agreementDocuments and remove it
    const agreementDocIndex = conversation.agreementDocuments.indexOf(filename);
    if (agreementDocIndex !== -1) {
      conversation.agreementDocuments.splice(agreementDocIndex, 1);
    }

    // Checking if the document is in signedAgreementDocuments and remove it
    const signedAgreementDocIndex =
      conversation.signedAgreementDocuments.indexOf(filename);
    if (signedAgreementDocIndex !== -1) {
      conversation.signedAgreementDocuments.splice(signedAgreementDocIndex, 1);
    }

    await conversation.save();

    // Deleting the file from the server
    const filepath = path.join(__dirname, "..", "documents", filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      logger.info("deleteDocument - file removed from disk", { filepath });
    } else {
      logger.info("deleteDocument - file not found on disk", { filepath });
    }

    res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
    logger.error("deleteDocument error", error);
    res.status(500).json({ message: "Failed to delete document", error });
  }
};

//payment

// // Endpoint to calculate and update invoice details
// exports.calculateAndUpdateInvoice = async (req, res) => {
//   const { conversationId, renegotiatedPrice, province } = req.body;

//   try {
//     const conversation = await Conversation.findById(conversationId);
//     if (!conversation) {
//       return res.status(404).json({ message: "Conversation not found" });
//     }

//     const salesTaxRate = getSal
