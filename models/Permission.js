var mongoose = require("mongoose");
var uniqueValidator = require("mongoose-unique-validator");
const mongoosePaginate = require("mongoose-paginate-v2");
var Schema = mongoose.Schema;
const config = require("../config/config");
const fs = require("fs");

function status(val) {
  return val === 1 ? true : false;
}
function imageURL(image) {
  const path = config.CATEGORY + "/" + image;
  if (fs.existsSync(path)) {
    return process.env.API_PATH + config.CATEGORY_IMAGE_PATH + "/" + image;
  } else {
    return process.env.API_PATH + config.CATEGORY_DEFULTY_IMAGE;
  }
}

var Permission = new Schema(
  {
    name: String,
    slug: { type: String, index: true },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "Category",
    },
    ancestors: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
          index: true,
        },
        name: String,
        slug: String,
      },
    ],
    image: { type: String, get: imageURL, required: false },
    status: { type: Number, get: status, required: false, default: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toObject: { getters: true, setters: true, virtuals: false },
    toJSON: { getters: true, setters: true, virtuals: false },
  }
);

Permission.plugin(uniqueValidator, {
  message: "{PATH} is already registered.",
});
Permission.plugin(mongoosePaginate);
module.exports = mongoose.model("Permission", Permission);
