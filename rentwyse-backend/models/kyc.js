// models/kyc.js
const mongoose = require("mongoose");

const kycSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  documents: [
    {
      filePath: String,
      type: String, // "id-card", "driver-license", etc
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  adminNote: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // admin
  reviewedAt: Date,
  createdAt: { type: Date, default: Date.now },
});
