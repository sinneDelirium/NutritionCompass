const { Schema, model } = require("mongoose");

// Schema for an email token
const emailCodeSchema = new Schema({
  id: {
    type: Schema.Types.ObjectId, // user id
    ref: "User",
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // 1 hour
  },
});

// Create and export model
module.exports = model("EmailCode", emailCodeSchema);