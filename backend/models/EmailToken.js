const { Schema, model } = require("mongoose");

// Schema for an email token
const emailTokenSchema = new Schema({
  id: {
    type: Schema.Types.ObjectId, // user id
    ref: "User",
    required: true,
  },
  token: {
    type: String, // generated by crypto.randomBytes(n).toString("hex")
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // 1 hour
  },
});

// Create and export model
module.exports = model("EmailToken", emailTokenSchema);