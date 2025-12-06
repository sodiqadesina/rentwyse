const mongoose = require("mongoose");

const conversationSchema = mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  ],
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
  },
  viewingDate: { type: Date },
  agreementDocuments: [
    {
      type: String, // URL or path to the document
      required: false,
    },
  ],
  renegotiatedPrice: {
    type: Number,
    required: false,
  },
  agreementSigned: {
    type: Boolean,
    default: false,
  },
  signedAgreementDocuments: [
    {
      type: String, // URL or path to the signed document
      required: false,
    },
  ],
  salesTax: { type: Number, required: false },
  serviceCharge: { type: Number, required: false },
  totalAmount: { type: Number, required: false },
  paymentStatus: { type: Boolean, default: false },
  receipt: {
      renegotiatedPrice: Number,
      serviceCharge: Number,
      salesTax: Number,
      totalAmount: Number
  },
  status: {
    type: String,
    enum: ["open", "closed", "flagged"],
    default: "open",
  },
  hasAgreement: { type: Boolean, default: false },
  hasDocuments: { type: Boolean, default: false },
  lastMessageAt: { type: Date },
});

module.exports = mongoose.model("Conversation", conversationSchema);
