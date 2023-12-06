var express = require("express");
var router = express.Router();
const notification = require("../controllers/notification.controller");
const VerifyToken = require("../config/VerifyToken");
var validationRule = require("../validationRules/notification");

router.get("/", VerifyToken, notification.index);
router.post(
  "/",
  VerifyToken,
  validationRule.validate("Create"),
  notification.createNotification
);
router.delete("/", VerifyToken, notification.deleteAll);
router.put("/", VerifyToken, notification.update);
router.delete("/delete", VerifyToken, notification.delete);
router.post("/send_notification", VerifyToken, notification.send_notification);
router.post("/testNotification", VerifyToken, notification.testNotification);
module.exports = router;
