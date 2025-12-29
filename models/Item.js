const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["lost", "found"],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  category: String,
  location: String,
  contact: String,
  imageUrl: String,
  status: {
    type: String,
    enum: ["open", "resolved"],
    default: "open",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Item", itemSchema);
