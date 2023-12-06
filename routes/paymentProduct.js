var express = require("express");
var router = express.Router();
const payment_product = require("../controllers/paymentProduct.controller");
const VerifyToken = require("../config/VerifyToken"); 

router.post("/buy-now", VerifyToken, payment_product.buyNow);
router.post("/subscription_purchase", VerifyToken, payment_product.subscriptionPurchase);

router.post("/order-payment", VerifyToken, payment_product.orderPayment);
router.post("/autorize-payment", VerifyToken, payment_product.autorizePayment);
 
module.exports = router;
