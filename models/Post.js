const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
var uniqueValidator = require("mongoose-unique-validator");
const beautifyUnique = require("mongoose-beautiful-unique-validation");
var slug = require("mongoose-slug-updater");
var aggregatePaginate = require("mongoose-aggregate-paginate-v2");

const schema = mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true, default: "" },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    parent_category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },
    brandModel: { type: mongoose.Schema.Types.ObjectId, ref: "Model" },
    condition: { type: mongoose.Schema.Types.ObjectId, ref: "Condition" },
    description: { type: String, required: false, default: "" },
    price: { type: Number, required: false, default: 0 },
    discountPrice: { type: Number, required: false, default: 0 },
    shipping_fee: { type: Number, required: false, default: 0 },
    Processing_fee: { type: Number, required: false, default: 0 },
    payment_type: { type: String, required: true, default: "CASH" },
    shipping: { type: Boolean, default: true },
    buyNow: { type: Boolean, default: true },
    meetUp: { type: Boolean, default: false },
    shipping_id: { type: mongoose.Schema.Types.ObjectId, ref: "Address" },
    shipping_address: { type: Object, required: true, default: {} },
    item_information: { type: Object, required: true, default: {} },
    who_pay: { type: String, required: true, default: "Seller" },
    slug: { type: String, slug: "title", lowercase: true },
    location: {
      type: { type: String, default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    archive: { type: Boolean, default: false },
    sold: { type: Boolean, default: false },
    boost: { type: Boolean, default: false },
    boostRequest: { type: Object, default: {}, required: false },
    offer: { type: Number, required: false, default: 0 },
    view: { type: Number, required: false, default: 0 },
    soldDate: { type: Date, required: false },
    status: { type: Boolean, default: true },
    out_side_sold: { type: Boolean, default: false },
    city: { type: String, required: false, default: "Buraidah" },
    postNumber: { type: Number, required: false, default: 0 },
    updateNumber: { type: Number, required: false, default: 0 },
    lastDate: { type: Date, default: Date.now() },
    removeBuying: { type: Boolean, default: false },
    dimensionWeight: { type: Number, required: false, default: 0 },
    is_delete: { type: Boolean, required: false, default: false },
    archive_date: { type: Date, required: false },
    usersView: { type: Array, required: false, default: [] },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toObject: { getters: true, setters: true, virtuals: false },
    toJSON: { getters: true, setters: true, virtuals: false },
  }
);
schema.index({ location: "2dsphere" });
schema.plugin(uniqueValidator);
schema.plugin(beautifyUnique);
schema.plugin(mongoosePaginate);
schema.plugin(aggregatePaginate),
  schema.plugin(slug),
  (module.exports = mongoose.model("Post", schema));
