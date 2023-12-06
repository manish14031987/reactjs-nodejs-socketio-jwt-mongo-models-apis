var express = require("express");
var router = express.Router();
const offer = require("../controllers/offer.controller");
const VerifyToken = require("../config/VerifyToken");
var validationRule = require("../validationRules/address");

router.post("/check", VerifyToken, offer.check);
router.post("/review", VerifyToken, offer.review);
router.post("/review/counter", VerifyToken, offer.counterReview);
router.post("/submit", VerifyToken, offer.submit);
router.get("/buying", VerifyToken, offer.buying);
router.post("/contactSeller", VerifyToken, offer.contactSeller);
router.post(
  "/set-meet-up",
  VerifyToken,
  validationRule.validate("MeetUp"),
  offer.setMeetUpLocation
);
router.post("/listing", VerifyToken, offer.offerListing);
router.post("/soldList", VerifyToken, offer.soldList);
module.exports = router;
