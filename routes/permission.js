var express = require("express");
var router = express.Router();
const permission = require("../controllers/permission.controller");
const VerifyToken = require("../config/VerifyToken");
var validationRule = require("../validationRules/permission");

router.post("/save", VerifyToken, permission.save);
router.post(
  "/",
  VerifyToken,
  validationRule.validate("Create"),
  permission.create
);
router.put(
  "/",
  VerifyToken,
  validationRule.validate("Update"),
  permission.update
);
router.get("/", VerifyToken, permission.Index);
router.delete(
  "/",
  VerifyToken,
  validationRule.validate("Delete"),
  permission.Delete
);
router.patch(
  "/",
  VerifyToken,
  validationRule.validate("Delete"),
  permission.Process
);

module.exports = router;
