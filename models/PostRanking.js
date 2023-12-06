const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
var uniqueValidator = require("mongoose-unique-validator");

const schema = mongoose.Schema(
  {
    category_id: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    brand_id: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
    category: { type: Object, required: false, default: {} },
    brand: { type: Object, required: false, default: {} },
    count: { type: Number, required: false, default: 0 },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toObject: { getters: true, setters: true, virtuals: false },
    toJSON: { getters: true, setters: true, virtuals: false },
  }
);
schema.plugin(uniqueValidator);
schema.plugin(mongoosePaginate);
module.exports = mongoose.model("postRanking", schema);
