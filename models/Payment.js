const mongoose = require("mongoose");

const schema = mongoose.Schema(
  {
    order_id: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    type: { type: String, required: true, default: "" },
    payment_log: { type: Object, required: true, default: {} },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toObject: { getters: true, setters: true, virtuals: false },
    toJSON: { getters: true, setters: true, virtuals: false },
  }
);

module.exports = mongoose.model("Payment", schema);
