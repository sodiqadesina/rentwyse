const express = require("express");
const router = express.Router();
const ConversationController = require("../controllers/conversationController");
const checkAuth = require("../middleware/check-auth");
const documentUpload = require("../middleware/documents");

// Route to start a new conversation or get an existing one
router.post("/start", checkAuth, ConversationController.startOrGetConversation);

// Route to get the messages of a conversation
router.get(
  "/:conversationId/messages",
  checkAuth,
  ConversationController.getConversationMessages
);

router.get("/user/:userId", ConversationController.getAllConversationsForUser);

router.post(
  "/:conversationId/setViewingDate",
  checkAuth,
  ConversationController.setViewingDate
);

//route to upload agreement documents
router.post(
  "/:conversationId/upload-document",
  checkAuth,
  documentUpload,
  ConversationController.uploadAgreementDocument
);

// View Document
router.get(
  "/documents/:filename",
  checkAuth,
  ConversationController.viewDocument
);

// Delete Document
router.delete(
  "/:conversationId/delete-document/:filename",
  checkAuth,
  ConversationController.deleteDocument
);

// //payment
// // Route to calculate and update invoice
// router.post(
//   "/:conversationId/calculate-invoice",
//   checkAuth,
//   ConversationController.calculateAndUpdateInvoice
// );

// // Route to create a PayPal transaction
// router.post(
//   "/create-paypal-transaction",
//   checkAuth,
//   ConversationController.createPayPalTransaction
// );

// // Route to update payment status
// router.patch(
//   "/:conversationId/update-payment-status",
//   checkAuth,
//   ConversationController.updatePaymentStatus
// );

module.exports = router;
