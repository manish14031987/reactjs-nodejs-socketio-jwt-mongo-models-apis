const { body } = require("express-validator");
const { validatorMiddleware } = require("../helpers/helpers");

module.exports.validate = (method) => {
  switch (method) {
    case "Create": {
      return [
        body("tranId").notEmpty().withMessage("TRAN_ID_REQUIRED"),
        body("payId").notEmpty().withMessage("PAY_ID_REQUIRED"),
        body("cardToken").notEmpty().withMessage("CARD_TOKEN_REQUIRED"),
        body("cardBrand").notEmpty().withMessage("CARD_BRAND_REQUIRED"),
        body("maskedCardNo").notEmpty().withMessage("CARD_NUMBER_REQUIRED"),
        validatorMiddleware,
      ];
    }
    case "Delete": {
      return [
        body("id").notEmpty().withMessage("ID_EMPTY"),
        validatorMiddleware,
      ];
    }
    case "isDefault": {
      return [
        body("id").notEmpty().withMessage("ID_EMPTY"),
        validatorMiddleware,
      ];
    }
  }
};
