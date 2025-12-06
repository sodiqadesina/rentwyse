// models/auditLog.js
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  action: { type: String, required: true }, // e.g. "BAN_USER", "UPDATE_POST_STATUS"
  targetType: {
    type: String,
    enum: ["user", "post", "conversation", "kyc", "settings"],
    required: true,
  },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  details: mongoose.Schema.Types.Mixed, // small JSON payload
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
