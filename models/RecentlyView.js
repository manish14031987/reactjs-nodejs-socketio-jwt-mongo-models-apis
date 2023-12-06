const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const schema = mongoose.Schema(
  {
    user_id: { type: String },
    post_id: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toObject: { getters: true, setters: true, virtuals: false },
    toJSON: { getters: true, setters: true, virtuals: false },
  }
);

schema.plugin(mongoosePaginate),
  (module.exports = mongoose.model("RecentlyView", schema));
