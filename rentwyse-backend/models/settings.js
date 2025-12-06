// models/settings.js
const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    serviceCharge: { type: Number, default: 0 }, // percentage or flat – your choice
    salesTax: { type: Number, default: 13 },      // e.g. 13 for 13%
    currency: { type: String, default: "CAD" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);
