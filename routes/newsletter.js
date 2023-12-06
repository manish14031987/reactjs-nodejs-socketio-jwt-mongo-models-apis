var express = require("express");
var router = express.Router();
const newsletter = require("../controllers/newsletter.controller");
var validationRule = require("../validationRules/newsletter");
router.post("/create", validationRule.validate("Create"), newsletter.create);

module.exports = router;
