const { body } = require("express-validator");
const { validatorMiddleware } = require("../helpers/helpers");

module.exports.validate = (method) => {
  switch (method) {
    case "login": {
      return [
        body("email", "Please enter email/ mobile number.").isLength({
          min: 1,
        }),
        body("password", "Please enter password.").isLength({ min: 1 }),
        validatorMiddleware,
      ];
    }
    case "register": {
      return [
        body("first_name")
          .notEmpty()
          .withMessage("FIRST_NAME_EMPTY")
          .isLength({ min: 3, max: 15 })
          .withMessage("FIRST_NAME_LENGTH"),
        body("dob").notEmpty().withMessage("DOB_EMPTY"),
        body("last_name")
          .notEmpty()
          .withMessage("LAST_NAME_EMPTY")
          .isLength({ min: 3, max: 15 })
          .withMessage("LAST_NAME_LENGTH"),
        body("email")
          .notEmpty()
          .withMessage("EMAIL_EMPTY")
          .isEmail()
          .withMessage("EMAIL_VALID")
          .isLength({ min: 5 }),
        body("role_id")
          .notEmpty()
          .withMessage("ROLE_ID_EMPTY")
          .isLength({ min: 1 })
          .isNumeric(),
        body("password")
          .notEmpty()
          .withMessage("PASSWORD_EMPTY")
          .isLength({ min: 6 })
          .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/)
          .withMessage("PASSWORD_MATCHES"),
        body("mobile_number")
          .notEmpty()
          .withMessage("MOBILE_EMPTY")
          .isLength({ min: 7, max: 15 })
          .withMessage("MOBILE_LENGTH")
          .isNumeric()
          .withMessage("MOBILE_NUMERIC"),
        validatorMiddleware,
      ];
    }
    case "updateProfile": {
      return [
        body("first_name")
          .notEmpty()
          .withMessage("FIRST_NAME_EMPTY")
          .isLength({ min: 3, max: 15 })
          .withMessage("FIRST_NAME_LENGTH"),
        body("last_name")
          .notEmpty()
          .withMessage("LAST_NAME_EMPTY")
          .isLength({ min: 3, max: 15 })
          .withMessage("LAST_NAME_LENGTH"),
        body("email")
          .notEmpty()
          .withMessage("EMAIL_EMPTY")
          .isEmail()
          .withMessage("EMAIL_VALID")
          .isLength({ min: 5 }),
        body("mobile_number")
          .notEmpty()
          .withMessage("MOBILE_EMPTY")
          .isLength({ min: 7, max: 15 })
          .withMessage("MOBILE_LENGTH")
          .isNumeric()
          .withMessage("MOBILE_NUMERIC"),
        validatorMiddleware,
      ];
    }
    case "changePassword": {
      return [
        body("password")
          .notEmpty()
          .withMessage("PASSWORD_EMPTY")
          .isLength({ min: 6 })
          .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/)
          .withMessage("PASSWORD_MATCHES"),
        body("current_password")
          .notEmpty()
          .withMessage("PASSWORD_CURRENT_EMPTY")
          .isLength({ min: 6 })
          .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/)
          .withMessage("PASSWORD_CURRENT_MATCHES"),
        body("password_confirmation")
          .notEmpty()
          .withMessage("PASSWORD_CONFIRMATION_EMPTY")
          .isLength({ min: 6 })
          .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/)
          .withMessage("PASSWORD_CONFIRMATION_MATCHES"),
        validatorMiddleware,
      ];
    }
    case "forgot-password": {
      return [
        body("email", "Please enter email address.")
          .isEmail()
          .isLength({ min: 1 }),
        validatorMiddleware,
      ];
    }
    case "otpVerify": {
      return [
        body("otp").notEmpty().withMessage("OTP_EMPTY"),
        body("phone").notEmpty().withMessage("PHONE_EMPTY"),
        validatorMiddleware,
      ];
    }
    case "otpResend": {
      return [
        body("phone").notEmpty().withMessage("PHONE_EMPTY"),
        validatorMiddleware,
      ];
    }
    case "social-login": {
      return [
        body("social_id").notEmpty().withMessage("SOCIAL_ID_REQUIRED"),
        body("first_name")
          .notEmpty()
          .withMessage("FIRST_NAME_EMPTY")
          .isLength({ min: 3, max: 15 })
          .withMessage("FIRST_NAME_LENGTH"),
        body("last_name")
          .notEmpty()
          .withMessage("LAST_NAME_EMPTY")
          .isLength({ min: 3, max: 15 })
          .withMessage("LAST_NAME_LENGTH"),
        validatorMiddleware,
      ];
    }
    case "userUpdateProfile": {
      return [
        body("first_name")
          .notEmpty()
          .withMessage("FIRST_NAME_EMPTY")
          .isLength({ min: 3, max: 15 })
          .withMessage("FIRST_NAME_LENGTH"),
        body("last_name")
          .notEmpty()
          .withMessage("LAST_NAME_EMPTY")
          .isLength({ min: 3, max: 15 })
          .withMessage("LAST_NAME_LENGTH"),
        body("email")
          .notEmpty()
          .withMessage("EMAIL_EMPTY")
          .isEmail()
          .withMessage("EMAIL_VALID")
          .isLength({ min: 5 }),
        body("mobile_number")
          .notEmpty()
          .withMessage("MOBILE_EMPTY")
          .isLength({ min: 7, max: 15 })
          .withMessage("MOBILE_LENGTH")
          .isNumeric()
          .withMessage("MOBILE_NUMERIC"),
        validatorMiddleware,
      ];
    }
    case "updateLanguage": {
      return [
        body("id").notEmpty().withMessage("ID_REQUIRED"),
        body("language").notEmpty().withMessage("LANGUAGE_REQUIRED"),
        validatorMiddleware,
      ];
    }
    case "updateNotification": {
      return [
        body("id").notEmpty().withMessage("ID_REQUIRED"),
        validatorMiddleware,
      ];
    }
    case "cashOut": {
      return [
        body("amount").notEmpty().withMessage("AMOUNT_EMPTY"),
        validatorMiddleware,
      ];
    }
  }
};
