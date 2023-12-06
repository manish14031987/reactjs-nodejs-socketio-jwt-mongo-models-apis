var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var ReferralLog = new Schema(
  {
    user_from: { type: Object },
    user_to: { type: Object },
    status: { type: Boolean, required: false, default: false },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

module.exports = mongoose.model("ReferralLog", ReferralLog);
