const { body } = require("express-validator");
const { validatorMiddleware } = require("../helpers/helpers");

module.exports.validate = (method) => {
  switch (method) {
    case "index": {
      return [
        body("user_id").notEmpty().withMessage("ID_REQUIRED"),
        validatorMiddleware,
      ];
    }
    case "Create": {
      return [
        body("title")
          .notEmpty()
          .withMessage("TITLE_REQUIRED")
          .isLength({ min: 3, max: 150 })
          .withMessage("TITLE_LENGTH"),
        body("address")
          .notEmpty()
          .withMessage("ADDRESS_REQUIRED")
          .isLength({ min: 10, max: 300 })
          .withMessage("ADDRESS_LENGTH"),
        body("street_name")
          .notEmpty()
          .withMessage("STREET_NAME_REQUIRED")
          .isLength({ min: 1, max: 35 })
          .withMessage("STREET_NAME_LENGTH"),
        body("apartment_name")
          .notEmpty()
          .withMessage("APARTMENT_NAME_REQUIRED")
          .isLength({ min: 1, max: 35 })
          .withMessage("APARTMENT_NAME_LENGTH"),
        body("city")
          .notEmpty()
          .withMessage("CITY_REQUIRED")
          .isLength({ min: 3, max: 50 })
          .withMessage("CITY_LENGTH"),
        body("district")
          .notEmpty()
          .withMessage("DISTRICT_REQUIRED")
          .isLength({ min: 3, max: 50 })
          .withMessage("DISTRICT_LENGTH"),

        body("postal_code")
          .notEmpty()
          .withMessage("POSTAL_CODE_REQUIRED")
          .isLength({ min: 1, max: 9 })
          .withMessage("POSTAL_CODE_LENGTH"),
        validatorMiddleware,
      ];
    }
    case "Update": {
      return [
        body("id").notEmpty().withMessage("ID_EMPTY"),
        body("title")
          .notEmpty()
          .withMessage("TITLE_REQUIRED")
          .isLength({ min: 3, max: 150 })
          .withMessage("TITLE_LENGTH"),
        body("address")
          .notEmpty()
          .withMessage("ADDRESS_REQUIRED")
          .isLength({ min: 10, max: 300 })
          .withMessage("ADDRESS_LENGTH"),
        body("street_name")
          .notEmpty()
          .withMessage("STREET_NAME_REQUIRED")
          .isLength({ min: 1, max: 35 })
          .withMessage("STREET_NAME_LENGTH"),
        body("apartment_name")
          .notEmpty()
          .withMessage("APARTMENT_NAME_REQUIRED")
          .isLength({ min: 1, max: 35 })
          .withMessage("APARTMENT_NAME_LENGTH"),
        body("city")
          .notEmpty()
          .withMessage("CITY_REQUIRED")
          .isLength({ min: 3, max: 50 })
          .withMessage("CITY_LENGTH"),
        body("district")
          .notEmpty()
          .withMessage("DISTRICT_REQUIRED")
          .isLength({ min: 3, max: 50 })
          .withMessage("DISTRICT_LENGTH"),

        body("postal_code")
          .notEmpty()
          .withMessage("POSTAL_CODE_REQUIRED")
          .isLength({ min: 1, max: 9 })
          .withMessage("POSTAL_CODE_LENGTH"),
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
    case "MeetUp": {
      return [
        body("order_id").notEmpty().withMessage("ORDER_EMPTY"),
        body("location_name")
          .notEmpty()
          .withMessage("LOCATION_NAME_REQUIRED")
          .isLength({ min: 3, max: 500 })
          .withMessage("LOCATION_NAME_LENGTH"),
        body("date").notEmpty().withMessage("DATE_REQUIRED"),
        body("time").notEmpty().withMessage("TIME_REQUIRED"),

        validatorMiddleware,
      ];
    }
  }
};
