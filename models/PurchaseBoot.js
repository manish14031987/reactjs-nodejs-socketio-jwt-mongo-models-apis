const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
var uniqueValidator = require("mongoose-unique-validator");
var aggregatePaginate = require("mongoose-aggregate-paginate-v2");

const schema = mongoose.Schema(
  {
    user: { type: mongoose.ObjectId, refPath: "users" },
    post: { type: mongoose.ObjectId, refPath: "posts" },
    subscription: { type: mongoose.ObjectId, refPath: "subscriptions" },
    paymentData: { type: Object, required: true },
    end_date: { type: Date, required: true },
    start_date: { type: Date, required: true },
    amount: { type: Number, required: true },
    status: { type: Boolean, required: false },
    invoice_number: { type: Number, required: true },
    walletUse: { type: Boolean, default: false },
    wallet_amount: { type: Number, default: 0 },
    boot: { type: Object, required: true },
    zoho_invoice_id: { type: String, required: false, default: "0" },
    zoho_invoice_number: { type: String, required: false, default: "0" },
    zoho_invoice_sent: { type: String, required: false, default: "0" },
    zoho_payment_id: { type: String, required: false, default: "0" },
    zoho_payment_number: { type: String, required: false, default: "0" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

schema.plugin(uniqueValidator);
schema.plugin(mongoosePaginate);
schema.plugin(aggregatePaginate);
module.exports = mongoose.model("PurchaseBoot", schema);
