const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
var uniqueValidator = require("mongoose-unique-validator");
const beautifyUnique = require("mongoose-beautiful-unique-validation");
var slug = require("mongoose-slug-updater");
var aggregatePaginate = require("mongoose-aggregate-paginate-v2");

const schema = mongoose.Schema(
  {
    report: { type: Object, required: true },
    item: { type: Object, required: true },
    status: { type: Boolean, default: true },
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
  schema.plugin(slug),
  (module.exports = mongoose.model("ProductReport", schema));
