const Users = require("../../models/User");
const RecentlyView = require("../../models/RecentlyView");
const PostView = require("../../models/PostView");
const ReferralLog = require("../../models/ReferralLog");
const { responseData } = require("../../helpers/responseData");
var setting_service = require("../setting/settings.services");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const fs = require("fs");
var moment = require("moment");
const mongoose = require("mongoose");
var uuid = require("uuid");
const PRIVATE_KEY = fs.readFileSync("config/private.key");
const PUBLIC_KEY = fs.readFileSync("config/public.key");
const {
  generateOTP,
  sendMail,
  sendSMS,
  getUserImageUrl,
  randomString,
  createUserAtFreshdesk,
  //createUsetAtZohoBook,
} = require("../../helpers/helpers");
const { v4: uuidv4 } = require("uuid");
var email_service = require("../email/email.services");
const _ = require("lodash");
const User = require("../../models/User");

module.exports = {
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const select = {
        first_name: 1,
        password: 1,
        status: 1,
        last_name: 1,
        email: 1,
        mobile_number: 1,
        api_token: 1,
        last_login_at: 1,
        image: 1,
        department: 1,
        role_id: 1,
        sidebarMenu: 1,
        permission: 1,
      };
      var user = {};
      user.email = email;
      user.is_delete = false;
      user.role_id = [1, 2];
      Users.findOne(user, select, async function (err, result) {
        if (err || !result) {
          return res
            .status(422)
            .json(responseData("INVALID_LOGIN", {}, 422, req));
        } else {
          result.image = getUserImageUrl(result.image);
          const verified = bcrypt.compareSync(password, result.password);
          if (!verified) {
            return res
              .status(422)
              .json(responseData("INVALID_LOGIN", {}, 422, req));
          } else if (!result.status) {
            return res
              .status(422)
              .json(responseData("ACCOUNT_DEACTIVATE", {}, 422, req));
          } else {
            var unique_token = await jwt.sign({ id: result._id }, PRIVATE_KEY, {
              algorithm: "RS256",
            });
            await Users.updateOne(
              { _id: result._id },
              {
                api_token: unique_token,
                last_login_at: moment().toISOString(),
              }
            );
            result.api_token = unique_token;
            return res.json(responseData("ACCOUNT_LOGIN", result, 200, req));
          }
        }
      }).lean();
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  customerLogin: async (req, res) => {
    try {
      const { email, password, device_token } = req.body;
      const select = {
        first_name: 1,
        last_name: 1,
        email: 1,
        status: 1,
        mobile_number: 1,
        api_token: 1,
        last_login_at: 1,
        image: 1,
        backgroundImage: 1,
        role_id: 1,
        password: 1,
        emailVerify: 1,
        otpVerify: 1,
        language: 1,
        referral_code: 1,
        doffoStatus: 1,
        fbStatus: 1,
        email_notification: 1,
        notification: 1,
        device_token: 1,
      };
      var user = {
        $or: [
          {
            email: email,
          },
          {
            mobile_number: email,
          },
        ],
      };
      user.is_delete = false;
      Users.findOne(user, select, async function (err, result) {
        if (err || !result) {
          return res
            .status(422)
            .json(responseData("INVALID_LOGIN", {}, 422, req));
        } else {
          var otp = await generateOTP(6);
          var user = {};
          user.otp = otp;
          user.otpVerify = false;
          await Users.updateOne({ _id: result._id }, user);
          const userName = `${result.first_name} ${result.last_name}`;
          await sendSMS("566727010", userName, otp);

          const verified = bcrypt.compareSync(password, result.password);
          if (!verified) {
            return res
              .status(422)
              .json(responseData("INVALID_LOGIN", {}, 422, req));
          } else if (!result.otpVerify) {
            /**
             * Send OTP
             */
            var otp = await generateOTP(6);
            var user = {};
            user.otp = otp;
            user.otpVerify = false;
            await Users.updateOne({ _id: result._id }, user);
            const userName = `${result.first_name} ${result.last_name}`;
            await sendSMS(result.mobile_number, userName, otp);
            return res.status(201).json(
              responseData(
                "OTP_NOT_VERIFY",
                {
                  mobile_number: result.mobile_number,
                  otp: otp,
                  type: "AUTH",
                },
                201,
                req
              )
            );
          } else if (!result.emailVerify) {
            /**
             * Send Email
             */
            var token = uuidv4();
            var user = {};
            user.token = token;
            user.emailVerify = false;
            await Users.updateOne({ _id: result._id }, user);

            var settingsData = await setting_service.getSettingsRow();
            var options = await email_service.getEmailTemplateBySlug(
              "account-active-link",
              result.language
            );

            options.description = _.replace(
              options.description,
              "[FirstName]",
              `${result.first_name}`
            );
            options.description = _.replace(
              options.description,
              "[LastName]",
              `${result.last_name}`
            );
            options.description = _.replace(
              options.description,
              "[SITE_NAME]",
              `${settingsData.name}`
            );

            var link = `${process.env.BASE_URL}/auth/verify-email/${token}?type=AUTH`;
            options.description = _.replace(
              options.description,
              "[LINK]",
              link
            );
            options.description = _.replace(
              options.description,
              "[ACCOUNT_ACTIVATION_LINK]",
              link
            );
            options.toEmail = result.email;
            sendMail(options);
            return res
              .status(422)
              .json(responseData("EMAIL_NOT_VERIFY", {}, 422, req));
          } else if (!result.status) {
            return res
              .status(422)
              .json(responseData("ACCOUNT_DEACTIVATE", {}, 422, req));
          } else if (device_token != result.device_token) {
            /**
             * Send OTP
             */
            var otp = await generateOTP(6);
            var user = {};
            user.otp = otp;
            user.otpVerify = false;
            await Users.updateOne({ _id: result._id }, user);
            const userName = `${result.first_name} ${result.last_name}`;
            await sendSMS(result.mobile_number, userName, otp);
            return res.status(201).json(
              responseData(
                "DEVICE_NOT_VERIFY",
                {
                  mobile_number: result.mobile_number,
                  otp: otp,
                  type: "DEVICE_UPDATE",
                },
                201,
                req
              )
            );
          } else {
            var unique_token = await jwt.sign({ id: result._id }, PRIVATE_KEY, {
              algorithm: "RS256",
            });
            await Users.updateOne(
              { _id: result._id },
              {
                api_token: unique_token,
                device_token: device_token,
                last_login_at: moment().toISOString(),
              }
            );
            await RecentlyView.updateOne(
              { user_id: device_token },
              {
                user_id: result._id,
              }
            );
            await PostView.updateOne(
              { user_id: device_token },
              {
                user_id: result._id,
              }
            );
            result.api_token = unique_token;
            return res.json(responseData("ACCOUNT_LOGIN", result, 200, req));
          }
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  register: async (req, res) => {
    try {
      const request = req.body;
      const { referral_code } = req.body;
      if (referral_code) {
        var referralUser = await User.findOne(
          { referral_code: referral_code },
          { _id: 1, email: 1 }
        );
        if (!referralUser) {
          return res
            .status(422)
            .json(responseData("REFERRAL_CODE_NOT_VALID", {}, 422, req));
        }
      }
      var number = request.mobile_number.toString();
      if (parseInt(number.slice(0, 1)) === 0) {
        return res
          .status(422)
          .json(responseData("MOBILE_NUMERIC_NOT", {}, 422, req));
      }
      const passwordHash = bcrypt.hashSync(request.password, 10);
      var totalUsers = await Users.countDocuments();
      var user = new Users();
      var token = uuidv4();
      var otp = await generateOTP(6);
      if (request.password !== request.confirm_password) {
        return res
          .status(422)
          .json(responseData("PASSWORD_NOT_MATCH", {}, 422, req));
      }
      var language = req.headers.language ? req.headers.language : "en";
      user.first_name = request.first_name;
      user.last_name = request.last_name;
      user.email = request.email;
      user.userId = totalUsers + 1;
      user.role_id = request.role_id;
      user.password = passwordHash;
      user.device_token = request.device_token;
      user.mobile_number = request.mobile_number;
      user.otp = otp;
      user.token = token;
      user.emailVerify = false;
      user.otpVerify = false;
      user.language = language;
      user.dob = request.dob;
      user.referral_code = await randomString();
      user.referral_code_to = referral_code ? referral_code : null;
      user.save(async function (err, result) {
        if (err) {
          for (prop in err.errors) {
            var str = err.errors[prop].message;
            return res.status(422).json(responseData(str, {}, 422, req));
          }
        } else {
          
          //await createUsetAtZohoBook(user, "customer", "create");
          //await createUsetAtZohoBook(user, "vendor", "create");
          createUserAtFreshdesk(result);

          /**
           * save referral log
           */
          if (referral_code) {
            var userTo = {
              _id: result._id,
              email: result.email,
            };
            var referralLog = new ReferralLog();
            referralLog.user_from = referralUser;
            referralLog.user_to = userTo;
            referralLog.save();
          }
          /**
           * Send otp and email
           */
          var settingsData = await setting_service.getSettingsRow();
          const userName = `${request.first_name} ${request.last_name}`;
          await sendSMS(request.mobile_number, userName, otp);

          var options = await email_service.getEmailTemplateBySlug(
            "creates-an-account",
            language
          );

          options.description = _.replace(
            options.description,
            "[FirstName]",
            `${request.first_name}`
          );
          options.description = _.replace(
            options.description,
            "[LastName]",
            `${request.last_name}`
          );
          options.description = _.replace(
            options.description,
            "[EMAIL]",
            `${request.email}`
          );
          options.description = _.replace(
            options.description,
            "[PASSWORD]",
            `${request.password}`
          );
          options.description = _.replace(
            options.description,
            "[SITE_NAME]",
            `${settingsData.name}`
          );

          var link = `${process.env.BASE_URL}auth/verify-email/${token}?type=AUTH`;
          options.description = _.replace(options.description, "[LINK]", link);
          options.description = _.replace(
            options.description,
            "[ACCOUNT_ACTIVATION_LINK]",
            link
          );
          options.toEmail = request.email;
          sendMail(options);
          return res.json(
            responseData(
              "REGISTRATION_DONE",
              { otp: otp, phone: request.mobile_number },
              200,
              req
            )
          );
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      var user = {};
      user.email = email;
      Users.findOne(user, async function (err, result) {
        if (err || !result) {
          return res
            .status(422)
            .json(responseData("FORGOT_PASSWORD_EMAIL", {}, 422, req));
        } else {
          var otp = await generateOTP(6);
          await Users.updateOne({ _id: result._id }, { otp: otp });
          var language = req.headers.language ? req.headers.language : "en";
          /**
           * Send Email
           */
          var options = await email_service.getEmailTemplateBySlug(
            "forgot-password",
            language
          );
          options.description = _.replace(
            options.description,
            "[NAME]",
            `${result.first_name} ${result.last_name}`
          );

          options.description = _.replace(options.description, "[OTP]", otp);
          options.toEmail = result.email;

          /**
           * Send otp
           */
          const userName = `${result.first_name} ${result.last_name}`;
          await sendSMS(result.mobile_number, userName, otp);

          sendMail(options);
          return res.json(responseData("FORGOT_PASSWORD_OTP", {}, 200, req));
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  logout: async (req, res) => {
    try {
      return res.json(responseData("Logged out successfully."));
    } catch (err) {
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  updatePasswordWithOTPEmail: async (req, res) => {
    try {
      const { password, otp, check_otp } = req.body;
      Users.findOne({ otp: otp }, async function (err, result) {
        if (err || !result) {
          if (!result) {
            return res
              .status(422)
              .json(responseData("OTP_NOT_MATCH", {}, 422, req));
          }
          return res
            .status(422)
            .json(responseData("OTP_NOT_MATCH", {}, 422, req));
        } else {
          if (!check_otp) {
            const passwordHash = bcrypt.hashSync(password, 10);
            var user = {};
            user.password = passwordHash;
            user.otp = null;
            await Users.updateOne({ otp: otp }, user);
          }
          return res.json(responseData("PASSWORD_UPDATE", {}, 200, req));
        }
      });
    } catch (err) {
      return res
        .status(getDynamicErrorCode(req))
        .json(responseData(err.message, {}, getDynamicErrorCode(req)));
    }
  },
  otp_verify: async (req, res) => {
    try {
      const { phone, otp, type, device_token } = req.body;
      var search = { otp: otp };
      if (type === "UPDATE") {
        search.temporary_phone = phone;
      } else {
        search.mobile_number = phone;
      }
      Users.findOne(search, async function (err, result) {
        if (err || !result) {
          return res
            .status(422)
            .json(responseData("OTP_NOT_MATCH", {}, 422, req));
        } else {
          var user = {};
          user.otp = null;
          user.device_token = device_token;
          if (type === "UPDATE") {
            user.temporary_phone = null;
            user.mobile_number = result.temporary_phone;
          }
          user.otpVerify = true;
          user.numberDummy = false;
          var unique_token = await jwt.sign({ id: result._id }, PRIVATE_KEY, {
            algorithm: "RS256",
          });
          user.zb_buyer_synced = false;
          user.zb_seller_synced = false;
          user.zbCountBuyer = 0;
          user.zbCountSeller = 0;
          (user.api_token = unique_token),
            await Users.updateOne({ _id: result._id }, user);
          const select = {
            first_name: 1,
            last_name: 1,
            email: 1,
            status: 1,
            mobile_number: 1,
            api_token: 1,
            last_login_at: 1,
            image: 1,
            backgroundImage: 1,
            role_id: 1,
            password: 1,
            emailVerify: 1,
            otpVerify: 1,
            language: 1,
            referral_code: 1,
            doffoStatus: 1,
            fbStatus: 1,
            email_notification: 1,
            notification: 1,
          };
          const userData = await Users.findOne({ _id: result._id }, select);
          if (userData.otpVerify && userData.emailVerify) {
            await RecentlyView.updateOne(
              { user_id: device_token },
              {
                user_id: result._id,
              }
            );
            await PostView.updateOne(
              { user_id: device_token },
              {
                user_id: result._id,
              }
            );
            return res.json(responseData("OTP_VERIFY", userData, 200, req));
          } else {
            return res.json(responseData("OTP_VERIFY", userData, 200, req));
          }
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  verify_email: async (req, res) => {
    try {
      const { token, type } = req.query;
      Users.findOne({ token: token }, async function (err, result) {
        if (err || !result) {
          return res
            .status(422)
            .json(responseData("LINK_NOT_MATCH", {}, 422, req));
        } else {
          var user = {};
          user.token = null;
          user.status = true;
          user.emailVerify = true;
          user.emailDummy = false;
          if (type === "UPDATE") {
            user.email = result.temporary_email;
            user.temporary_email = null;
          }
          user.zb_buyer_synced = false;
          user.zb_seller_synced = false;
          user.zbCountBuyer = 0;
          user.zbCountSeller = 0;
          await Users.updateOne({ _id: result._id }, user);
          return res.json(responseData("EMAIL_VERIFY", {}, 200, req));
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  otp_resend: async (req, res) => {
    try {
      const { phone, type } = req.body;
      var search = {};
      if (type === "UPDATE") {
        search.temporary_phone = phone;
      } else {
        search.mobile_number = phone;
      }
      Users.findOne(search, async function (err, result) {
        if (err || !result) {
          return res
            .status(422)
            .json(responseData("PHONE_NOT_MATCH", {}, 422, req));
        } else {
          var otp = await generateOTP(6);
          var user = {};
          user.otp = otp;
          if (type === "AUTH") {
            user.otpVerify = false;
          }
          await Users.updateOne({ _id: result._id }, user);

          /**
           * Send otp
           */
          const userName = `${result.first_name} ${result.last_name}`;
          await sendSMS(result.mobile_number, userName, otp);

          return res.json(
            responseData("OTP_RESEND", { otp: otp, phone: phone }, 200, req)
          );
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  customerForgotPassword: async (req, res) => {
    try {
      const { email } = req.body;
      var user = {};
      user.email = email;
      Users.findOne(user, async function (err, result) {
        if (err || !result) {
          return res
            .status(422)
            .json(responseData("FORGOT_PASSWORD_EMAIL", {}, 422, req));
        } else {
          var otp = await generateOTP(6);
          await Users.updateOne({ _id: result._id }, { otp: otp });
          var language = req.headers.language ? req.headers.language : "en";

          const userName = `${result.first_name} ${result.last_name}`;
          await sendSMS(result.mobile_number, userName, otp);

          /**
           * Send Email
           */
          var options = await email_service.getEmailTemplateBySlug(
            "forgot-password",
            language
          );
          options.description = _.replace(
            options.description,
            "[NAME]",
            `${result.first_name} ${result.last_name}`
          );

          var forgot_link = "";
          options.description = _.replace(options.description, "[OTP]", otp);
          options.description = _.replace(
            options.description,
            "[LINK]",
            forgot_link
          );
          options.toEmail = result.email;
          sendMail(options);
          return res.json(responseData("FORGOT_PASSWORD_OTP", {}, 200, req));
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  socialLogin: async (req, res) => {
    try {
      const request = req.body;
      const select = {
        first_name: 1,
        last_name: 1,
        email: 1,
        status: 1,
        mobile_number: 1,
        api_token: 1,
        last_login_at: 1,
        image: 1,
        backgroundImage: 1,
        role_id: 1,
        password: 1,
        emailVerify: 1,
        otpVerify: 1,
        language: 1,
        referral_code: 1,
        doffoStatus: 1,
        fbStatus: 1,
        email_notification: 1,
        notification: 1,
      };
      var user = {};
      var fbStatus = false;
      if (request.type === "fb") {
        fbStatus = true;
      }
      if (request.email) {
        user.email = request.email;
      } else {
        user.social_id = request.social_id;
      }
      user.role_id = 3;
      Users.findOne(user, select, async function (err, result) {
        if (result) {
          var userItem = await User.findOne(
            { _id: result._id },
            { numberDummy: 1, emailDummy: 1 }
          );
          var unique_token = await jwt.sign({ id: result._id }, PRIVATE_KEY, {
            algorithm: "RS256",
          });
          await Users.updateOne(
            { _id: result._id },
            {
              api_token: unique_token,
              device_token: request.device_token,
              login_type: request.social_type,
              device_type: request.device_type,
              social_id: request.social_id,
              fbStatus: fbStatus,
              last_login_at: moment().toISOString(),
            }
          );
          result.fbStatus = fbStatus;
          result.api_token = unique_token;
          await RecentlyView.updateOne(
            { user_id: request.device_token },
            {
              user_id: result._id,
            }
          );
          await PostView.updateOne(
            { user_id: request.device_token },
            {
              user_id: result._id,
            }
          );
          if (userItem.emailDummy) {
            result.email = "";
          }
          if (userItem.numberDummy) {
            result.mobile_number = "";
          }
          return res.json(responseData("ACCOUNT_LOGIN", result, 200, req));
        } else {
          var totalUsers = await Users.countDocuments();
          var userSave = new Users();
          userSave.first_name = request.first_name;
          userSave.last_name = request.last_name;
          userSave.userId = totalUsers;
          if (request.email) {
            userSave.email = request.email;
            userSave.emailVerify = true;
            userSave.email_notification = true;
            userSave.emailDummy = false;
          } else {
            userSave.emailVerify = false;
            userSave.email_notification = false;
            userSave.emailDummy = true;
            userSave.email = `${Math.floor(
              100000 + Math.random() * 900000
            )}-doffo@doffo.com`;
          }
          userSave.mobile_number = Math.floor(100000 + Math.random() * 900000);
          userSave.numberDummy = true;
          userSave.role_id = request.role_id;
          userSave.device_token = request.device_token;
          userSave.device_type = request.device_type;
          userSave.social_id = request.social_id;
          userSave.token = request.token;
          userSave.otpVerify = false;
          userSave.language = req.headers.language;
          userSave.fbStatus = fbStatus;
          userSave.api_token = unique_token;
          userSave.login_type = request.social_type;
          userSave.password = Math.floor(100000 + Math.random() * 900000);
          userSave.referral_code = await randomString();
          userSave.save(async function (err, result) {
            if (err) {
              for (prop in err.errors) {
                var str = err.errors[prop].message;
                return res.status(422).json(responseData(str, {}, 422, req));
              }
            } else {
              createUserAtFreshdesk(result);
              var userData = await Users.findOne({ _id: result._id }, select);
              var userItem = await User.findOne(
                { _id: result._id },
                { numberDummy: 1, emailDummy: 1 }
              );
              var unique_token = await jwt.sign(
                { id: userData._id },
                PRIVATE_KEY,
                {
                  algorithm: "RS256",
                }
              );
              await Users.updateOne(
                { _id: userData._id },
                {
                  api_token: unique_token,
                  last_login_at: moment().toISOString(),
                }
              );
              userData.api_token = unique_token;
              if (userItem.emailDummy) {
                userData.email = "";
              }
              if (userItem.numberDummy) {
                userData.mobile_number = "";
              }
              //createUsetAtZohoBook(userSave, "customer", "create");
              //createUsetAtZohoBook(userSave, "vendor", "create");
              return res.json(
                responseData("ACCOUNT_LOGIN", userData, 200, req)
              );
            }
          });
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  mySettings: async (req, res) => {
    try {
      var user = {};
      user.role_id = 3;
      Users.find(user, async function (err, result) {
        if (err || !result) {
          return res
            .status(422)
            .json(responseData("FORGOT_PASSWORD_EMAIL", {}, 422, req));
        } else {
          var language = req.headers.language ? req.headers.language : "en";
          var options = await email_service.getEmailTemplateBySlug(
            "security-alert-for-customer",
            language
          );

          result.forEach(async (data) => {
            // var otp = await generateOTP(6);
            var otp = uuid.v4();
            var security = {};
            security.otp = otp;
            security.password = null;
            Users.updateOne({ _id: data._id }, security);

            options.description = _.replace(
              options.description,
              "[NAME]",
              `${data.first_name} ${data.last_name}`
            );

            var reset_link = `${process.env.BASE_URL}reset-password/?otp=${otp}`;
            options.description = _.replace(
              options.description,
              "[LINK]",
              reset_link
            );
            options.description = _.replace(
              options.description,
              "[ACCOUNT_LINK]",
              reset_link
            );
            options.toEmail = data.email;
            sendMail(options);
          });
          return res.json(responseData("SECURITY_OTP", {}, 200, req));
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  socialLoginIOS: async (req, res) => {
    try {
      const request = req.body;
      const select = {
        first_name: 1,
        last_name: 1,
        email: 1,
        status: 1,
        mobile_number: 1,
        api_token: 1,
        last_login_at: 1,
        image: 1,
        backgroundImage: 1,
        role_id: 1,
        password: 1,
        emailVerify: 1,
        otpVerify: 1,
        language: 1,
        referral_code: 1,
        doffoStatus: 1,
        fbStatus: 1,
        email_notification: 1,
        notification: 1,
      };
      var user = {};
      user.social_id = request.social_id;
      user.role_id = 3;
      Users.findOne(user, select, async function (err, result) {
        if (result) {
          var userItem = await User.findOne(
            { _id: result._id },
            { numberDummy: 1, emailDummy: 1 }
          );
          var unique_token = await jwt.sign({ id: result._id }, PRIVATE_KEY, {
            algorithm: "RS256",
          });
          await Users.updateOne(
            { _id: result._id },
            {
              api_token: unique_token,
              device_token: request.device_token,
              login_type: request.social_type,
              device_type: request.device_type,
              social_id: request.social_id,
              last_login_at: moment().toISOString(),
            }
          );
          result.api_token = unique_token;
          await RecentlyView.updateOne(
            { user_id: request.device_token },
            {
              user_id: result._id,
            }
          );
          await PostView.updateOne(
            { user_id: request.device_token },
            {
              user_id: result._id,
            }
          );
          if (userItem.emailDummy) {
            result.email = "";
          }
          if (userItem.numberDummy) {
            result.mobile_number = "";
          }
          return res.json(responseData("ACCOUNT_LOGIN", result, 200, req));
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  SecurityUser: async (req, res) => {
    try {
      var userdata = req.query;
      var userId = userdata.id;
      var user = {};
      user._id = mongoose.Types.ObjectId(userId);
      Users.findOne(user, async function (err, result) {
        if (err || !result) {
          return res
            .status(422)
            .json(responseData("FORGOT_PASSWORD_EMAIL", {}, 422, req));
        } else {
          //console.log(result);
          var language = req.headers.language ? req.headers.language : "en";
          var options = await email_service.getEmailTemplateBySlug(
            "security-alert-for-customer",
            language
          );
          // var otp = await generateOTP(6);
          var otp = uuid.v4();
          var security = {};
          security.otp = otp;
          security.password = null;
          console.log(security);
          await Users.updateOne(
            { _id: mongoose.Types.ObjectId(userId) },
            security
          );

          options.description = _.replace(
            options.description,
            "[NAME]",
            `${result.first_name} ${result.last_name}`
          );

          var reset_link = `${process.env.BASE_URL}reset-password/?otp=${otp}`;
          options.description = _.replace(
            options.description,
            "[LINK]",
            reset_link
          );
          options.description = _.replace(
            options.description,
            "[ACCOUNT_LINK]",
            reset_link
          );
          options.toEmail = result.email;
          sendMail(options);

          return res.json(responseData("SECURITY_OTP", {}, 200, req));
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  userLoginSSO: async (req, res) => {
    try {
      const { nonce, state, tokenA } = req.query;
	  if(tokenA){
			jwt.verify(tokenA, PUBLIC_KEY, async function (err, decoded) {
				let decodedId   =   mongoose.Types.ObjectId(decoded.id);
				var userData 	= 	await User.findOne(
					{ _id: decodedId },
					{ _id: 1, email: 1 }
				);
				
				////
				
				
				var token = await jwt.sign(
					{
					  sub: "123456789",
					  email: String(userData.email),
					  given_name: "AnilSharma",
					  family_name: "VarunSharma",
					  iat: moment().valueOf(),
					  nonce: nonce,
					},
					PRIVATE_KEY,
			 		{
					  algorithm: "RS256",
					} 
				  );
				  const url =
					"https://doffo-team.myfreshworks.com/sp/OIDC/488298717388578355/implicit?state=" +
					state +
					"&id_token=" +
					token;
				
				
				
				////
				
				
				
				
				
				return res.status(200).json({ url: url }); //res.json(responseData("ACCOUNT_LOGIN", userData, 200, req));				
			});
	  }else{
		 	
		  res.render("userLoginSSO", { url: "" }); 
	  }
      
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
};
