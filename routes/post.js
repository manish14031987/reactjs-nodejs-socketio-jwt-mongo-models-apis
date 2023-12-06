var express = require("express");
var router = express.Router();
const post = require("../controllers/post.controller");
const VerifyToken = require("../config/VerifyToken");
const token = require("../config/token");
var validationRule = require("../validationRules/post");

router.post(
  "/dummy",
  VerifyToken,
  validationRule.validate("Create"),
  post.createDummy
);
router.post(
  "/dummy/update",
  VerifyToken,
  validationRule.validate("Update"),
  post.updateDummy
);
router.post(
  "/submit",
  VerifyToken,
  validationRule.validate("Submit"),
  post.submitPost
);
router.post("/preview", VerifyToken, post.preview);
router.get("/", VerifyToken, post.getPost);
router.get("/editItem", VerifyToken, post.editItem);
router.delete("/image", VerifyToken, post.deletePostImage);
router.post(
  "/update",
  VerifyToken,
  validationRule.validate("Update"),
  post.updatePost
);
router.post("/details", token, post.postDetails);
router.put("/archive", VerifyToken, post.postArchive);
router.get("/archive", VerifyToken, post.archiveList);
router.delete("/", VerifyToken, post.deletePost);
router.get("/admin", VerifyToken, post.getPostList);
router.post("/create/admin", token, post.createItem);
router.patch("/", VerifyToken, post.Process);
router.all("/viewItem", VerifyToken, post.viewItem);
router.put("/admin/update", VerifyToken, post.updatePostAdmin);
router.put("/boostApply", VerifyToken, post.boostApply);
module.exports = router;
