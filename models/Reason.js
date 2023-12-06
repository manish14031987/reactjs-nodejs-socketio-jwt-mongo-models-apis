var mongoose = require("mongoose");
var uniqueValidator = require("mongoose-unique-validator");
const beautifyUnique = require("mongoose-beautiful-unique-validation");
const mongoosePaginate = require("mongoose-paginate-v2");
var Schema = mongoose.Schema;

var Reason = new Schema(
  {
    title: { type: String, required: true },
    status: { type: Boolean, required: false, default: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
    toObject: { getters: true, setters: true, virtuals: false },
    toJSON: { getters: true, setters: true, virtuals: false },
  }
);

Reason.plugin(uniqueValidator);
Reason.plugin(beautifyUnique);
Reason.plugin(mongoosePaginate);
module.exports = mongoose.model("Reason", Reason);
