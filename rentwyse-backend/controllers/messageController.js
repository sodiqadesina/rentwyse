const Message = require("../models/message");
const Conversation = require("../models/conversation");
const User = require("../models/user");
const socket = require("../socket");


//Create
exports.createMessage = async (req, res) => {
  try {
    const { conversationId, receiver, content } = req.body;
    const sender = req.userData.userId;
    //console.log(req.body.conversationId);

    let conversation;
    if (conversationId) {
      // If conversationId is provided, use it to find the conversation
      conversation = await Conversation.findById(conversationId);
    } else if (receiver) {
      // If it's a new conversation, check if one exists between the sender and receiver or create a new one
      conversation = await Conversation.findOne({
        participants: { $all: [sender, receiver] },
      });

      if (!conversation) {
        conversation = new Conversation({
          participants: [sender, receiver],
        });
        await conversation.save();
      }
    } else {
      throw new Error("A receiver or conversationId must be provided");
    }

    // Create and save the message
    const message = new Message({
      conversationId: conversation._id,
      sender,
      receiver, // This can be undefined if conversationId is provided
      content,
    });
    await message.save();

    // Send notification to the specific user
    let userSockets = socket.getUserSockets();
    console.log(userSockets);
    console.log(req.body.receiver);
    let receiverSocketId = userSockets[req.body.receiver]; // 'receiver' should be the user ID of the recipient
    console.log("receiver sid " + receiverSocketId);

    //getting senders username
    const senderDetails = await User.findById(sender);
    let senderUsername = senderDetails.username;
    console.log("sender username = " + senderUsername);

    if (receiverSocketId) {
      // User is online, emit the message right away
      console.log("we got here");
      const io = socket.getIO();
      io.to(receiverSocketId).emit("newMessage", {
        conversationId: conversation._id,
        message: content,
        sender: sender,
        receiver: receiver,
        senderUsername: senderUsername,
      });
    } else {
      // User is offline, queue the message
      console.log("Queueing message for offline user");
      socket.addQueuedMessage(receiver, {
        conversationId: conversation._id,
        message: content,
        sender: sender,
        receiver: receiver,
        senderUsername: senderUsername,
      });
    }
    res
      .status(201)
      .json({ message: "Message sent successfully", messageId: message._id });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to send message", error: error.message });
  }
};

//Read
exports.getMessagesForUser = async (req, res) => {
  // Implement logic to get all messages for a user
};

// Endpoint to mark messages as read
exports.readMessagesInConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.userData.userId;
    console.log("a user read a message");
    const result = await Message.updateMany(
      { conversationId: conversationId, receiver: userId, read: false },
      { $set: { read: true } }
    );

    // Send 204 No Content if successful since no content is returned
    if (result.nModified > 0) {
      res.status(204).send();
    } else {
      // No messages were updated, possibly because they were already marked as read
      res.status(200).json({ message: "No messages to update" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update messages", error: error.message });
  }
};

//Read
exports.getUnreadMessagesCount = async (req, res) => {
  try {
    const userId = req.userData.userId;
    const count = await Message.countDocuments({
      receiver: userId,
      read: false,
    });
    console.log(count);
    res.json({ count });
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Failed to get unread messages count",
        error: error.message,
      });
  }
};
