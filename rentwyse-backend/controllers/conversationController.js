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

//create
exports.startOrGetConversation = async (req, res) => {
  try {
    const { userId } = req.userData; // Sender, authenticated user
    const { recipientId, postId } = req.body; // Receiver + Post

    // Conversation is unique per (user A, user B, postId)
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, recipientId] },
      postId: postId,
    });

    if (!conversation) {
      // Start a new conversation if it does not exist for this post
      console.log("no convo");
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
    res.status(500).json({ message: "Failed to get conversation" });
  }
};


//Read
exports.getConversationMessages = async (req, res) => {
  console.log("getConversationMessages hit");
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversationId: conversationId })
      .populate("sender", "username")
      .populate("receiver", "username")
      .exec();

    res.status(200).json({ messages });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get messages", error: error.message });
  }
};

//Read
exports.getAllConversationsForUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log("conversation hit");
    // Assuming that a 'Conversation' includes an array of participant IDs
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

    res.status(200).json(conversationsWithUnread); // Send this modified array back
  } catch (error) {
    res.status(500).json({ message: "Fetching conversations failed." });
  }
};

//Update
exports.setViewingDate = async (req, res) => {
  const { viewingDate } = req.body;
  const conversationId = req.params.conversationId;
  console.log("setting a viewing date !!!");
  try {
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // Check if the user is the creator of the post linked to the conversation
    const post = await Post.findById(conversation.postId);
    if (req.userData.userId !== post.creator.toString()) {
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
    emitNotificationToUser(
      req.userData.userId,
      otherParticipantId,
      conversation._id,
      `Viewing date set for ${viewingDate}`
    );

    res.status(200).json({
      message: "Viewing date set successfully",
      viewingDate: conversation.viewingDate,
      conversation: conversation,
    });
  } catch (error) {
    console.error("Error in setViewingDate:", error);
    res
      .status(500)
      .json({ message: "Failed to set viewing date", error: error.toString() });
  }
};

async function emitNotificationToUser(
  senderId,
  receiverId,
  conversationId,
  message
) {
  try {
    const sender = await User.findById(senderId);
    const senderUsername = sender ? sender.username : "Unknown";
    console.log(senderId, receiverId, conversationId, message, senderUsername);
    const userSocketId = socket.getUserSockets()[receiverId];
    if (userSocketId) {
      socket.getIO().to(userSocketId).emit("newMessage", {
        conversationId: conversationId,
        message: message,
        sender: senderId,
        receiver: receiverId,
        senderUsername: senderUsername,
      });
    }
  } catch (err) {
    console.error("Error in emitNotificationToUser:", err);
  }
}

//Document Upload
exports.uploadAgreementDocument = async (req, res) => {
  const conversationId = req.params.conversationId;
  const documents = req.files; // This will be an array of files
  let document;

  try {
    const conversation = await Conversation.findById(conversationId).populate(
      "postId"
    );
    if (!conversation) {
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

    res.status(200).json({
      message: "Document uploaded successfully",
      documentPaths: documents.map((doc) => doc.filename), // Send back only filenames
      agreementSigned: conversation.agreementSigned,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to upload document", error: error.message });
  }
};

exports.viewDocument = (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, "..", "documents", filename);

  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    res.status(404).send("File not found");
  }
};

//Delete
exports.deleteDocument = async (req, res) => {
  const { conversationId, filename } = req.params;
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
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
    }

    res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
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

//     const salesTaxRate = getSalesTaxRate(province);
//     const serviceCharge = renegotiatedPrice * 0.1; // 10% service charge
//     const salesTax = renegotiatedPrice * salesTaxRate;
//     const totalAmount = renegotiatedPrice + serviceCharge + salesTax;

//     conversation.renegotiatedPrice = renegotiatedPrice;
//     conversation.salesTax = salesTax;
//     conversation.serviceCharge = serviceCharge;
//     conversation.totalAmount = totalAmount;
//     await conversation.save();

//     res.status(200).json({
//       message: "Invoice updated successfully",
//       invoiceDetails: {
//         renegotiatedPrice,
//         salesTax,
//         serviceCharge,
//         totalAmount,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Failed to calculate invoice", error });
//   }
// };

// // Function to return sales tax rate based on Canadian province
// function getSalesTaxRate(province) {
//   // Defining sales tax rates for each province
//   const taxRates = {
//     Alberta: 0.05, // GST
//     "British Columbia": 0.12, // GST + PST
//     Manitoba: 0.12, // GST + PST
//     "New Brunswick": 0.15, // HST
//     "Newfoundland and Labrador": 0.15, // HST
//     "Northwest Territories": 0.05, // GST
//     "Nova Scotia": 0.15, // HST
//     Nunavut: 0.05, // GST
//     Ontario: 0.13, // HST
//     "Prince Edward Island": 0.15, // HST
//     Quebec: 0.14975, // GST + QST
//     Saskatchewan: 0.11, // GST + PST
//     Yukon: 0.05, // GST
//   };

//   return taxRates[province] || 0; // Default to 0 if province not found
// }

// // endpoint in your controller to initiate a PayPal transaction

// exports.createPayPalTransaction = async (req, res) => {
//   const { conversationId } = req.body;
//   console.log("we in create paypal payment");
//   try {
//     const transaction = await createPayPalTransaction(conversationId);
//     res.status(200).json({
//       message: "PayPal transaction created successfully",
//       approvalUrl: transaction.links.find((link) => link.rel === "approve")
//         .href,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       message: "Failed to create PayPal transaction",
//       error: error.toString(),
//     });
//   }
// };

// exports.updatePaymentStatus = async (req, res) => {
//   const { conversationId } = req.body;

//   try {
//     const conversation = await Conversation.findById(conversationId);
//     if (!conversation) {
//       return res.status(404).json({ message: "Conversation not found" });
//     }

//     // Update payment status to true
//     conversation.paymentStatus = true;
//     await conversation.save();

//     res.status(200).json({ message: "Payment status updated successfully" });
//   } catch (error) {
//     res.status(500).json({ message: "Failed to update payment status", error });
//   }
// };
