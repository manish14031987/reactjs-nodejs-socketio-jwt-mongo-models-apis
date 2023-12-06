var express = require("express");
var router = express.Router();
const order = require("../controllers/order.controller");
const VerifyToken = require("../config/VerifyToken");
var validationRule = require("../validationRules/order");

router.post(
  "/purchase",
  VerifyToken,
  validationRule.validate("Purchase"),
  order.purchase
);
router.get("/", VerifyToken, order.getListing);
router.get("/selling", VerifyToken, order.getSellingListing);
router.post("/details", VerifyToken, order.getDetails);
router.get("/getShippingLabel", VerifyToken, order.getShippingLabel);
router.get("/getPickupInformation", VerifyToken, order.getPickupInformation);
router.delete("/cancelShipment", VerifyToken, order.cancelShipment);
router.delete("/cancelPickup", VerifyToken, order.cancelPickup);
router.post("/soldItem", VerifyToken, order.soldItem);
router.post("/returnRequest", VerifyToken, order.returnRequest);
router.post("/cancel", VerifyToken, order.cancelOrder);
router.get("/admin", VerifyToken, order.orderList);
router.post("/rejectItem", VerifyToken, order.rejectItem);
router.post("/approveItem", VerifyToken, order.approveItem);
router.post("/checkShipment", VerifyToken, order.checkShipment);

module.exports = router;
