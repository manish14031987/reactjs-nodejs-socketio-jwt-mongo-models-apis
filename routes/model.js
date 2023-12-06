var express = require("express");
var router = express.Router();
const model = require("../controllers/model.controller");
const VerifyToken = require("../config/VerifyToken");
var validationRule = require("../validationRules/brand");

router.post("/", VerifyToken, validationRule.validate("Create"), model.create);
router.put("/", VerifyToken, validationRule.validate("Update"), model.update);
router.get("/", VerifyToken, model.Index);
router.get("/get-model", VerifyToken, model.modelGet);
router.delete(
  "/",
  VerifyToken,
  validationRule.validate("Delete"),
  model.Delete
);
router.patch(
  "/",
  VerifyToken,
  validationRule.validate("Delete"),
  model.Process
);
router.get("/listing", model.modelListing);

module.exports = router;
