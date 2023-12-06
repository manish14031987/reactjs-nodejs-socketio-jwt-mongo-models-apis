const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
var uniqueValidator = require("mongoose-unique-validator");
const beautifyUnique = require("mongoose-beautiful-unique-validation");
var aggregatePaginate = require("mongoose-aggregate-paginate-v2");

const schema = mongoose.Schema(
  {
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    title: { type: String, required: true },
    isMain: { type: Boolean, default: false },
    index: { type: Number, default: 1 },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toObject: { getters: true, setters: true, virtuals: false },
    toJSON: { getters: true, setters: true, virtuals: false },
  }
);
schema.plugin(uniqueValidator);
schema.plugin(beautifyUnique);
schema.plugin(mongoosePaginate);
schema.plugin(aggregatePaginate),
  (module.exports = mongoose.model("PostImage", schema));
