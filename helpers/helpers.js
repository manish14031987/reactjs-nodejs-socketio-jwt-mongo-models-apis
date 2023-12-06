const { validationResult } = require("express-validator");
const { responseData } = require("./responseData");
const { ucFirst } = require("./ucFirst");
const config = require("../config/config");
const City = require("../models/City");
const Order = require("../models/Order");
const User = require("../models/User");
const Setting = require("../models/Setting");
const PurchaseBoot = require("../models/PurchaseBoot");
var moment = require("moment");
var path = require("path");
const fs = require("fs");
const Resize = require("./Resize");
const ResizePost = require("./ResizePost");

const nodemailer = require("nodemailer");
const Notification = require("../models/Notification");
const _ = require("lodash");
const mongoose = require("mongoose");
const email_service = require("../services/email/email.services");
let transporter = nodemailer.createTransport(config.NodeMailerTransport);
var FCM = require("fcm-node");
const { parseInt } = require("lodash");
const axios = require("axios").default;
var logger = require("../utils/logger").Logger;

const getShippingAgent = axios.create({
  baseURL: "https://wwwcie.ups.com/",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    AccessLicenseNumber: "5DABC754D3A1659A",
    Username: "Doffotrading",
    Password: "Alamoudi@1234",
  },
});

module.exports = {
  sendNotification: async (request) => {
    const { user, message, action, title, isMail } = request;

    /**
     * Save notification
     */

    var notification = new Notification();
    notification.title = title;
    notification.description = message;
    notification.action = action;
    notification.user_id = user._id;
    notification.save();

    /**
     * Send email
     */
    if (isMail) {
      var options = await email_service.getEmailTemplateBySlug("notification");
      options.description = _.replace(
        options.description,
        "[FirstName]",
        user.first_name
      );
      options.description = _.replace(
        options.description,
        "[LastName]",
        user.last_name
      );
      options.description = _.replace(options.description, "[ACTION]", message);
      options.toEmail = user.email;
      let sendObj = {
        from: `${process.env.APP_NAME} <${process.env.fromEmail}>`,
        to: options.toEmail,
        subject: options.subject,
        html: options.description,
      };
      try {
        await transporter.sendMail(sendObj);
      } catch (err) {
        console.log("SMTP Error ==>", err.message);
      }
    }

    /**
     * send push notification
     */
    var serverKey = process.env.FCM_TOKEN;
    var fcm = new FCM(serverKey);
    var sendMessage = {
      to: user.device_token,
      notification: { title: title, body: message },
    };
    fcm.send(sendMessage, function (err, response) {
      if (err) {
        console.log("FCM Err ==>", err);
      } else {
        console.log("Successfully sent with response: ", response);
      }
    });

    return true;
  },
  sendPushNotification: async (request) => {
    const { user, message, title, type, roomId, orderId, isMail } = request;

    /**
     * Send email
     */
    if (isMail) {
      var options = await email_service.getEmailTemplateBySlug("notification");
      options.description = _.replace(
        options.description,
        "[FirstName]",
        user.first_name
      );
      options.description = _.replace(
        options.description,
        "[LastName]",
        user.last_name
      );
      options.description = _.replace(options.description, "[ACTION]", message);
      options.toEmail = user.email;
      let sendObj = {
        from: `${process.env.APP_NAME} <${process.env.fromEmail}>`,
        to: options.toEmail,
        subject: options.subject,
        html: options.description,
      };
      try {
        await transporter.sendMail(sendObj);
      } catch (err) {
        console.log("SMTP Error ==>", err.message);
      }
    }

    /**
     * send push notification
     */
    var serverKey = process.env.FCM_TOKEN;
    var fcm = new FCM(serverKey);

    var sendMessage = {
      to: user.device_token,
      notification: {
        title: title,
        body: message,
        type: type,
        roomId: roomId,
        orderId: orderId,
        count: 0,
        sound: "default",
      },
      data: {
        title: title,
        body: message,
        type: type,
        roomId: roomId,
        orderId: orderId,
        count: 0,
        sound: "default",
      },
    };
    fcm.send(sendMessage, function (err, response) {
      if (err) {
        console.log("FCM Err ==>", err);
      } else {
        console.log("Successfully sent with response: ", response);
      }
    });

    return true;
  },
  validatorMiddleware: (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(422)
        .json(responseData(errors.errors[0].msg, {}, 422, req));
    } else {
      next();
    }
  },
  sendSMS: async (mobile, name, otp) => {
    const otpMessage = `Doffo OTP: ${otp}. For your safety don't share the code.
      من أجل سلامتك لا تشارك الرمز.`;
    /**
     * Send SMS
     */
    //var url = `${config.SMS.url}ApiKey=${config.SMS.ApiKey}&api_id=${config.SMS.ClientId}&SenderId=${config.SMS.SenderId}&Message=${otpMessage}$MobileNumbers=+966566727010`;
    var url = `${config.SMS.url}?api_id=${config.SMS.api_id}&api_password=${config.SMS.api_password}&sms_type=P&encoding=T&sender_id=${config.SMS.SenderId}&phonenumber=+966${mobile}&textmessage=${otpMessage}`;
    await axios
      .get(url)
      .then(function (response) {
        console.log("SMS response ==>", response.data);
      })
      .catch(function (error) {
        console.log("SMS error ==>", error.message);
      });
    return true;
  },
  sendMail: async (option) => {
    let sendObj = {
      from: `${process.env.APP_NAME} <${process.env.fromEmail}>`,
      to: option.toEmail,
      subject: ucFirst(option.subject),
      html: option.description,
    };
    try {
      await transporter.sendMail(sendObj);
      console.log("Success");
      return true;
    } catch (err) {
      console.log("SMTP err.message ==>", err.message);
    }
  },
  sendMailAttachments: async (option) => {
    let sendObj = {
      from: `${process.env.APP_NAME} <${process.env.fromEmail}>`,
      to: option.toEmail,
      subject: option.subject,
      html: option.description,
      attachments: option.attachments,
    };
    try {
      await transporter.sendMail(sendObj);
      return true;
    } catch (err) {
      console.log("SMTP err.message ==>", err.message);
    }
  },
  randomString: async () => {
    var result = "";
    var length = 10;
    var chars =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (var i = length; i > 0; --i)
      result += chars[Math.floor(Math.random() * chars.length)];
    return result;
  },
  generateOTP: (length) => {
    //return Math.floor(1000 + Math.random() * 9000); // 4 Digit OTP
    //logger.log('debug', 'Generating OTP ...');
    var digits = "0123456789";
    let OTP = "";
    for (let i = 0; i < length; i++) {
      OTP += digits[Math.floor(Math.random() * 10)];
    }
    return "123456";
  },
  ucFirst: (name) => {
    if (name) {
      var title = name.charAt(0).toUpperCase() + name.slice(1);
    } else {
      var title = name;
    }

    return title;
  },
  date: (date, format = "DD-MMM-YYYY") => {
    moment.locale("en");
    return moment(date).format(format);
  },
  time: (date, format = "h:mm:ss a") => {
    moment.locale("en");
    return moment(date).format(format);
  },
  currentTime: (format = "HH:mm A") => {
    moment.locale("en");
    return moment().format(format);
  },
  saveFile: async (fileObj, destination_folder, unlink) => {
    var base_path = path.join(__dirname + "/../public/");
    var new_path = path.join(
      __dirname + "/../public/" + destination_folder + "/"
    );

    if (!fs.existsSync(base_path)) {
      fs.mkdirSync(base_path, 755);
    }
    if (!fs.existsSync(new_path)) {
      fs.mkdirSync(new_path, 755);
    }
    if (!fs.existsSync(new_path)) {
      fs.mkdir(
        path.join(__dirname + "/../public", destination_folder),
        (err) => {
          if (err) {
            return console.error(err);
          }
        }
      );
    }
    //Unlink Previous image
    if (unlink != undefined && unlink != "") {
      old_filename = unlink.split(destination_folder + "/");
      if (fs.existsSync(new_path + "/" + unlink)) {
        fs.unlinkSync(new_path + "/" + unlink);
      }
    }
    ///Upload new image
    if (typeof fileObj == "object" && fileObj.name != "") {
      let file_name = moment() + "_" + fileObj.name;
      await fileObj.mv(new_path + "/" + file_name);
      return file_name;
    }
  },
  saveThumbFile: async (
    fileObj,
    destination_folder,
    unlink,
    fileName,
    height,
    width,
    THUMB
  ) => {
    var base_path = path.join(__dirname + "/../public/");
    var new_path = path.join(
      __dirname + "/../public/" + destination_folder + "/" + "thumb/"
    );

    if (!fs.existsSync(base_path)) {
      fs.mkdirSync(base_path, 755);
    }
    if (!fs.existsSync(new_path)) {
      fs.mkdirSync(new_path, 755);
    }
    if (!fs.existsSync(new_path)) {
      fs.mkdir(
        path.join(__dirname + "/../public", destination_folder + "/thumb/"),
        (err) => {
          if (err) {
            return console.error(err);
          }
        }
      );
    }
    //Unlink Previous image
    if (unlink != undefined && unlink != "") {
      old_filename = unlink.split(destination_folder + "/thumb/");
      if (fs.existsSync(new_path + "/" + unlink)) {
        fs.unlinkSync(new_path + "/" + unlink);
      }
    }
    ///Upload new image
    if (typeof fileObj == "object" && fileObj.name != "") {
      let file_name = fileName;
      const fileUploadResize = new Resize(THUMB, width, height);
      await fileUploadResize.save(fileObj.data, file_name);
    }
  },
  saveThumbFilePost: async (
    fileObj,
    destination_folder,
    unlink,
    fileName,
    height,
    width,
    THUMB
  ) => {
    var base_path = path.join(__dirname + "/../public/");
    var new_path = path.join(
      __dirname + "/../public/" + destination_folder + "/" + "thumb/"
    );

    if (!fs.existsSync(base_path)) {
      fs.mkdirSync(base_path, 755);
    }
    if (!fs.existsSync(new_path)) {
      fs.mkdirSync(new_path, 755);
    }
    if (!fs.existsSync(new_path)) {
      fs.mkdir(
        path.join(__dirname + "/../public", destination_folder + "/thumb/"),
        (err) => {
          if (err) {
            return console.error(err);
          }
        }
      );
    }
    //Unlink Previous image
    if (unlink != undefined && unlink != "") {
      old_filename = unlink.split(destination_folder + "/thumb/");
      if (fs.existsSync(new_path + "/" + unlink)) {
        fs.unlinkSync(new_path + "/" + unlink);
      }
    }
    ///Upload new image
    if (typeof fileObj == "object" && fileObj.name != "") {
      let file_name = fileName;
      const fileUploadResize = new ResizePost(THUMB, width, height);
      await fileUploadResize.save(fileObj.data, file_name);
    }
  },
  categoryTree: async (categoryId) => {
    var categoryTree = {};
    categoryTree.category1 = null;
    categoryTree.category2 = null;
    categoryTree.category3 = null;
    if (!_.isEmpty(categoryId)) {
      var filterFirst = {};
      filterFirst.status = 1;
      filterFirst._id = categoryId;
      const categoryFirst = await Category.findOne(filterFirst);
      var categoryFirstNew = JSON.parse(JSON.stringify(categoryFirst));

      if (!_.isEmpty(categoryFirstNew)) {
        if (!_.isEmpty(categoryFirstNew.parent)) {
          var filterSecond = {};
          filterSecond._id = new mongoose.Types.ObjectId(
            categoryFirstNew.parent
          );
          const categorySecond = await Category.findOne(filterSecond);
          var categorySecondNew = JSON.parse(JSON.stringify(categorySecond));

          if (!_.isEmpty(categorySecondNew)) {
            categoryTree.category1 = categorySecondNew._id;
            categoryTree.category2 = categoryId;
            if (!_.isEmpty(categorySecondNew.parent)) {
              categoryTree.category1 = categorySecondNew.parent;
              categoryTree.category2 = categoryFirstNew.parent;
              categoryTree.category3 = categoryId;
            }
          } else {
            categoryTree.category1 = categoryId;
          }
        } else {
          categoryTree.category1 = categoryId;
        }
      } else {
        categoryTree.category1 = params.category;
      }
    }
    return categoryTree;
  },
  searchInArrayOfObjectUsingValueOfKey: (key, value, myArray) => {
    var flag = false;
    for (var i = 0; i < myArray.length; i++) {
      //console.log(myArray[i][key]);

      if (myArray[i][key] == value) {
        flag = myArray[i];
        break;
      }
    }
    return flag;
  },
  getUserImageUrl(image) {
    const path = `public/${config.USER}/${image}`;
    if (image && fs.existsSync(path)) {
      return process.env.API_PATH + config.USER_IMAGE_PATH + "/" + image;
    } else {
      return process.env.API_PATH + config.USER_DEFAULT_IMAGE;
    }
  },
  deleteOneFile: async (destination_folder, unlink) => {
    var new_path = path.join(
      __dirname + "/../public/" + destination_folder + "/"
    );
    if (unlink != undefined && unlink != "") {
      old_filename = unlink.split(destination_folder + "/");
      if (fs.existsSync(new_path + "/" + unlink)) {
        fs.unlinkSync(new_path + "/" + unlink);
      }
    }
    return true;
  },
  getPostImageUrl(image) {
    const path = `public/${config.POST}/${image}`;
    if (image && fs.existsSync(path)) {
      return process.env.API_PATH + config.POST_IMAGE_PATH + "/" + image;
    } else {
      return process.env.API_PATH + config.POST_DEFAULT_IMAGE;
    }
  },
  getPostOriginalImageUrl(image) {
    const path = `public/${config.POST}/${image}`;
    if (image && fs.existsSync(path)) {
      return (
        process.env.API_PATH + config.POST_IMAGE_PATH_ORIGINAL + "/" + image
      );
    } else {
      return process.env.API_PATH + config.POST_DEFAULT_IMAGE;
    }
  },
  getReturnImageUrl(image) {
    const path = `public/${config.RETURN_REQUEST}/${image}`;
    if (image && fs.existsSync(path)) {
      return (
        process.env.API_PATH + config.RETURN_REQUEST_IMAGE_PATH + "/" + image
      );
    } else {
      return process.env.API_PATH + config.RETURN_REQUEST_DEFAULT_IMAGE;
    }
  },
  getShippingFee_old: async (toCity, fromCity, item) => {
    /**
     * get shipping fee
     *
     * Tier 1 city  -> Tier 1 city =  18SR
     * Tier 1 city  -> Tier 2 city =  21SR
     * Tier 2 city  -> Tier 1 city =  21SR
     * Tier 2 city  -> Tier 2 city =  21SR
     *
     * Extra cost
     *
     * T1 To T1 = 1
     * T1 To T2 = 1.25
     * T2 To T2 = 1.25
     * T2 To T1 = 1.25
     *
     * Total Weight
     *
     * l*w*h/5000
     */

    if (toCity && fromCity) {
      var request = {
        $or: [
          { title: { $regex: toCity, $options: "i" } },
          { title_ar: { $regex: toCity, $options: "i" } },
        ],
      };
      const toDocs = await City.findOne(request, { type: 1 });
      if (item && item.length) {
        var l = parseFloat(item.length);
        var w = parseFloat(item.width);
        var h = parseFloat(item.height);
        var weight = parseFloat(item.weight);
        var dimensionWeight = (l * w * h) / 5000;

        var usedWeight =
          weight > dimensionWeight
            ? Math.round(weight)
            : Math.round(dimensionWeight);
        var additionalWeight = usedWeight > 10 ? usedWeight - 10 : 0;

        var flatShipping = 0;
        var additionalValue = 0;
        var vat = 0;
        var total = 0;
        var request = {
          $or: [
            { title: { $regex: fromCity, $options: "i" } },
            { title_ar: { $regex: fromCity, $options: "i" } },
          ],
        };
        const fromDocs = await City.findOne(request, { type: 1 });

        if (toDocs && fromDocs) {
          if (toDocs.type === 1 && fromDocs.type === 1) {
            flatShipping = 18;
            additionalValue = additionalWeight * 1;
          } else {
            flatShipping = 21;
            additionalValue = additionalWeight * 1.25;
          }
        }
        vat = (flatShipping + additionalValue) * 0.15;
        total = flatShipping + additionalValue + vat;

        return total;
      } else {
        return 21;
      }
    } else {
      return 21;
    }
  },
  getProcessingFee: async (amount) => {
    var processingFee = config.PROCESSING_FEE_PERCENTAGE * amount;
    return parseFloat(parseFloat(processingFee + 1).toFixed(2));
  },
  createZohoTicketNumber: async (userInfo, subject, description, id) => {
    await axios({
      method: "post",
      url: "https://accounts.zoho.com/oauth/v2/token?refresh_token=1000.921b56bb3ca27d15f94e3cdc96d43288.27e1ca855b9a05fae28f35d644984475&client_id=1000.SS2WF17S67ZAEUOXQLSWWTX26G55ON&client_secret=8743ace693102edfdfe9665356652550dc14a62851&scope=Desk.tickets.ALL&redirect_uri=http://localhost/redirect.php&grant_type=refresh_token",
      data: {},
    })
      .then(async function (response) {
        var aa = response.data.access_token;
        const data = {
          subCategory: "Sub General",
          cf: {
            cf_permanentaddress: null,
            cf_dateofpurchase: null,
            cf_phone: null,
            cf_numberofitems: null,
            cf_url: null,
            cf_secondaryemail: null,
            cf_severitypercentage: "0.0",
            cf_modelname: "F3 2017",
          },
          productId: "",
          contact: {
            lastName: userInfo.first_name,
            firstName: userInfo.last_name,
            phone: userInfo.mobile_number,
            email: userInfo.email,
          },
          subject: subject,
          dueDate: "2016-06-21T16:16:16.000Z",
          departmentId: "657349000000006907",
          channel: "Email",
          description: description,
          language: "English",
          priority: "High",
          classification: "",
          phone: userInfo.mobile_number,
          category: "general",
          email: userInfo.email,
          status: "Open",
        };

        const options = {
          headers: {
            orgId: "766100168",
            Authorization: "Zoho-oauthtoken " + aa,
          },
        };

        var res = await axios.post(
          " https://desk.zoho.com/api/v1/tickets",
          data,
          options
        );
        // console.log("res.data.ticketNumber ==>", res.data.ticketNumber);

        var order = {};
        order.status = "CANCELED";
        order.ticketNumber = res.data.ticketNumber;
        order.cancel_description = description;
        await Order.updateOne({ _id: id }, order);
        return res.data.ticketNumber;
      })
      .catch(function (error) {
        console.log(error);
      });
  },
  syncCustomerToZohoBookHelper: async (userInfo, type, action) => {
    await Setting.find({}, { zohoBookAccessToken: 1 })
      .then(async function (settingsData) {
        var access_token = settingsData[0].zohoBookAccessToken;
        var options = {
          headers: {
            Authorization: "Zoho-oauthtoken " + access_token,
          },
        };

        if (action == "create") {
          const data = {
            contact_name: userInfo.first_name + " " + userInfo.last_name,
            contact_type: type,
            place_of_contact: "SA",
            payment_terms: "0",
            tax_treatment: "vat_not_registered",
            custom_fields: [
              {
                label: "User ID",
                value: userInfo.userId,
              },
              {
                label: "DOB",
                value: moment(userInfo.dob).format("YYYY-MM-DD"),
              },
            ],
            contact_persons: [
              {
                first_name: userInfo.first_name,
                last_name: userInfo.last_name,
                email: userInfo.email,
                phone: userInfo.mobile_number,
              },
            ],
          };

          var res = await axios.post(
            "https://books.zoho.com/api/v3/contacts?organization_id=773220360",
            data,
            options
          );

          console.log("------- Create " + type + " Payload -------");
          console.log(data);
          console.log("------- Create " + type + " Payload End -------");

          // console.log("------- Create Customer Response Start -------");
          // console.log(res.data.contact.contact_persons);
          //console.log("------- Create Customer Response End -------");

          logger.zohoBook(JSON.stringify(data));
        } else {
          const data = {
            contact_name: userInfo.first_name + " " + userInfo.last_name,
            custom_fields: [
              {
                label: "User ID",
                value: userInfo.userId,
              },
              {
                label: "DOB",
                value: moment(userInfo.dob).format("YYYY-MM-DD"),
              },
            ],
            contact_persons: [
              {
                first_name: userInfo.first_name,
                last_name: userInfo.last_name,
                email: userInfo.email,
                phone: userInfo.mobile_number,
              },
            ],
          };
          var URL =
            "https://books.zoho.com/api/v3/contacts/" +
            userInfo.zb_buyer_id +
            "?organization_id=773220360";

          var res = await axios.put(URL, data, options);

          console.log("------- Update " + type + " Payload -------");
          console.log(data);
          console.log("------- Update " + type + " Payload End -------");

          logger.zohoBook(JSON.stringify(data));
        }

        logger.zohoBook(JSON.stringify(res.data.contact));

        let contact_id = res.data.contact.contact_id;

        let contact_cp_id =
          res.data.contact.contact_persons[0].contact_person_id;

        var user = { $inc: { zbCountBuyer: 1 } };
        if (action == "create") {
          user.zb_buyer_id = contact_id;
          user.zb_buyer_cp_id = contact_cp_id;
        }

        user.zb_buyer_synced = true;

        console.log("------ Create / Update Start ------");
        console.log(user);
        console.log("------ Create / Update End ------");
        await User.updateMany({ userId: parseInt(userInfo.userId) }, user);
      })
      .catch(async function (error) {
        //console.log(error);
        if (error.response && error.response.data) {
          logger.zohoBook(JSON.stringify(error.response.data));
          console.log("----- Error Start Create/Update Customer --------");
          //console.log(error.response.data.message);
          console.log(error.response.data);
          console.log("----- Error End Create/Update Customer --------");

          if (error?.response?.data?.code == 102027 && action == "update") {
            // if email already exists error appear and it is case of update.

            const data = {
              contact_name: userInfo.first_name + " " + userInfo.last_name,
              custom_fields: [
                {
                  label: "User ID",
                  value: userInfo.userId,
                },
                {
                  label: "DOB",
                  value: moment(userInfo.dob).format("YYYY-MM-DD"),
                },
              ],
              contact_persons: [
                {
                  first_name: userInfo.first_name,
                  last_name: userInfo.last_name,
                  phone: userInfo.mobile_number,
                },
              ],
            };
            var URL =
              "https://books.zoho.com/api/v3/contacts/" +
              userInfo.zb_buyer_id +
              "?organization_id=773220360";

            try {
              var settingsData = await Setting.find(
                {},
                { zohoBookAccessToken: 1 }
              );
              var access_token = settingsData[0].zohoBookAccessToken;
              var options = {
                headers: {
                  Authorization: "Zoho-oauthtoken " + access_token,
                },
              };
              var res = await axios.put(URL, data, options);
              logger.zohoBook(JSON.stringify(data));
            } catch (err) {
              console.log(err);
            }
            let user = {};
            user.zb_buyer_synced = false;
            user.zbCountBuyer = 0;

            await User.updateMany({ userId: parseInt(userInfo.userId) }, user);
          } else {
            user.zb_buyer_synced = false;
            user.zbCountBuyer = 0;
            await User.updateMany({ userId: parseInt(userInfo.userId) }, user);
            console.log(parseInt(userInfo.userId), user);
          }
        }
      });
  },
  syncVendorToZohoBookHelper: async (userInfo, type, action) => {
    await Setting.find({}, { zohoBookAccessToken: 1 })
      .then(async function (settingsData) {
        var access_token = settingsData[0].zohoBookAccessToken;
        var options = {
          headers: {
            Authorization: "Zoho-oauthtoken " + access_token,
          },
        };

        if (action == "create") {
          const data = {
            contact_name: userInfo.first_name + " " + userInfo.last_name,
            contact_type: type,
            place_of_contact: "SA",
            payment_terms: "0",
            tax_treatment: "vat_not_registered",
            custom_fields: [
              {
                label: "User ID",
                value: userInfo.userId,
              },
              {
                label: "DOB",
                value: moment(userInfo.dob).format("YYYY-MM-DD"),
              },
            ],
            contact_persons: [
              {
                first_name: userInfo.first_name,
                last_name: userInfo.last_name,
                email: userInfo.email,
                phone: userInfo.mobile_number,
              },
            ],
          };

          var res = await axios.post(
            "https://books.zoho.com/api/v3/contacts?organization_id=773220360",
            data,
            options
          );

          console.log("------- Create " + type + " Payload -------");
          console.log(data);
          console.log("------- Create " + type + " Payload End -------");

          // console.log("------- Create Vendor Response Start -------");
          // console.log(res.data.contact.contact_persons);
          //console.log("------- Create Vendor Response End -------");

          logger.zohoBook(JSON.stringify(data));
        } else {
          const data = {
            contact_name: userInfo.first_name + " " + userInfo.last_name,
            custom_fields: [
              {
                label: "User ID",
                value: userInfo.userId,
              },
              {
                label: "DOB",
                value: moment(userInfo.dob).format("YYYY-MM-DD"),
              },
            ],
            contact_persons: [
              {
                first_name: userInfo.first_name,
                last_name: userInfo.last_name,
                email: userInfo.email,
                phone: userInfo.mobile_number,
              },
            ],
          };
          var URL =
            "https://books.zoho.com/api/v3/contacts/" +
            userInfo.zb_seller_id +
            "?organization_id=773220360";

          var res = await axios.put(URL, data, options);

          console.log("------- Update " + type + " Payload -------");
          console.log(data);
          console.log("------- Update " + type + " Payload End -------");

          logger.zohoBook(JSON.stringify(data));
        }

        logger.zohoBook(JSON.stringify(res.data.contact));

        let contact_id = res.data.contact.contact_id;

        let contact_cp_id =
          res.data.contact.contact_persons[0].contact_person_id;

        var user = { $inc: { zbCountSeller: 1 } };
        if (action == "create") {
          user.zb_seller_id = contact_id;
          user.zb_seller_cp_id = contact_cp_id;
        }

        user.zb_seller_synced = true;

        console.log("------ Create / Update Start ------");
        console.log(user);
        console.log("------ Create / Update End ------");
        await User.updateMany({ userId: parseInt(userInfo.userId) }, user);
      })
      .catch(async function (error) {
        //console.log(error);
        if (error.response && error.response.data) {
          logger.zohoBook(JSON.stringify(error.response.data));
          console.log("----- Error Start Create/Update Vendor --------");
          //console.log(error.response.data.message);
          console.log(error.response.data);
          console.log("----- Error End Create/Update Vendor --------");

          if (error?.response?.data?.code == 102027 && action == "update") {
            // if email already exists error appear and it is case of update.

            const data = {
              contact_name: userInfo.first_name + " " + userInfo.last_name,
              custom_fields: [
                {
                  label: "User ID",
                  value: userInfo.userId,
                },
                {
                  label: "DOB",
                  value: moment(userInfo.dob).format("YYYY-MM-DD"),
                },
              ],
              contact_persons: [
                {
                  first_name: userInfo.first_name,
                  last_name: userInfo.last_name,
                  phone: userInfo.mobile_number,
                },
              ],
            };
            var URL =
              "https://books.zoho.com/api/v3/contacts/" +
              userInfo.zb_seller_id +
              "?organization_id=773220360";

            try {
              var settingsData = await Setting.find(
                {},
                { zohoBookAccessToken: 1 }
              );
              var access_token = settingsData[0].zohoBookAccessToken;
              var options = {
                headers: {
                  Authorization: "Zoho-oauthtoken " + access_token,
                },
              };
              var res = await axios.put(URL, data, options);
              logger.zohoBook(JSON.stringify(data));
            } catch (err) {
              console.log(err);
            }
            let user = {};
            user.zb_seller_synced = false;
            user.zbCountSeller = 0;

            await User.updateMany({ userId: parseInt(userInfo.userId) }, user);
          } else {
            user.zb_seller_synced = false;
            user.zbCountSeller = 0;
            await User.updateMany({ userId: parseInt(userInfo.userId) }, user);
            console.log(parseInt(userInfo.userId), user);
          }
        }
      });
  },
  processInvoiceAtZohoBook: async (idOrder) => {
    try {
      const settingsData = await Setting.find({}, { zohoBookAccessToken: 1 });
      const options = {
        headers: {
          Authorization:
            "Zoho-oauthtoken " + settingsData[0]["zohoBookAccessToken"],
        },
      };

      var orderDetails = await Order.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(idOrder),
          },
        },
        {
          $lookup: {
            from: "posts",
            localField: "post_id",
            foreignField: "_id",
            as: "post",
          },
        },
        { $unwind: "$post" },

        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $project: {
            "customer._id": 1,
            "customer.email": 1,
            "customer.zb_buyer_id": 1,
            "customer.zb_seller_id": 1,
            "customer.zb_buyer_cp_id": 1,
            "customer.zb_seller_cp_id": 1,
            zoho_item_id: 1,
            "post.postNumber": 1,
            "post.updateNumber": 1,
            "post.price": 1,
            "item.who_pay": 1,
            shipping: 1,
            shipping_fee: 1,
            payment_type: 1,
            discount_price: 1,
            order_number: 1,
            order_number_show: 1,
            Processing_fee: 1,
          },
        },
      ]);

      if (orderDetails[0]) {
        let orderItem = orderDetails[0];
        console.log(
          "----------- processInvoiceAtZohoBook: Order Details Start-----------"
        );
        console.log(orderItem);
        console.log(
          "----------- processInvoiceAtZohoBook: Order Details End-----------"
        );
        let invoicePayload = {
          customer_id: "",
          place_of_supply: "SA",
          reference_number: "",
          is_inclusive_tax: true,
          payment_terms: 0,
          payment_terms_label: "Custom",
          line_items: [
            {
              item_id: "",
              discount: orderItem?.discount_price,
              is_discount_before_tax: true,
              discount_type: "item_level",
            },
            {
              item_id: config.PROCESSING_ITEM_ID,
              rate: orderItem?.Processing_fee,
              account_id: config.PROCESSING_ACCOUNT_ID,
            },
          ],
        };
        if (orderItem?.item?.who_pay == "Buyer") {
          // if buyer pay shipping fees
          invoicePayload.line_items[2] = {
            item_id: config.SHIPPING_ITEM_ID,
            rate: orderItem.shipping_fee,
            account_id: config.SHIPPING_ACCOUNT_ID,
          };
        }

        invoicePayload.customer_id = orderItem.customer.zb_buyer_id;
        invoicePayload.reference_number = orderItem.order_number_show;
        // invoicePayload.contact_person[0] = orderItem.customer.zb_buyer_cp_id;
        invoicePayload.line_items[0].item_id = orderItem.zoho_item_id;
        console.log(
          "----------- processInvoiceAtZohoBook: Invoice Payload Start-----------"
        );
        console.log(invoicePayload);
        console.log(
          "----------- processInvoiceAtZohoBook: Invoice Payload End-----------"
        );

        logger.zohoBookInvoice("createInvoicePayload Start");
        logger.zohoBookInvoice(JSON.stringify(invoicePayload));
        logger.zohoBookInvoice("createInvoicePayload End");

        var res = await axios.post(
          "https://books.zoho.com/api/v3/invoices?organization_id=773220360",
          invoicePayload,
          options
        );

        if (res?.data?.code == 0) {
          let invoiceDetails = {
            invoice_id: res?.data.invoice.invoice_id,
            invoice_number: res?.data.invoice.invoice_number,
            invoice_url: res?.data.invoice.invoice_url,
          };

          console.log(
            "----------- processInvoiceAtZohoBook: Invoice Details Start-----------"
          );
          console.log(invoiceDetails);
          console.log(
            "----------- processInvoiceAtZohoBook: Invoice Details End-----------"
          );

          logger.zohoBookInvoice("createInvoiceResponse Start");
          logger.zohoBookInvoice(JSON.stringify(res?.data?.invoice));
          logger.zohoBookInvoice("createInvoiceResponse End");

          let updatePayload = {
            zoho_invoice_id: invoiceDetails.invoice_id,
            zoho_invoice_number: invoiceDetails.invoice_number,
          };
          await Order.updateOne({ _id: orderItem._id }, updatePayload);
          return true;
          /*
          let sendInvoicePayload = {
            send_from_org_email_id: false,
            to_mail_ids: [orderItem.customer.email],
            cc_mail_ids: ["pankaj.gupta@octalsoftware.net"],
            subject:
              "Invoice from Zillium Inc (Invoice#: " +
              invoiceDetails.invoice_number +
              ")",
            body:
              "Dear Customer,         <br><br><br><br>Thanks for your business.         <br><br><br><br>The invoice " +
              invoiceDetails.invoice_number +
              " is attached with this email. You can choose the easy way out and <a href= " +
              invoiceDetails.invoice_url +
              "  >pay online for this invoice.</a>         <br><br>Here's an overview of the invoice for your reference.         <br><br><br><br>Invoice Overview:         <br><br>Invoice  : " +
              invoiceDetails.invoice_number +
              "         <br><br>Date : " +
              moment().format("DD-MMM-YYYY") +
              "         <br><br>Amount : SR " +
              orderItem.post.postNumber +
              '         <br><br><br><br>It was great working with you. Looking forward to working with you again.<br><br><br>\\nRegards<br>\\nDoffo<br>\\n",',
          };
          logger.zohoBookInvoice("sendInvoicePayload Start");
          logger.zohoBookInvoice(JSON.stringify(sendInvoicePayload));
          logger.zohoBookInvoice("sendInvoicePayload End");

          var res = await axios.post(
            "https://books.zoho.com/api/v3/invoices/" +
              invoiceDetails.invoice_id +
              "/email?organization_id=773220360",
            sendInvoicePayload,
            options
          );

          if (res?.data?.code == 0) {
            console.log(
              "----------- processInvoiceAtZohoBook: Invoice Sent Status Start-----------"
            );
            console.log(res?.data);
            console.log(
              "----------- processInvoiceAtZohoBook: Invoice Sent Status End-----------"
            );

            logger.zohoBookInvoice("sendInvoiceResponse Start");
            logger.zohoBookInvoice(JSON.stringify(sendInvoicePayload));
            logger.zohoBookInvoice("sendInvoiceResponse End");
          }
          */
        }
      }
    } catch (error) {
      console.log(error?.response?.data?.message);
      let updatePayload = {
        zoho_error_api: "processInvoiceAtZohoBook",
        zoho_error_api_message: error?.response?.data?.message,
      };
      await Order.updateOne({ _id: idOrder }, updatePayload);
      //console.log("error.response");
      logger.zohoBookInvoice("Error Start");
      logger.zohoBookInvoice(JSON.stringify(error));
      logger.zohoBookInvoice("Error End");
      return false;
    }
  },
  processInvoiceAtZohoBookSellerCommission: async (OrderId) => {
    try {
      const settingsData = await Setting.find({}, { zohoBookAccessToken: 1 });
      const options = {
        headers: {
          Authorization:
            "Zoho-oauthtoken " + settingsData[0]["zohoBookAccessToken"],
        },
      };
      var match = { zoho_item_id: { $ne: "0" } };
      var orderDetails = await Order.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(OrderId),
          },
        },
        {
          $lookup: {
            from: "posts",
            localField: "post_id",
            foreignField: "_id",
            as: "post",
          },
        },
        { $unwind: "$post" },
        {
          $match: match, // only get orders for which zoho_id is generated for that order's post
        },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $lookup: {
            from: "users",
            localField: "seller_id",
            foreignField: "_id",
            as: "seller",
          },
        },
        { $unwind: "$seller" },
        {
          $project: {
            seller_amount: 1,
            "customer._id": 1,
            "customer.email": 1,
            "customer.zb_buyer_id": 1,
            "customer.zb_seller_id": 1,
            "customer.zb_buyer_cp_id": 1,
            "customer.zb_seller_cp_id": 1,
            "seller._id": 1,
            "seller.email": 1,
            "seller.zb_buyer_id": 1,
            "seller.zb_seller_id": 1,
            "seller.zb_buyer_cp_id": 1,
            "seller.zb_seller_cp_id": 1,
            zoho_item_id: 1,
            "post.postNumber": 1,
            "post.price": 1,
            order_number: 1,
            order_number_show: 1,
          },
        },
      ]);

      if (orderDetails[0]) {
        let orderItem = orderDetails[0];
        console.log(
          "----------- processInvoiceAtZohoBookSellerCommission: Order Details Start-----------"
        );
        console.log(orderItem);
        console.log(
          "----------- processInvoiceAtZohoBookSellerCommission: Order Details End-----------"
        );
        let invoicePayload = {
          customer_id: "",
          template_id: "3124413000000151032",
          place_of_supply: "SA",
          reference_number: "",
          is_inclusive_tax: true,
          payment_terms: 0,
          payment_terms_label: "Custom",
          line_items: [
            {
              item_id: "",
            },
          ],
          contact_person: [],
        };
        invoicePayload.customer_id = orderItem.seller.zb_buyer_id;
        invoicePayload.reference_number = orderItem.order_number_show;
        invoicePayload.contact_person[0] = orderItem.seller.zb_buyer_cp_id;
        invoicePayload.line_items[0].item_id =
          config.ITEM_ID_FOR_SELLER_COMMISSION_INVOICE;
        invoicePayload.line_items[0].rate = orderItem.seller_amount;
        invoicePayload.line_items[0].tax_id =
          config.TAX_ID_FOR_SELLER_COMMISSION_INVOICE;
        console.log(
          "----------- processInvoiceAtZohoBookSellerCommission: Invoice Payload Start-----------"
        );
        console.log(invoicePayload);
        //return false;
        console.log(
          "----------- processInvoiceAtZohoBookSellerCommission: Invoice Payload End-----------"
        );

        logger.zohoBookInvoice("createInvoicePayload Start");
        logger.zohoBookInvoice(JSON.stringify(invoicePayload));
        logger.zohoBookInvoice("createInvoicePayload End");

        var res = await axios.post(
          "https://books.zoho.com/api/v3/invoices?organization_id=773220360",
          invoicePayload,
          options
        );

        if (res?.data?.code == 0) {
          let invoiceDetails = {
            invoice_id: res?.data.invoice.invoice_id,
            invoice_number: res?.data.invoice.invoice_number,
            invoice_url: res?.data.invoice.invoice_url,
          };

          console.log(
            "----------- processInvoiceAtZohoBookSellerCommission: Invoice Details Start-----------"
          );
          console.log(invoiceDetails);
          console.log(
            "----------- processInvoiceAtZohoBookSellerCommission: Invoice Details End-----------"
          );

          logger.zohoBookInvoice("createInvoiceResponse Start");
          logger.zohoBookInvoice(JSON.stringify(res?.data?.invoice));
          logger.zohoBookInvoice("createInvoiceResponse End");

          let updatePayload = {
            zoho_invoice_id_seller_com: invoiceDetails.invoice_id,
            zoho_invoice_number_seller_com: invoiceDetails.invoice_number,
          };
          await Order.updateOne({ _id: orderItem._id }, updatePayload);
          return true;

          /*
          let sendInvoicePayload = {
            send_from_org_email_id: false,
            to_mail_ids: [orderItem.customer.email],
            cc_mail_ids: ["pankaj.gupta@octalsoftware.net"],
            subject:
              "Invoice from Zillium Inc (Invoice#: " +
              invoiceDetails.invoice_number +
              ")",
            body:
              "Dear Customer,         <br><br><br><br>Thanks for your business.         <br><br><br><br>The invoice " +
              invoiceDetails.invoice_number +
              " is attached with this email. You can choose the easy way out and <a href= " +
              invoiceDetails.invoice_url +
              "  >pay online for this invoice.</a>         <br><br>Here's an overview of the invoice for your reference.         <br><br><br><br>Invoice Overview:         <br><br>Invoice  : " +
              invoiceDetails.invoice_number +
              "         <br><br>Date : " +
              moment().format("DD-MMM-YYYY") +
              "         <br><br>Amount : SR " +
              orderItem.post.postNumber +
              '         <br><br><br><br>It was great working with you. Looking forward to working with you again.<br><br><br>\\nRegards<br>\\nDoffo<br>\\n",',
          };
          logger.zohoBookInvoice("sendInvoicePayload Start");
          logger.zohoBookInvoice(JSON.stringify(sendInvoicePayload));
          logger.zohoBookInvoice("sendInvoicePayload End");

          var res = await axios.post(
            "https://books.zoho.com/api/v3/invoices/" +
              invoiceDetails.invoice_id +
              "/email?organization_id=773220360",
            sendInvoicePayload,
            options
          );

          if (res?.data?.code == 0) {
            console.log(
              "----------- processInvoiceAtZohoBook: Invoice Sent Status Start-----------"
            );
            console.log(res?.data);
            console.log(
              "----------- processInvoiceAtZohoBook: Invoice Sent Status End-----------"
            );

            logger.zohoBookInvoice("sendInvoiceResponse Start");
            logger.zohoBookInvoice(JSON.stringify(sendInvoicePayload));
            logger.zohoBookInvoice("sendInvoiceResponse End");
          }
          */
        }
      }
    } catch (error) {
      console.log(error);
      let updatePayload = {
        zoho_error_api: "processInvoiceAtZohoBookSellerCommission",
        zoho_error_api_message: error?.response?.data?.message,
      };
      await Order.updateOne({ _id: OrderId }, updatePayload);
      logger.zohoBookInvoice("Error Start");
      logger.zohoBookInvoice(JSON.stringify(error));
      logger.zohoBookInvoice("Error End");
      return false;
    }
  },
  processCustomerPaymentAtZohoBook: async (OrderId) => {
    try {
      const settingsData = await Setting.find({}, { zohoBookAccessToken: 1 });
      const options = {
        headers: {
          Authorization:
            "Zoho-oauthtoken " + settingsData[0]["zohoBookAccessToken"],
        },
      };
      var orderDetails = await Order.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(OrderId),
          },
        },
        {
          $lookup: {
            from: "posts",
            localField: "post_id",
            foreignField: "_id",
            as: "post",
          },
        },
        { $unwind: "$post" },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $project: {
            price: 1,
            zoho_invoice_id: 1,
            zoho_invoice_number: 1,
            "customer._id": 1,
            "customer.email": 1,
            "customer.zb_buyer_id": 1,
            "customer.zb_seller_id": 1,
            "customer.zb_buyer_cp_id": 1,
            "customer.zb_seller_cp_id": 1,
            zoho_item_id: 1,
            "post.postNumber": 1,
            "post.price": 1,
            "item.who_pay": 1,
            shipping: 1,
            shipping_fee: 1,
            payment_type: 1,
            discount_price: 1,
            Processing_fee: 1,
            order_number: 1,
            order_number_show: 1,
          },
        },
      ]);

      if (orderDetails[0]) {
        let orderItem = orderDetails[0];
        console.log(
          "----------- processCustomerPaymentAtZohoBook: Order Details Start-----------"
        );
        console.log(orderItem);
        console.log(
          "----------- processCustomerPaymentAtZohoBook: Order Details End-----------"
        );
        let amount = orderItem.price; //console.log(amount);
        amount = amount - orderItem.discount_price; //console.log(amount);
        amount = amount + orderItem.Processing_fee; //console.log(amount);
        if (orderItem?.item?.who_pay == "Buyer") {
          amount = amount + orderItem.shipping_fee;
        }
        //console.log(amount); return false;
        let customerPaymentPayload = {
          customer_id: orderItem.customer.zb_buyer_id,
          payment_mode: "Credit Card",
          amount: amount,
          date: moment(orderItem.created_at).format("YYYY-MM-DD"),
          reference_number: orderItem.order_number_show,
          invoices: [
            {
              invoice_id: orderItem.zoho_invoice_id,
              amount_applied: amount,
            },
          ],
          account_id: config.ACCOUNT_ID_CUSTOMER_PAYMENT,
          bank_charges: orderItem.Processing_fee,
          contact_persons: [orderItem.customer.zb_buyer_cp_id],
        };

        console.log(
          "----------- processCustomerPaymentAtZohoBook: createCustomerPaymentPayload Start-----------"
        );
        console.log(customerPaymentPayload);
        console.log(
          "----------- processCustomerPaymentAtZohoBook: createCustomerPaymentPayload End-----------"
        );

        logger.zohoBookInvoice("createCustomerPaymentPayload Start");
        logger.zohoBookInvoice(JSON.stringify(customerPaymentPayload));
        logger.zohoBookInvoice("createCustomerPaymentPayload End");

        var res = await axios.post(
          "https://books.zoho.com/api/v3/customerpayments?organization_id=773220360",
          customerPaymentPayload,
          options
        );

        if (res?.data?.code == 0) {
          let paymentDetails = {
            payment_id: res?.data.payment.payment_id,
            payment_number: res?.data.payment.payment_number,
          };

          console.log(
            "----------- processCustomerPaymentAtZohoBook: createCustomerPaymentResponse Start-----------"
          );
          console.log(paymentDetails);
          console.log(
            "----------- processCustomerPaymentAtZohoBook: createCustomerPaymentResponse End-----------"
          );

          logger.zohoBookInvoice("createCustomerPaymentResponse Start");
          logger.zohoBookInvoice(JSON.stringify(res?.data?.payment));
          logger.zohoBookInvoice("createCustomerPaymentResponse End");

          let updatePayload = {
            zoho_payment_id: paymentDetails.payment_id,
            zoho_payment_number: paymentDetails.payment_number,
          };
          await Order.updateOne({ _id: orderItem._id }, updatePayload);
          return true;
          /*
          let applyCustomerPaymentPayload = {
            invoice_payments: [
              {
                payment_id: paymentDetails.payment_id,
                amount_applied: orderItem.price,
              },
            ],
          };
          logger.zohoBookInvoice("applyCustomerPaymentPayload Start");
          logger.zohoBookInvoice(JSON.stringify(applyCustomerPaymentPayload));
          logger.zohoBookInvoice("applyCustomerPaymentPayload End");

          var res = await axios.post(
            "https://books.zoho.com/api/v3/invoices/" +
              orderItem.zoho_invoice_id +
              "/credits?organization_id=773220360",
            applyCustomerPaymentPayload,
            options
          );

          if (res?.data?.code == 0) {
            console.log(
              "----------- processCustomerPaymentAtZohoBook: applyCustomerPaymentPayload Start-----------"
            );
            console.log(res?.data);
            console.log(
              "----------- processCustomerPaymentAtZohoBook: applyCustomerPaymentPayload End-----------"
            );

            logger.zohoBookInvoice("applyCustomerPaymentPayload Start");
            logger.zohoBookInvoice(JSON.stringify(res?.data));
            logger.zohoBookInvoice("applyCustomerPaymentPayload End");

            await Order.updateOne(
              { _id: orderItem._id },
              { zoho_payment_applied: "1" }
            );
          }
          */
        }
      }
    } catch (error) {
      console.log(error);

      console.log(error?.response?.data?.message);
      let updatePayload = {
        zoho_error_api: "processCustomerPaymentAtZohoBook",
        zoho_error_api_message: error?.response?.data?.message,
      };
      await Order.updateOne({ _id: OrderId }, updatePayload);

      logger.zohoBookInvoice("Error Start");
      logger.zohoBookInvoice(JSON.stringify(error));
      logger.zohoBookInvoice("Error End");
      return false;
    }
  },
  processCustomerPaymentAtZohoBookSellerCommission: async (OrderId) => {
    try {
      const settingsData = await Setting.find({}, { zohoBookAccessToken: 1 });
      const options = {
        headers: {
          Authorization:
            "Zoho-oauthtoken " + settingsData[0]["zohoBookAccessToken"],
        },
      };
      var orderDetails = await Order.aggregate([
        {
          //$match: {zoho_invoice_id:{ '$ne':'0'}}, // get orders for which invoice generated and invoice is is assigned.
          $match: {
            _id: new mongoose.Types.ObjectId(OrderId),
          },
        },
        {
          $lookup: {
            from: "posts",
            localField: "post_id",
            foreignField: "_id",
            as: "post",
          },
        },
        { $unwind: "$post" },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $lookup: {
            from: "users",
            localField: "seller_id",
            foreignField: "_id",
            as: "seller",
          },
        },
        { $unwind: "$seller" },
        {
          $project: {
            price: 1,
            seller_amount: 1,
            zoho_invoice_id: 1,
            zoho_invoice_number: 1,
            zoho_invoice_id_seller_com: 1,
            zoho_invoice_number_seller_com: 1,
            "customer._id": 1,
            "customer.email": 1,
            "customer.zb_buyer_id": 1,
            "customer.zb_seller_id": 1,
            "customer.zb_buyer_cp_id": 1,
            "customer.zb_seller_cp_id": 1,
            "seller._id": 1,
            "seller.email": 1,
            "seller.zb_buyer_id": 1,
            "seller.zb_seller_id": 1,
            "seller.zb_buyer_cp_id": 1,
            "seller.zb_seller_cp_id": 1,
            zoho_item_id: 1,
            "post.postNumber": 1,
            "post.price": 1,
            order_number: 1,
            order_number_show: 1,
          },
        },
      ]);

      if (orderDetails[0]) {
        let orderItem = orderDetails[0];
        console.log(
          "----------- processCustomerPaymentAtZohoBookSellerCommission: Order Details Start-----------"
        );
        console.log(orderItem);
        console.log(
          "----------- processCustomerPaymentAtZohoBookSellerCommission: Order Details End-----------"
        );
        let customerPaymentPayload = {
          customer_id: orderItem.seller.zb_buyer_id,
          payment_mode: "Credit Card",
          amount: orderItem.seller_amount,
          date: moment(orderItem.created_at).format("YYYY-MM-DD"),
          reference_number: orderItem.order_number_show,
          invoices: [
            {
              invoice_id: orderItem.zoho_invoice_id_seller_com,
              amount_applied: orderItem.seller_amount,
            },
          ],
          account_id: config.ACCOUNT_ID_CUSTOMER_PAYMENT,
          contact_persons: [orderItem.seller.zb_buyer_cp_id],
        };

        console.log(
          "----------- processCustomerPaymentAtZohoBookSellerCommission: createCustomerPaymentPayload Start-----------"
        );
        console.log(customerPaymentPayload);
        console.log(
          "----------- processCustomerPaymentAtZohoBookSellerCommission: createCustomerPaymentPayload End-----------"
        );

        logger.zohoBookInvoice("createCustomerPaymentPayload Start");
        logger.zohoBookInvoice(JSON.stringify(customerPaymentPayload));
        logger.zohoBookInvoice("createCustomerPaymentPayload End");

        var res = await axios.post(
          "https://books.zoho.com/api/v3/customerpayments?organization_id=773220360",
          customerPaymentPayload,
          options
        );

        if (res?.data?.code == 0) {
          let paymentDetails = {
            payment_id: res?.data.payment.payment_id,
            payment_number: res?.data.payment.payment_number,
          };

          console.log(
            "----------- processCustomerPaymentAtZohoBookSellerCommission: createCustomerPaymentResponse Start-----------"
          );
          console.log(paymentDetails);
          console.log(
            "----------- processCustomerPaymentAtZohoBookSellerCommission: createCustomerPaymentResponse End-----------"
          );

          logger.zohoBookInvoice("createCustomerPaymentResponse Start");
          logger.zohoBookInvoice(JSON.stringify(res?.data?.payment));
          logger.zohoBookInvoice("createCustomerPaymentResponse End");

          let updatePayload = {
            zoho_payment_id_seller_com: paymentDetails.payment_id,
            zoho_payment_number_seller_com: paymentDetails.payment_number,
          };
          await Order.updateOne({ _id: orderItem._id }, updatePayload);
          return true;
          /*
          let applyCustomerPaymentPayload = {
            invoice_payments: [
              {
                payment_id: paymentDetails.payment_id,
                amount_applied: orderItem.price,
              },
            ],
          };
          logger.zohoBookInvoice("applyCustomerPaymentPayload Start");
          logger.zohoBookInvoice(JSON.stringify(applyCustomerPaymentPayload));
          logger.zohoBookInvoice("applyCustomerPaymentPayload End");

          var res = await axios.post(
            "https://books.zoho.com/api/v3/invoices/" +
              orderItem.zoho_invoice_id +
              "/credits?organization_id=773220360",
            applyCustomerPaymentPayload,
            options
          );

          if (res?.data?.code == 0) {
            console.log(
              "----------- processCustomerPaymentAtZohoBook: applyCustomerPaymentPayload Start-----------"
            );
            console.log(res?.data);
            console.log(
              "----------- processCustomerPaymentAtZohoBook: applyCustomerPaymentPayload End-----------"
            );

            logger.zohoBookInvoice("applyCustomerPaymentPayload Start");
            logger.zohoBookInvoice(JSON.stringify(res?.data));
            logger.zohoBookInvoice("applyCustomerPaymentPayload End");

            await Order.updateOne(
              { _id: orderItem._id },
              { zoho_payment_applied: "1" }
            );
          }
          */
        }
      }
    } catch (error) {
      console.log(error);
      let updatePayload = {
        zoho_error_api: "processCustomerPaymentAtZohoBookSellerCommission",
        zoho_error_api_message: error?.response?.data?.message,
      };
      await Order.updateOne({ _id: OrderId }, updatePayload);
      logger.zohoBookInvoice("Error Start");
      logger.zohoBookInvoice(JSON.stringify(error));
      logger.zohoBookInvoice("Error End");
      return false;
    }
  },
  processBillAtZohoBook: async (OrderId) => {
    try {
      const settingsData = await Setting.find({}, { zohoBookAccessToken: 1 });
      const options = {
        headers: {
          Authorization:
            "Zoho-oauthtoken " + settingsData[0]["zohoBookAccessToken"],
        },
      };
      var orderDetails = await Order.aggregate([
        {
          $match: {
            _id: new mongoose.Types.ObjectId(OrderId),
          },
        },
        {
          $lookup: {
            from: "posts",
            localField: "post_id",
            foreignField: "_id",
            as: "post",
          },
        },
        { $unwind: "$post" },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $lookup: {
            from: "users",
            localField: "seller_id",
            foreignField: "_id",
            as: "seller",
          },
        },
        { $unwind: "$seller" },
        {
          $project: {
            price: 1,
            zoho_invoice_id: 1,
            zoho_invoice_number: 1,
            "customer._id": 1,
            "customer.email": 1,
            "customer.zb_buyer_id": 1,
            "customer.zb_seller_id": 1,
            "customer.zb_buyer_cp_id": 1,
            "customer.zb_seller_cp_id": 1,
            "seller._id": 1,
            "seller.email": 1,
            "seller.zb_buyer_id": 1,
            "seller.zb_seller_id": 1,
            "seller.zb_buyer_cp_id": 1,
            "seller.zb_seller_cp_id": 1,
            zoho_item_id: 1,
            "post.postNumber": 1,
            "post.price": 1,
            "item.who_pay": 1,
            shipping: 1,
            zoho_item_id: 1,
            shipping_fee: 1,
            payment_type: 1,
            discount_price: 1,
            order_number: 1,
            order_number_show: 1,
          },
        },
      ]);

      //autoIncrement
      let maxBillId = await Order.findOne({}, { zoho_bill_number: 1 })
        .sort({ zoho_bill_number: -1 })
        .limit(1);

      maxBillId = maxBillId.zoho_bill_number;

      var bill_number = await padLeadingZeros(maxBillId + 1, 10);

      //autoIncrement

      if (orderDetails[0]) {
        let orderItem = orderDetails[0];
        console.log(
          "----------- processBillAtZohoBook: Order Details Start-----------"
        );
        console.log(orderItem);
        console.log(
          "----------- processBillAtZohoBook: Order Details End-----------"
        );
        let createBillPayload = {
          vendor_id: orderItem.seller.zb_seller_id,
          bill_number: bill_number,
          reference_number: orderItem.order_number_show,
          place_of_supply: "SA",
          tax_treatment: "vat_registered",
          is_inclusive_tax: true,
          payment_terms: 0,
          payment_terms_label: "Due on Receipt",
          line_items: [
            {
              item_id: orderItem.zoho_item_id,
            },
          ],
          notes: "Thanks for your business.",
        };
        if (orderItem?.item?.who_pay == "Seller") {
          // if buyer pay shipping fees
          createBillPayload.line_items[1] = {
            item_id: config.SHIPPING_ITEM_ID,
            rate: -orderItem.shipping_fee,
            account_id: config.SHIPPING_ACCOUNT_ID,
          };
        }
        console.log(
          "----------- processBillAtZohoBook: createBillPayload Start-----------"
        );
        console.log(createBillPayload);
        console.log(
          "----------- processBillAtZohoBook: createBillPayload End-----------"
        );

        logger.zohoBookInvoice("createBillPayload Start");
        logger.zohoBookInvoice(JSON.stringify(createBillPayload));
        logger.zohoBookInvoice("createBillPayload End");

        var res = await axios.post(
          "https://books.zoho.com/api/v3/bills?organization_id=773220360",
          createBillPayload,
          options
        );

        if (res?.data?.code == 0) {
          //console.log(res?.data);

          let billDetails = { bill_id: res?.data.bill.bill_id };

          console.log(
            "----------- processBillAtZohoBook: createBillResponse Start-----------"
          );
          console.log(billDetails);
          console.log(
            "----------- processBillAtZohoBook: createBillResponse End-----------"
          );

          logger.zohoBookInvoice("createBillResponse Start");
          logger.zohoBookInvoice(JSON.stringify(res?.data?.bill));
          logger.zohoBookInvoice("createBillResponse End");

          let updatePayload = {
            zoho_bill_id: billDetails.bill_id,
            zoho_bill_number: bill_number,
          };
          await Order.updateOne({ _id: orderItem._id }, updatePayload);
          return true;
        }
      }
    } catch (error) {
      console.log(error);
      console.log(error?.response?.data?.message);
      let updatePayload = {
        zoho_error_api: "processBillAtZohoBook",
        zoho_error_api_message: error?.response?.data?.message,
      };
      await Order.updateOne({ _id: OrderId }, updatePayload);
      logger.zohoBookInvoice("Error Start");
      logger.zohoBookInvoice(JSON.stringify(error));
      logger.zohoBookInvoice("Error End");
      return false;
    }
  },
  processVendorPaymentAtZohoBook: async (OrderId) => {
    try {
      const settingsData = await Setting.find({}, { zohoBookAccessToken: 1 });
      const options = {
        headers: {
          Authorization:
            "Zoho-oauthtoken " + settingsData[0]["zohoBookAccessToken"],
        },
      };
      var orderDetails = await Order.aggregate([
        {
          //$match: {zoho_invoice_id:{ '$ne':'0'}}, // get orders for which invoice generated and invoice is is assigned.
          $match: {
            _id: new mongoose.Types.ObjectId(OrderId),
          },
        },
        {
          $lookup: {
            from: "posts",
            localField: "post_id",
            foreignField: "_id",
            as: "post",
          },
        },
        { $unwind: "$post" },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $lookup: {
            from: "users",
            localField: "seller_id",
            foreignField: "_id",
            as: "seller",
          },
        },
        { $unwind: "$seller" },
        {
          $project: {
            price: 1,
            zoho_invoice_id: 1,
            zoho_invoice_number: 1,
            zoho_payment_id: 1,
            zoho_payment_number: 1,
            zoho_payment_applied: 1,
            zoho_bill_id: 1,
            zoho_bill_number: 1,
            "customer._id": 1,
            "customer.email": 1,
            "customer.zb_buyer_id": 1,
            "customer.zb_seller_id": 1,
            "customer.zb_buyer_cp_id": 1,
            "customer.zb_seller_cp_id": 1,
            "seller._id": 1,
            "seller.email": 1,
            "seller.zb_buyer_id": 1,
            "seller.zb_seller_id": 1,
            "seller.zb_buyer_cp_id": 1,
            "seller.zb_seller_cp_id": 1,
            zoho_item_id: 1,
            "post.postNumber": 1,
            "post.price": 1,
            "item.who_pay": 1,
            zoho_item_id: 1,
            shipping: 1,
            shipping_fee: 1,
            payment_type: 1,
            discount_price: 1,
            order_number: 1,
            order_number_show: 1,
          },
        },
      ]);
      if (orderDetails[0]) {
        let orderItem = orderDetails[0];

        console.log(
          "----------- processVendorPaymentAtZohoBook: Order Details Start-----------"
        );
        console.log(orderItem);
        console.log(
          "----------- processVendorPaymentAtZohoBook: Order Details End-----------"
        );
        let amount = orderItem.price;
        if (orderItem?.item?.who_pay == "Seller") {
          amount = orderItem.price - orderItem.shipping_fee;
        }
        let vendorPaymentPayload = {
          vendor_id: orderItem.seller.zb_seller_id,
          bills: [
            {
              bill_id: orderItem.zoho_bill_id,
              amount_applied: amount,
            },
          ],
          amount: amount,
          paid_through_account_id:
            config.VENDOR_PAYMENT_PAID_THROUGH_ACCOUNT_ID,
          payment_mode: "Credit Card",
          reference_number: orderItem.order_number_show,
          contact_persons: [orderItem.seller.zb_seller_cp_id],
        };

        console.log(
          "----------- processVendorPaymentAtZohoBook: vendorPaymentPayload Start-----------"
        );
        console.log(vendorPaymentPayload);
        console.log(
          "----------- processVendorPaymentAtZohoBook: vendorPaymentPayload End-----------"
        );

        logger.zohoBookInvoice("vendorPaymentPayload Start");
        logger.zohoBookInvoice(JSON.stringify(vendorPaymentPayload));
        logger.zohoBookInvoice("vendorPaymentPayload End");

        var res = await axios.post(
          "https://books.zoho.com/api/v3/vendorpayments?organization_id=773220360",
          vendorPaymentPayload,
          options
        );

        if (res?.data?.code == 0) {
          console.log(res?.data);

          let vendorPaymentDetails = {
            payment_id: res?.data.vendorpayment.payment_id,
          };

          console.log(
            "----------- processVendorPaymentAtZohoBook: vendorPaymentResponse Start-----------"
          );
          console.log(vendorPaymentDetails);
          console.log(
            "----------- processVendorPaymentAtZohoBook: vendorPaymentResponse End-----------"
          );

          logger.zohoBookInvoice("vendorPaymentResponse Start");
          logger.zohoBookInvoice(JSON.stringify(res?.data?.vendorpayment));
          logger.zohoBookInvoice("vendorPaymentResponse End");

          let updatePayload = {
            zoho_vendor_payment_id: vendorPaymentDetails.payment_id,
          };
          await Order.updateOne({ _id: orderItem._id }, updatePayload);
          return true;
        }
      }
    } catch (error) {
      console.log(error);
      let updatePayload = {
        zoho_error_api: "processVendorPaymentAtZohoBook",
        zoho_error_api_message: error?.response?.data?.message,
      };
      await Order.updateOne({ _id: OrderId }, updatePayload);
      logger.zohoBookInvoice("Error Start");
      logger.zohoBookInvoice(JSON.stringify(error));
      logger.zohoBookInvoice("Error End");
      return false;
    }
  },
  processVendorCreditOrderAtZohoBook: async (OrderId) => {
    // 1a. Vendor Credit  Order(Vendor)
    try {
      const settingsData = await Setting.find({}, { zohoBookAccessToken: 1 });
      const options = {
        headers: {
          Authorization:
            "Zoho-oauthtoken " + settingsData[0]["zohoBookAccessToken"],
        },
      };
      var orderDetails = await Order.aggregate([
        {
          //$match: {zoho_invoice_id:{ '$ne':'0'}}, // get orders for which invoice generated and invoice is is assigned.
          $match: {
            _id: new mongoose.Types.ObjectId(OrderId),
          },
        },
        {
          $lookup: {
            from: "posts",
            localField: "post_id",
            foreignField: "_id",
            as: "post",
          },
        },
        { $unwind: "$post" },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $lookup: {
            from: "users",
            localField: "seller_id",
            foreignField: "_id",
            as: "seller",
          },
        },
        { $unwind: "$seller" },
        {
          $project: {
            price: 1,
            zoho_invoice_id: 1,
            zoho_invoice_number: 1,
            zoho_payment_id: 1,
            zoho_payment_number: 1,
            zoho_payment_applied: 1,
            zoho_bill_id: 1,
            zoho_bill_number: 1,
            "customer._id": 1,
            "customer.email": 1,
            "customer.zb_buyer_id": 1,
            "customer.zb_seller_id": 1,
            "customer.zb_buyer_cp_id": 1,
            "customer.zb_seller_cp_id": 1,
            "seller._id": 1,
            "seller.email": 1,
            "seller.zb_buyer_id": 1,
            "seller.zb_seller_id": 1,
            "seller.zb_buyer_cp_id": 1,
            "seller.zb_seller_cp_id": 1,
            zoho_item_id: 1,
            "post.postNumber": 1,
            "post.price": 1,
            "item.who_pay": 1,
            zoho_item_id: 1,
            shipping: 1,
            shipping_fee: 1,
            payment_type: 1,
            discount_price: 1,
          },
        },
      ]);

      if (orderDetails[0]) {
        let orderItem = orderDetails[0];

        console.log(
          "----------- processVendorCreditOrderAtZohoBook: Order Details Start-----------"
        );
        console.log(orderItem);
        console.log(
          "----------- processVendorCreditOrderAtZohoBook: Order Details End-----------"
        );
        //autoIncrement
        let maxVendorCreditId = await Order.findOne(
          {},
          { zoho_vendor_credit_number: 1 }
        )
          .sort({ zoho_vendor_credit_number: -1 })
          .limit(1);

        maxVendorCreditId = maxVendorCreditId.zoho_vendor_credit_number;
        maxVendorCreditId = await padLeadingZeros(maxVendorCreditId + 1, 10);
        //autoIncrement
        let vendorCreditOrderPayload = {
          vendor_id: orderItem.seller.zb_seller_id,
          vendor_credit_number: maxVendorCreditId,
          tax_treatment: "vat_registered",
          is_update_customer: false,
          is_inclusive_tax: true,
          line_items: [
            {
              item_id: orderItem.zoho_item_id,
            },
          ],
        };
        if (orderItem?.item?.who_pay == "Seller") {
          // if buyer pay shipping fees
          vendorCreditOrderPayload.line_items[1] = {
            item_id: config.SHIPPING_ITEM_ID,
            rate: -orderItem.shipping_fee,
            account_id: config.SHIPPING_ACCOUNT_ID,
          };
        }
        console.log(
          "----------- processVendorCreditOrderAtZohoBook: vendorCreditOrderPayload Start-----------"
        );
        console.log(vendorCreditOrderPayload);
        console.log(
          "----------- processVendorCreditOrderAtZohoBook: vendorCreditOrderPayload End-----------"
        );

        logger.zohoBookInvoice("vendorCreditOrderPayload Start");
        logger.zohoBookInvoice(JSON.stringify(vendorCreditOrderPayload));
        logger.zohoBookInvoice("vendorCreditOrderPayload End");

        var res = await axios.post(
          "https://books.zoho.com/api/v3/vendorcredits?organization_id=773220360",
          vendorCreditOrderPayload,
          options
        );

        if (res?.data?.code == 0) {
          console.log(res?.data);

          let vendorCreditDetails = {
            vendor_credit_id: res?.data?.vendor_credit.vendor_credit_id,
            vendor_credit_number: res?.data?.vendor_credit.vendor_credit_number,
          };

          console.log(
            "----------- processVendorCreditOrderAtZohoBook: vendorCreditResponse Start-----------"
          );
          console.log(vendorCreditDetails);
          console.log(
            "----------- processVendorCreditOrderAtZohoBook: vendorCreditResponse End-----------"
          );

          logger.zohoBookInvoice("vendorPaymentResponse Start");
          logger.zohoBookInvoice(JSON.stringify(res?.data?.vendor_credit));
          logger.zohoBookInvoice("vendorPaymentResponse End");

          let updatePayload = {
            zoho_vendor_credit_id: vendorCreditDetails.vendor_credit_id,
            zoho_vendor_credit_number: vendorCreditDetails.vendor_credit_number,
          };
          await Order.updateOne({ _id: orderItem._id }, updatePayload);
          return true;
        }
      }
    } catch (error) {
      console.log(error);
      let updatePayload = {
        zoho_error_api: "processVendorCreditOrderAtZohoBook",
        zoho_error_api_message: error?.response?.data?.message,
      };
      await Order.updateOne({ _id: OrderId }, updatePayload);
      logger.zohoBookInvoice("Error Start");
      logger.zohoBookInvoice(JSON.stringify(error));
      logger.zohoBookInvoice("Error End");
      return false;
    }
  },
  processApplyVendorCreditOrderAtZohoBook: async (OrderId) => {
    // 2. Apply Vendor Credit Order
    try {
      const settingsData = await Setting.find({}, { zohoBookAccessToken: 1 });
      const options = {
        headers: {
          Authorization:
            "Zoho-oauthtoken " + settingsData[0]["zohoBookAccessToken"],
        },
      };
      var orderDetails = await Order.aggregate([
        {
          //$match: {zoho_invoice_id:{ '$ne':'0'}}, // get orders for which invoice generated and invoice is is assigned.
          $match: {
            _id: new mongoose.Types.ObjectId(OrderId),
          },
        },
        {
          $lookup: {
            from: "posts",
            localField: "post_id",
            foreignField: "_id",
            as: "post",
          },
        },
        { $unwind: "$post" },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $lookup: {
            from: "users",
            localField: "seller_id",
            foreignField: "_id",
            as: "seller",
          },
        },
        { $unwind: "$seller" },
        {
          $project: {
            price: 1,
            zoho_invoice_id: 1,
            zoho_invoice_number: 1,
            zoho_payment_id: 1,
            zoho_payment_number: 1,
            zoho_payment_applied: 1,
            zoho_bill_id: 1,
            zoho_bill_number: 1,
            zoho_vendor_payment_id: 1,
            zoho_vendor_credit_id: 1,
            zoho_vendor_credit_number: 1,
            "customer._id": 1,
            "customer.email": 1,
            "customer.zb_buyer_id": 1,
            "customer.zb_seller_id": 1,
            "customer.zb_buyer_cp_id": 1,
            "customer.zb_seller_cp_id": 1,
            "seller._id": 1,
            "seller.email": 1,
            "seller.zb_buyer_id": 1,
            "seller.zb_seller_id": 1,
            "seller.zb_buyer_cp_id": 1,
            "seller.zb_seller_cp_id": 1,
            zoho_item_id: 1,
            "post.postNumber": 1,
            "post.price": 1,
            "item.who_pay": 1,
            shipping: 1,
            shipping_fee: 1,
            payment_type: 1,
            discount_price: 1,
          },
        },
      ]);
      if (orderDetails[0]) {
        let orderItem = orderDetails[0];

        console.log(
          "----------- processApplyVendorCreditOrderAtZohoBook: Order Details Start-----------"
        );
        console.log(orderItem);
        console.log(
          "----------- processApplyVendorCreditOrderAtZohoBook: Order Details End-----------"
        );
        let amount = orderItem.price;
        if (orderItem?.item?.who_pay == "Seller") {
          amount = orderItem.price - orderItem.shipping_fee;
        }
        let applyVendorCreditPayload = {
          apply_vendor_credits: [
            {
              vendor_credit_id: orderItem.zoho_vendor_credit_id,
              amount_applied: amount, // FIXIT
            },
          ],
        };

        console.log(
          "----------- processApplyVendorCreditOrderAtZohoBook: applyVendorCreditPayload Start-----------"
        );
        console.log(applyVendorCreditPayload);
        console.log(
          "----------- processApplyVendorCreditOrderAtZohoBook: applyVendorCreditPayload End-----------"
        );

        logger.zohoBookInvoice("applyVendorCreditPayload Start");
        logger.zohoBookInvoice(JSON.stringify(applyVendorCreditPayload));
        logger.zohoBookInvoice("applyVendorCreditPayload End");

        var res = await axios.post(
          "https://books.zoho.com/api/v3/bills/" +
            orderItem.zoho_bill_id +
            "/credits?organization_id=773220360",
          applyVendorCreditPayload,
          options
        );

        if (res?.data?.code == 0) {
          console.log(res?.data);

          logger.zohoBookInvoice("applyVendorCreditResponse Start");
          logger.zohoBookInvoice(JSON.stringify(res?.data?.vendor_credit));
          logger.zohoBookInvoice("applyVendorCreditResponse End");

          await Order.updateOne(
            { _id: orderItem._id },
            { zoho_vendor_credit_applied: "1" }
          );
          return true;
        }
      }
    } catch (error) {
      console.log(error);
      let updatePayload = {
        zoho_error_api: "processApplyVendorCreditOrderAtZohoBook",
        zoho_error_api_message: error?.response?.data?.message,
      };
      await Order.updateOne({ _id: OrderId }, updatePayload);
      logger.zohoBookInvoice("Error Start");
      logger.zohoBookInvoice(JSON.stringify(error));
      logger.zohoBookInvoice("Error End");
      return false;
    }
  },
  processVendorCreditOrderShippingAtZohoBook: async (OrderId) => {
    // 3. Vendor Credit Shipping
    try {
      const settingsData = await Setting.find({}, { zohoBookAccessToken: 1 });
      const options = {
        headers: {
          Authorization:
            "Zoho-oauthtoken " + settingsData[0]["zohoBookAccessToken"],
        },
      };
      var orderDetails = await Order.aggregate([
        {
          //$match: {zoho_invoice_id:{ '$ne':'0'}}, // get orders for which invoice generated and invoice is is assigned.
          $match: {
            _id: new mongoose.Types.ObjectId(OrderId),
          },
        },
        {
          $lookup: {
            from: "posts",
            localField: "post_id",
            foreignField: "_id",
            as: "post",
          },
        },
        { $unwind: "$post" },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $lookup: {
            from: "users",
            localField: "seller_id",
            foreignField: "_id",
            as: "seller",
          },
        },
        { $unwind: "$seller" },
        {
          $project: {
            price: 1,
            zoho_invoice_id: 1,
            zoho_invoice_number: 1,
            zoho_payment_id: 1,
            zoho_payment_number: 1,
            zoho_payment_applied: 1,
            zoho_bill_id: 1,
            zoho_bill_number: 1,
            "customer._id": 1,
            "customer.email": 1,
            "customer.zb_buyer_id": 1,
            "customer.zb_seller_id": 1,
            "customer.zb_buyer_cp_id": 1,
            "customer.zb_seller_cp_id": 1,
            "seller._id": 1,
            "seller.email": 1,
            "seller.zb_buyer_id": 1,
            "seller.zb_seller_id": 1,
            "seller.zb_buyer_cp_id": 1,
            "seller.zb_seller_cp_id": 1,
            zoho_item_id: 1,
            "post.postNumber": 1,
            "post.price": 1,
            "item.who_pay": 1,
            shipping: 1,
            shipping_fee: 1,
            payment_type: 1,
            discount_price: 1,
          },
        },
      ]);
      if (orderDetails[0]) {
        let orderItem = orderDetails[0];

        console.log(
          "----------- processVendorCreditOrderShippingAtZohoBook: Order Details Start-----------"
        );
        console.log(orderItem);
        console.log(
          "----------- processVendorCreditOrderShippingAtZohoBook: Order Details End-----------"
        );

        //autoIncrement
        let maxVendorCreditId = await Order.findOne(
          {},
          { zoho_vendor_credit_number_shipping: 1 }
        )
          .sort({ zoho_vendor_credit_number_shipping: -1 })
          .limit(1);

        maxVendorCreditId =
          maxVendorCreditId.zoho_vendor_credit_number_shipping;
        maxVendorCreditId = await padLeadingZeros(maxVendorCreditId + 1, 10);
        //autoIncrement

        let vendorCreditOrderPayload = {
          vendor_id: orderItem.seller.zb_seller_id,
          vendor_credit_number: maxVendorCreditId,
          tax_treatment: "vat_registered",
          is_update_customer: false,
          is_inclusive_tax: true,
          line_items: [
            {
              item_id: orderItem.zoho_item_id,
              rate: orderItem.shipping_fee,
            },
          ],
        };

        console.log(
          "----------- processVendorCreditOrderShippingAtZohoBook: vendorCreditOrderPayload Start-----------"
        );
        console.log(vendorCreditOrderPayload);
        console.log(
          "----------- processVendorCreditOrderShippingAtZohoBook: vendorCreditOrderPayload End-----------"
        );

        logger.zohoBookInvoice("vendorCreditOrderPayload Start");
        logger.zohoBookInvoice(JSON.stringify(vendorCreditOrderPayload));
        logger.zohoBookInvoice("vendorCreditOrderPayload End");

        var res = await axios.post(
          "https://books.zoho.com/api/v3/vendorcredits?organization_id=773220360",
          vendorCreditOrderPayload,
          options
        );

        if (res?.data?.code == 0) {
          console.log(res?.data);

          let vendorCreditDetails = {
            vendor_credit_id: res?.data?.vendor_credit.vendor_credit_id,
            vendor_credit_number: res?.data?.vendor_credit.vendor_credit_number,
          };

          console.log(
            "----------- processVendorCreditOrderAtZohoBook: vendorCreditResponse Start-----------"
          );
          console.log(vendorCreditDetails);
          console.log(
            "----------- processVendorCreditOrderAtZohoBook: vendorCreditResponse End-----------"
          );

          logger.zohoBookInvoice("vendorPaymentResponse Start");
          logger.zohoBookInvoice(JSON.stringify(res?.data?.vendor_credit));
          logger.zohoBookInvoice("vendorPaymentResponse End");

          let updatePayload = {
            zoho_vendor_credit_id_shipping:
              vendorCreditDetails.vendor_credit_id,
            zoho_vendor_credit_number_shipping:
              vendorCreditDetails.vendor_credit_number,
          };
          await Order.updateOne({ _id: orderItem._id }, updatePayload);
          return true;
        }
      }
    } catch (error) {
      console.log(error);

      let updatePayload = {
        zoho_error_api: "processVendorCreditOrderShippingAtZohoBook",
        zoho_error_api_message: error?.response?.data?.message,
      };
      await Order.updateOne({ _id: OrderId }, updatePayload);

      logger.zohoBookInvoice("Error Start");
      logger.zohoBookInvoice(JSON.stringify(error));
      logger.zohoBookInvoice("Error End");
      return false;
    }
  },
  processVendorCreditOrderShippingRefundAtZohoBook: async (OrderId) => {
    // 3. Vendor Credit Shipping Refund
    try {
      const settingsData = await Setting.find({}, { zohoBookAccessToken: 1 });
      const options = {
        headers: {
          Authorization:
            "Zoho-oauthtoken " + settingsData[0]["zohoBookAccessToken"],
        },
      };
      var orderDetails = await Order.aggregate([
        {
          //$match: {zoho_invoice_id:{ '$ne':'0'}}, // get orders for which invoice generated and invoice is is assigned.
          $match: {
            _id: new mongoose.Types.ObjectId(OrderId),
          },
        },
        {
          $lookup: {
            from: "posts",
            localField: "post_id",
            foreignField: "_id",
            as: "post",
          },
        },
        { $unwind: "$post" },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $lookup: {
            from: "users",
            localField: "seller_id",
            foreignField: "_id",
            as: "seller",
          },
        },
        { $unwind: "$seller" },
        {
          $project: {
            price: 1,
            zoho_invoice_id: 1,
            zoho_invoice_number: 1,
            zoho_payment_id: 1,
            zoho_payment_number: 1,
            zoho_payment_applied: 1,
            zoho_bill_id: 1,
            zoho_bill_number: 1,
            "customer._id": 1,
            "customer.email": 1,
            "customer.zb_buyer_id": 1,
            "customer.zb_seller_id": 1,
            "customer.zb_buyer_cp_id": 1,
            "customer.zb_seller_cp_id": 1,
            "seller._id": 1,
            "seller.email": 1,
            "seller.zb_buyer_id": 1,
            "seller.zb_seller_id": 1,
            "seller.zb_buyer_cp_id": 1,
            "seller.zb_seller_cp_id": 1,
            zoho_item_id: 1,
            "post.postNumber": 1,
            "post.price": 1,
            "item.who_pay": 1,
            shipping: 1,
            shipping_fee: 1,
            payment_type: 1,
            discount_price: 1,
            order_number: 1,
            order_number_show: 1,
            zoho_vendor_credit_id_shipping: 1,
          },
        },
      ]);
      if (orderDetails[0]) {
        let orderItem = orderDetails[0];

        console.log(
          "----------- processVendorCreditOrderShippingRefundAtZohoBook: Order Details Start-----------"
        );
        console.log(orderItem);
        console.log(
          "----------- processVendorCreditOrderShippingRefundAtZohoBook: Order Details End-----------"
        );

        //autoIncrement
        let maxVendorCreditId = await Order.findOne(
          {},
          { zoho_vendor_credit_number_shipping: 1 }
        )
          .sort({ zoho_vendor_credit_number_shipping: -1 })
          .limit(1);

        maxVendorCreditId =
          maxVendorCreditId.zoho_vendor_credit_number_shipping;
        maxVendorCreditId = await padLeadingZeros(maxVendorCreditId + 1, 10);
        //autoIncrement

        let vendorCreditOrderShippingRefundPayload = {
          date: moment(orderItem.created_at).format("YYYY-MM-DD"),
          refund_mode: "Credit Card",
          amount: orderItem.shipping_fee,
          account_id: "3124413000000000361",
          description: "",
        };

        console.log(
          "----------- processVendorCreditOrderShippingRefundAtZohoBook: vendorCreditOrderShippingRefundPayload Start-----------"
        );
        console.log(vendorCreditOrderShippingRefundPayload);
        console.log(
          "----------- processVendorCreditOrderShippingRefundAtZohoBook: vendorCreditOrderShippingRefundPayload End-----------"
        );

        logger.zohoBookInvoice("vendorCreditOrderShippingRefundPayload Start");
        logger.zohoBookInvoice(
          JSON.stringify(vendorCreditOrderShippingRefundPayload)
        );
        logger.zohoBookInvoice("vendorCreditOrderShippingRefundPayload End");

        var res = await axios.post(
          "https://books.zoho.com/api/v3/vendorcredits/" +
            orderItem.zoho_vendor_credit_id_shipping +
            "/refunds?organization_id=773220360",
          vendorCreditOrderShippingRefundPayload,
          options
        );

        if (res?.data?.code == 0) {
          console.log(res?.data);

          let vendorCreditDetails = {
            vendor_credit_refund_id:
              res?.data?.vendor_credit_refund.vendor_credit_refund_id,
          };

          console.log(
            "----------- processVendorCreditOrderShippingRefundAtZohoBook: vendorCreditOrderShippingRefundPayloadResponse Start-----------"
          );
          console.log(vendorCreditDetails);
          console.log(
            "----------- processVendorCreditOrderShippingRefundAtZohoBook: vendorCreditOrderShippingRefundPayloadResponse End-----------"
          );

          logger.zohoBookInvoice(
            "vendorCreditOrderShippingRefundResponse Start"
          );
          logger.zohoBookInvoice(
            JSON.stringify(res?.data?.vendor_credit_refund)
          );
          logger.zohoBookInvoice("vendorCreditOrderShippingRefundResponse End");

          let updatePayload = {
            zoho_vendor_credit_id_shipping_refund_id:
              vendorCreditDetails.vendor_credit_refund_id,
          };
          await Order.updateOne({ _id: orderItem._id }, updatePayload);
          return true;
        }
      }
    } catch (error) {
      console.log(error);
      let updatePayload = {
        zoho_error_api: "processVendorCreditOrderShippingRefundAtZohoBook",
        zoho_error_api_message: error?.response?.data?.message,
      };
      await Order.updateOne({ _id: OrderId }, updatePayload);
      logger.zohoBookInvoice("Error Start");
      logger.zohoBookInvoice(JSON.stringify(error));
      logger.zohoBookInvoice("Error End");
      return false;
    }
  },
  processCreditNoteCustomerAtZohoBook: async (OrderId) => {
    // 1a. Credit Note
    try {
      const settingsData = await Setting.find({}, { zohoBookAccessToken: 1 });
      const options = {
        headers: {
          Authorization:
            "Zoho-oauthtoken " + settingsData[0]["zohoBookAccessToken"],
        },
      };
      var orderDetails = await Order.aggregate([
        {
          //$match: {zoho_invoice_id:{ '$ne':'0'}}, // get orders for which invoice generated and invoice is is assigned.
          $match: {
            _id: new mongoose.Types.ObjectId(OrderId),
          },
        },
        {
          $lookup: {
            from: "posts",
            localField: "post_id",
            foreignField: "_id",
            as: "post",
          },
        },
        { $unwind: "$post" },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $lookup: {
            from: "users",
            localField: "seller_id",
            foreignField: "_id",
            as: "seller",
          },
        },
        { $unwind: "$seller" },
        {
          $project: {
            price: 1,
            zoho_invoice_id: 1,
            zoho_invoice_number: 1,
            zoho_payment_id: 1,
            zoho_payment_number: 1,
            zoho_payment_applied: 1,
            zoho_bill_id: 1,
            zoho_bill_number: 1,
            "customer._id": 1,
            "customer.email": 1,
            "customer.zb_buyer_id": 1,
            "customer.zb_seller_id": 1,
            "customer.zb_buyer_cp_id": 1,
            "customer.zb_seller_cp_id": 1,
            "seller._id": 1,
            "seller.email": 1,
            "seller.zb_buyer_id": 1,
            "seller.zb_seller_id": 1,
            "seller.zb_buyer_cp_id": 1,
            "seller.zb_seller_cp_id": 1,
            zoho_item_id: 1,
            "post.postNumber": 1,
            "post.price": 1,
            "item.who_pay": 1,
            shipping: 1,
            shipping_fee: 1,
            payment_type: 1,
            discount_price: 1,
            order_number: 1,
            order_number_show: 1,
            Processing_fee: 1,
          },
        },
      ]);
      if (orderDetails[0]) {
        let orderItem = orderDetails[0];

        console.log(
          "----------- processCreditNoteCustomerAtZohoBook: Order Details Start-----------"
        );
        console.log(orderItem);
        console.log(
          "----------- processCreditNoteCustomerAtZohoBook: Order Details End-----------"
        );
        //autoIncrement
        /*
        let creditnote_number = await Order.findOne(
          {},
          { zoho_customer_creditnote_number: 1 }
        )
          .sort({ zoho_customer_creditnote_number: -1 })
          .limit(1);

        creditnote_number = creditnote_number.zoho_customer_creditnote_number;
        creditnote_number = await padLeadingZeros(creditnote_number + 1, 10);
		*/
        //autoIncrement
        let creditNoteCustomerPayload = {
          customer_id: orderItem.customer.zb_buyer_id,
          contact_persons: [orderItem.customer.zb_buyer_cp_id],
          date: moment(orderItem.created_at).format("YYYY-MM-DD"),
          line_items: [
            {
              item_id: orderItem.zoho_item_id,
              discount: orderItem?.discount_price,
              is_discount_before_tax: true,
              discount_type: "item_level",
            },
            {
              item_id: config.PROCESSING_ITEM_ID,
              rate: orderItem?.Processing_fee,
              account_id: config.PROCESSING_ACCOUNT_ID,
            },
          ],
          //creditnote_number: creditnote_number,
          invoice_id: orderItem.zoho_invoice_id,
          reference_number: orderItem.order_number_show,
          place_of_supply: "SA",
          is_inclusive_tax: "true",
        };
        //orderItem.item.who_pay = "Buyer";
        if (orderItem?.item?.who_pay == "Buyer") {
          // if buyer pay shipping fees
          creditNoteCustomerPayload.line_items[2] = {
            item_id: config.SHIPPING_ITEM_ID,
            rate: orderItem.shipping_fee,
            account_id: config.SHIPPING_ACCOUNT_ID,
          };
        }
        console.log(
          "----------- processCreditNoteCustomerAtZohoBook: creditNoteCustomerPayload Start-----------"
        );
        console.log(creditNoteCustomerPayload);
        console.log(
          "----------- processCreditNoteCustomerAtZohoBook: creditNoteCustomerPayload End-----------"
        );

        logger.zohoBookInvoice("creditNoteCustomerPayload Start");
        logger.zohoBookInvoice(JSON.stringify(creditNoteCustomerPayload));
        logger.zohoBookInvoice("creditNoteCustomerPayload End");

        var res = await axios.post(
          "https://books.zoho.com/api/v3/creditnotes?organization_id=773220360",
          creditNoteCustomerPayload,
          options
        );

        if (res?.data?.code == 0) {
          console.log(res?.data);

          let creditNoteDetails = {
            creditnote_id: res?.data?.creditnote.creditnote_id,
            creditnote_number: res?.data?.creditnote.creditnote_number,
          };

          console.log(
            "----------- processVendorCreditOrderAtZohoBook: vendorCreditResponse Start-----------"
          );
          console.log(creditNoteDetails);
          console.log(
            "----------- processVendorCreditOrderAtZohoBook: vendorCreditResponse End-----------"
          );

          logger.zohoBookInvoice("vendorPaymentResponse Start");
          logger.zohoBookInvoice(JSON.stringify(res?.data?.creditnote));
          logger.zohoBookInvoice("vendorPaymentResponse End");

          let updatePayload = {
            zoho_customer_creditnote_id: creditNoteDetails.creditnote_id,
            zoho_customer_creditnote_number:
              creditNoteDetails.creditnote_number,
          };
          await Order.updateOne({ _id: orderItem._id }, updatePayload);
          return true;
        }
      }
    } catch (error) {
      console.log(error);
      let updatePayload = {
        zoho_error_api: "processCreditNoteCustomerAtZohoBook",
        zoho_error_api_message: error?.response?.data?.message,
      };
      await Order.updateOne({ _id: OrderId }, updatePayload);
      logger.zohoBookInvoice("Error Start");
      logger.zohoBookInvoice(JSON.stringify(error));
      logger.zohoBookInvoice("Error End");
      return false;
    }
  },
  processCreditNoteCustomerRefundAtZohoBook: async (OrderId) => {
    // 2. Refund Credit Note

    try {
      const settingsData = await Setting.find({}, { zohoBookAccessToken: 1 });
      const options = {
        headers: {
          Authorization:
            "Zoho-oauthtoken " + settingsData[0]["zohoBookAccessToken"],
        },
      };
      var orderDetails = await Order.aggregate([
        {
          //$match: {zoho_invoice_id:{ '$ne':'0'}}, // get orders for which invoice generated and invoice is is assigned.
          $match: {
            _id: new mongoose.Types.ObjectId("624ed9233e7dea1d00603798"),
          },
        },
        {
          $lookup: {
            from: "posts",
            localField: "post_id",
            foreignField: "_id",
            as: "post",
          },
        },
        { $unwind: "$post" },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $lookup: {
            from: "users",
            localField: "seller_id",
            foreignField: "_id",
            as: "seller",
          },
        },
        { $unwind: "$seller" },
        {
          $project: {
            price: 1,
            zoho_invoice_id: 1,
            zoho_invoice_number: 1,
            zoho_payment_id: 1,
            zoho_payment_number: 1,
            zoho_payment_applied: 1,
            zoho_bill_id: 1,
            zoho_bill_number: 1,
            zoho_vendor_payment_id: 1,
            zoho_vendor_credit_id: 1,
            zoho_vendor_credit_number: 1,
            zoho_vendor_credit_applied: 1,
            zoho_vendor_credit_id_shipping: 1,
            zoho_vendor_credit_number_shipping: 1,
            zoho_customer_creditnote_id: 1,
            zoho_customer_creditnote_number: 1,
            "customer._id": 1,
            "customer.email": 1,
            "customer.zb_buyer_id": 1,
            "customer.zb_seller_id": 1,
            "customer.zb_buyer_cp_id": 1,
            "customer.zb_seller_cp_id": 1,
            "seller._id": 1,
            "seller.email": 1,
            "seller.zb_buyer_id": 1,
            "seller.zb_seller_id": 1,
            "seller.zb_buyer_cp_id": 1,
            "seller.zb_seller_cp_id": 1,
            zoho_item_id: 1,
            "post.postNumber": 1,
            "post.price": 1,
            "item.who_pay": 1,
            shipping: 1,
            shipping_fee: 1,
            payment_type: 1,
            discount_price: 1,
            Processing_fee: 1,
            order_number: 1,
            order_number_show: 1,
          },
        },
      ]);
      if (orderDetails[0]) {
        let orderItem = orderDetails[0];

        console.log(
          "----------- processCreditNoteCustomerRefundAtZohoBook: Order Details Start-----------"
        );
        console.log(orderItem);
        console.log(
          "----------- processCreditNoteCustomerRefundAtZohoBook: Order Details End-----------"
        );
        let amount = orderItem.price;
        amount = amount - orderItem.discount_price; //console.log(amount);
        amount = amount + orderItem.Processing_fee; //console.log(amount);
        if (orderItem?.item?.who_pay == "Buyer") {
          amount = amount + orderItem.shipping_fee;
        }
        let creditNoteCustomerRefundPayload = {
          refund_mode: "Credit card",
          reference_number: orderItem.order_number_show,
          amount: amount,
          from_account_id: config.CREDIT_NOTE_REFUND_FROM_ACCOUNT_ID,
        };

        console.log(
          "----------- processCreditNoteCustomerRefundAtZohoBook: creditNoteCustomerRefundPayload Start-----------"
        );
        console.log(creditNoteCustomerRefundPayload);
        console.log(
          "----------- processCreditNoteCustomerRefundAtZohoBook: creditNoteCustomerRefundPayload End-----------"
        );

        logger.zohoBookInvoice("creditNoteCustomerRefundPayload Start");
        logger.zohoBookInvoice(JSON.stringify(creditNoteCustomerRefundPayload));
        logger.zohoBookInvoice("creditNoteCustomerRefundPayload End");

        var res = await axios.post(
          "https://books.zoho.com/api/v3/creditnotes/" +
            orderItem.zoho_customer_creditnote_id +
            "/refunds?organization_id=773220360",
          creditNoteCustomerRefundPayload,
          options
        );

        if (res?.data?.code == 0) {
          console.log(res?.data);

          let creditNoteRefundDetails = {
            creditnote_refund_id:
              res?.data?.creditnote_refund.creditnote_refund_id,
          };
          console.log(
            "----------- processCreditNoteCustomerRefundAtZohoBook: creditNoteCustomerRefundResponse Start-----------"
          );
          console.log(creditNoteRefundDetails);
          console.log(
            "----------- processCreditNoteCustomerRefundAtZohoBook: creditNoteCustomerRefundResponse End-----------"
          );

          logger.zohoBookInvoice("creditNoteCustomerRefundResponse Start");
          logger.zohoBookInvoice(JSON.stringify(res?.data?.creditnote));
          logger.zohoBookInvoice("creditNoteCustomerRefundResponse End");

          let updatePayload = {
            zoho_customer_creditnote_refund_id:
              creditNoteRefundDetails.creditnote_refund_id,
          };
          await Order.updateOne({ _id: orderItem._id }, updatePayload);
          return true;
        }
      }
    } catch (error) {
      console.log(error);
      let updatePayload = {
        zoho_error_api: "processCreditNoteCustomerRefundAtZohoBook",
        zoho_error_api_message: error?.response?.data?.message,
      };
      await Order.updateOne({ _id: OrderId }, updatePayload);
      logger.zohoBookInvoice("Error Start");
      logger.zohoBookInvoice(JSON.stringify(error));
      logger.zohoBookInvoice("Error End");
      return false;
    }
  },
  processCreateAndSendBoostInvoiceAtZohoBook: async () => {
    try {
      const settingsData = await Setting.find({}, { zohoBookAccessToken: 1 });
      const options = {
        headers: {
          Authorization:
            "Zoho-oauthtoken " + settingsData[0]["zohoBookAccessToken"],
        },
      };
      var orderDetails = await PurchaseBoot.aggregate([
        {
          //$match: {zoho_invoice_id:{ '$ne':'0'}}, // get orders for which invoice generated and invoice is is assigned.
          $match: {
            _id: new mongoose.Types.ObjectId("622b3ad513672f06503ba98f"),
          },
        },
        {
          $lookup: {
            from: "posts",
            localField: "post",
            foreignField: "_id",
            as: "post",
          },
        },
        { $unwind: "$post" },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "seller",
          },
        },
        { $unwind: "$seller" },
        {
          $lookup: {
            from: "subscriptions",
            localField: "subscription",
            foreignField: "_id",
            as: "subscription",
          },
        },
        { $unwind: "$subscription" },
        {
          $project: {
            price: 1,
            invoice_number: 1,
            subscription: 1,
            "seller._id": 1,
            "seller.email": 1,
            "seller.zb_buyer_id": 1,
            "seller.zb_seller_id": 1,
            "seller.zb_buyer_cp_id": 1,
            "seller.zb_seller_cp_id": 1,
            zoho_item_id: 1,
            "post.postNumber": 1,
            "post.price": 1,
          },
        },
      ]);

      if (orderDetails[0]) {
        let orderItem = orderDetails[0];

        console.log(
          "----------- processCreateAndSendBoostInvoiceAtZohoBook: Order Details Start-----------"
        );
        console.log(orderItem);

        console.log(
          "----------- processCreateAndSendBoostInvoiceAtZohoBook: Order Details End-----------"
        );

        let createAndSendBoostInvoicePayload = {
          customer_id: orderItem.seller.zb_buyer_id,
          contact_person: [orderItem.seller.zb_buyer_cp_id],
          place_of_supply: "SA",
          reference_number: orderItem.invoice_number,
          payment_terms: 0,
          payment_terms_label: "Custom",
          template_id: "3124413000000151032",
          is_inclusive_tax: true,
          line_items: [
            {
              item_id: "3124413000000461051",
              //tax_id: "3124413000000151058",
            },
          ],
        };

        console.log(
          "----------- processCreateAndSendBoostInvoiceAtZohoBook: createAndSendBoostInvoicePayload Start-----------"
        );
        console.log(createAndSendBoostInvoicePayload);
        console.log(
          "----------- processCreateAndSendBoostInvoiceAtZohoBook: createAndSendBoostInvoicePayload End-----------"
        );

        logger.zohoBookInvoice("createAndSendBoostInvoicePayload Start");
        logger.zohoBookInvoice(
          JSON.stringify(createAndSendBoostInvoicePayload)
        );
        logger.zohoBookInvoice("createAndSendBoostInvoicePayload End");

        var res = await axios.post(
          "https://books.zoho.com/api/v3/invoices?organization_id=773220360",
          createAndSendBoostInvoicePayload,
          options
        );

        if (res?.data?.code == 0) {
          console.log(res?.data);

          let invoiceDetails = {
            invoice_id: res?.data?.invoice?.invoice_id,
            invoice_number: res?.data?.invoice?.invoice_id,
          };
          console.log(
            "----------- processCreateAndSendBoostInvoiceAtZohoBook: createAndSendBoostInvoiceResponse Start-----------"
          );
          console.log(invoiceDetails);
          console.log(
            "----------- processCreateAndSendBoostInvoiceAtZohoBook: createAndSendBoostInvoiceResponse End-----------"
          );

          logger.zohoBookInvoice("createAndSendBoostInvoiceResponse Start");
          logger.zohoBookInvoice(JSON.stringify(res?.data?.invoice));
          logger.zohoBookInvoice("createAndSendBoostInvoiceResponse End");

          let updatePayload = {
            zoho_invoice_id: invoiceDetails.invoice_id,
            zoho_invoice_number: invoiceDetails.invoice_number,
          };
          await PurchaseBoot.updateOne({ _id: orderItem._id }, updatePayload);
        }
      }
    } catch (error) {
      console.log(error);
      logger.zohoBookInvoice("Error Start");
      logger.zohoBookInvoice(JSON.stringify(error));
      logger.zohoBookInvoice("Error End");
    }
  },
  processBoostCustomerPaymentAtZohoBook: async () => {
    try {
      const settingsData = await Setting.find({}, { zohoBookAccessToken: 1 });
      const options = {
        headers: {
          Authorization:
            "Zoho-oauthtoken " + settingsData[0]["zohoBookAccessToken"],
        },
      };
      var orderDetails = await PurchaseBoot.aggregate([
        {
          //$match: {zoho_invoice_id:{ '$ne':'0'}}, // get orders for which invoice generated and invoice is is assigned.
          $match: {
            _id: new mongoose.Types.ObjectId("622b3ad513672f06503ba98f"),
          },
        },
        {
          $lookup: {
            from: "posts",
            localField: "post",
            foreignField: "_id",
            as: "post",
          },
        },
        { $unwind: "$post" },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "seller",
          },
        },
        { $unwind: "$seller" },
        {
          $lookup: {
            from: "subscriptions",
            localField: "subscription",
            foreignField: "_id",
            as: "subscription",
          },
        },
        { $unwind: "$subscription" },
        {
          $project: {
            price: 1,
            invoice_number: 1,
            subscription: 1,
            zoho_payment_id: 1,
            "seller._id": 1,
            "seller.email": 1,
            "seller.zb_buyer_id": 1,
            "seller.zb_seller_id": 1,
            "seller.zb_buyer_cp_id": 1,
            "seller.zb_seller_cp_id": 1,
            zoho_item_id: 1,
            "post.postNumber": 1,
            "post.price": 1,
          },
        },
      ]);

      if (orderDetails[0]) {
        let orderItem = orderDetails[0];

        console.log(
          "----------- processBoostCustomerPaymentAtZohoBook: Order Details Start-----------"
        );
        console.log(orderItem);

        console.log(
          "----------- processBoostCustomerPaymentAtZohoBook: Order Details End-----------"
        );

        let createCustomerPaymentPayload = {
          customer_id: orderItem.seller.zb_buyer_id,
          payment_mode: "Credit Card",
          amount: 15,
          date: "2022-04-03",
          reference_number: "12342",
          invoices: [
            {
              invoice_id: "3124413000000492035",
              amount_applied: 15,
            },
          ],
          account_id: "3124413000000000361",
          contact_persons: [orderItem.seller.zb_buyer_cp_id],
        };

        console.log(
          "----------- processBoostCustomerPaymentAtZohoBook: createCustomerPaymentPayload Start-----------"
        );
        console.log(createCustomerPaymentPayload);
        console.log(
          "----------- processBoostCustomerPaymentAtZohoBook: createCustomerPaymentPayload End-----------"
        );

        logger.zohoBookInvoice("createCustomerPaymentPayload Start");
        logger.zohoBookInvoice(JSON.stringify(createCustomerPaymentPayload));
        logger.zohoBookInvoice("createCustomerPaymentPayload End");

        var res = await axios.post(
          "https://books.zoho.com/api/v3/customerpayments?organization_id=773220360",
          createCustomerPaymentPayload,
          options
        );

        if (res?.data?.code == 0) {
          console.log(res?.data);

          let paymentDetails = {
            payment_id: res?.data.payment.payment_id,
            payment_number: res?.data.payment.payment_number,
          };
          console.log(
            "----------- processBoostCustomerPaymentAtZohoBook: createCustomerPaymentResponse Start-----------"
          );
          console.log(invoiceDetails);
          console.log(
            "----------- processBoostCustomerPaymentAtZohoBook: createCustomerPaymentResponse End-----------"
          );

          logger.zohoBookInvoice("createCustomerPaymentResponse Start");
          logger.zohoBookInvoice(JSON.stringify(res?.data?.payment));
          logger.zohoBookInvoice("createCustomerPaymentResponse End");

          let updatePayload = {
            zoho_payment_id: invoiceDetails.payment_id,
            zoho_payment_number: invoiceDetails.payment_number,
          };
          await PurchaseBoot.updateOne({ _id: orderItem._id }, updatePayload);
        }
      }
    } catch (error) {
      console.log(error);
      logger.zohoBookInvoice("Error Start");
      logger.zohoBookInvoice(JSON.stringify(error));
      logger.zohoBookInvoice("Error End");
    }
  },
  processExpenseAtZohoBook: async (OrderId) => {
    try {
      const settingsData = await Setting.find({}, { zohoBookAccessToken: 1 });
      const options = {
        headers: {
          Authorization:
            "Zoho-oauthtoken " + settingsData[0]["zohoBookAccessToken"],
        },
      };
      var orderDetails = await Order.aggregate([
        {
          //$match: {zoho_invoice_id:{ '$ne':'0'}}, // get orders for which invoice generated and invoice is is assigned.
          $match: {
            _id: new mongoose.Types.ObjectId(OrderId),
          },
        },
        {
          $lookup: {
            from: "posts",
            localField: "post_id",
            foreignField: "_id",
            as: "post",
          },
        },
        { $unwind: "$post" },
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $project: {
            price: 1,
            zoho_invoice_id: 1,
            zoho_invoice_number: 1,
            "customer._id": 1,
            "customer.email": 1,
            "customer.zb_buyer_id": 1,
            "customer.zb_seller_id": 1,
            "customer.zb_buyer_cp_id": 1,
            "customer.zb_seller_cp_id": 1,
            zoho_item_id: 1,
            "post.postNumber": 1,
            "post.price": 1,
            order_number: 1,
            order_number_show: 1,
          },
        },
      ]);

      if (orderDetails[0]) {
        let orderItem = orderDetails[0];
        console.log(
          "----------- processExpenseAtZohoBook: Order Details Start-----------"
        );
        console.log(orderItem);
        console.log(
          "----------- processExpenseAtZohoBook: Order Details End-----------"
        );
        let createExpensePayload = {
          date: moment(orderItem.created_at).format("YYYY-MM-DD"),
          line_items: [
            {
              item_id: config.EXPENSE_ITEM_ID,
              amount: 27.5,
              account_id: config.EXPENSE_ACCOUNT_ID,
            },
          ],
          reference_number: orderItem.order_number_show,
          product_type: "service",
          paid_through_account_id: config.EXPENSE_PAID_THROUGH_ACCOUNT_ID,
        };

        console.log(
          "----------- processExpenseAtZohoBook: createExpensePayload Start-----------"
        );
        console.log(createExpensePayload);
        console.log(
          "----------- processExpenseAtZohoBook: createExpensePayload End-----------"
        );

        logger.zohoBookInvoice("createExpensePayload Start");
        logger.zohoBookInvoice(JSON.stringify(createExpensePayload));
        logger.zohoBookInvoice("createExpensePayload End");

        var res = await axios.post(
          "https://books.zoho.com/api/v3/expenses?organization_id=773220360",
          createExpensePayload,
          options
        );

        if (res?.data?.code == 0) {
          //console.log(res?.data);

          let expenseDetails = {
            expense_id: res?.data.expense.expense_id,
          };

          console.log(
            "----------- processExpenseAtZohoBook: createExpensePayloadResponse Start-----------"
          );
          console.log(expenseDetails);
          console.log(
            "----------- processExpenseAtZohoBook: createExpensePayloadResponse End-----------"
          );

          logger.zohoBookInvoice("createExpensePayloadResponse Start");
          logger.zohoBookInvoice(JSON.stringify(res?.data?.payment));
          logger.zohoBookInvoice("createExpensePayloadResponse End");

          let updatePayload = {
            zoho_expense_id: expenseDetails.expense_id,
          };
          await Order.updateOne({ _id: orderItem._id }, updatePayload);
          return true;
        }
      }
    } catch (error) {
      console.log(error);
      let updatePayload = {
        zoho_error_api: "processExpenseAtZohoBook",
        zoho_error_api_message: error?.response?.data?.message,
      };
      await Order.updateOne({ _id: OrderId }, updatePayload);
      logger.zohoBookInvoice("Error Start");
      logger.zohoBookInvoice(JSON.stringify(error));
      logger.zohoBookInvoice("Error End");
      return false;
    }
  },
  kFormatter: async (num) => {
    return Math.abs(num) > 999
      ? Math.sign(num) * (Math.abs(num) / 1000).toFixed(2) + "k"
      : Math.sign(num) * Math.abs(num);
  },
  sliceIntoChunks: async (arr, chunkSize) => {
    const res = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      const chunk = arr.slice(i, i + chunkSize);
      res.push(chunk);
    }
    return res;
  },
  getShippingFeeView: async (item, type) => {
    var l = parseFloat(item.length);
    var w = parseFloat(item.width);
    var h = parseFloat(item.height);
    var weight = parseFloat(item.weight);
    var dimensionWeight = (l * w * h) / 5000;
    var usedWeight =
      weight > dimensionWeight
        ? Math.round(weight)
        : Math.round(dimensionWeight);
    var additionalWeight = usedWeight > 10 ? usedWeight - 10 : 0;

    var flatShipping = 0;
    var additionalValue = 0;
    var vat = 0;
    var total = 0;
    if (type === 1) {
      flatShipping = 18;
      additionalValue = additionalWeight * 1;
    } else {
      flatShipping = 21;
      additionalValue = additionalWeight * 1.25;
    }
    vat = (flatShipping + additionalValue) * 0.15;
    total = flatShipping + additionalValue + vat;

    return total;
  },
  getShippingFeeAramax: async (item, destinationAddress, originAddress) => {
    var l = parseFloat(item.length);
    var w = parseFloat(item.width);
    var h = parseFloat(item.height);
    var weight = parseFloat(item.weight);

    const aramexUrl = process.env.ARAMEX_RateCalculator_URL + "CalculateRate";

    const calculateRequest = {
      ClientInfo: {
        UserName: process.env.ARAMEX_UserName,
        Password: process.env.ARAMEX_Password,
        Version: process.env.ARAMEX_Version,
        AccountNumber: process.env.ARAMEX_AccountNumber,
        AccountPin: process.env.ARAMEX_AccountPin,
        AccountEntity: process.env.ARAMEX_AccountEntity,
        AccountCountryCode: process.env.ARAMEX_AccountCountryCode,
        Source: 24,
      },
      DestinationAddress: {
        Line1: destinationAddress.Line1 ?? "",
        Line2: destinationAddress.Line2 ?? "",
        Line3: destinationAddress.Line3 ?? "",
        City: destinationAddress.City ?? "",
        StateOrProvinceCode: "",
        PostCode: destinationAddress.PostCode ?? "",
        CountryCode: "SA",
        Longitude: 0,
        Latitude: 0,
        BuildingNumber: null,
        BuildingName: null,
        Floor: null,
        Apartment: null,
        POBox: null,
        Description: null,
      },
      OriginAddress: {
        Line1: originAddress.Line1 ?? "",
        Line2: originAddress.Line2 ?? "",
        Line3: originAddress.Line3 ?? "",
        City: originAddress.City ?? "",
        StateOrProvinceCode: "",
        PostCode: originAddress.PostCode ?? "",
        CountryCode: "SA",
        Longitude: 0,
        Latitude: 0,
        BuildingNumber: null,
        BuildingName: null,
        Floor: null,
        Apartment: null,
        POBox: null,
        Description: null,
      },
      PreferredCurrencyCode: "SAR",
      ShipmentDetails: {
        Dimensions: {
          Length: l ?? 0,
          Width: w ?? 0,
          Height: h ?? 0,
          Unit: "CM",
        },
        ActualWeight: {
          Unit: "KG",
          Value: weight ?? 0,
        },
        ChargeableWeight: null,
        DescriptionOfGoods: null,
        GoodsOriginCountry: null,
        NumberOfPieces: 1,
        ProductGroup: "EXP",
        ProductType: "PPX",
        PaymentType: "P",
        PaymentOptions: "",
        CustomsValueAmount: null,
        CashOnDeliveryAmount: null,
        InsuranceAmount: null,
        CashAdditionalAmount: null,
        CashAdditionalAmountDescription: null,
        CollectAmount: null,
        Services: "",
        Items: null,
        DeliveryInstructions: null,
      },
      Transaction: {
        Reference1: "",
        Reference2: "",
        Reference3: "",
        Reference4: "",
        Reference5: "",
      },
    };
    var data = JSON.stringify(calculateRequest);
    var apiConfig = {
      method: "post",
      url: aramexUrl,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data: data,
    };
    var price = 20;
    try {
      const dataResults = await axios(apiConfig);
      return parseFloat(
        ((dataResults.data.TotalAmount.Value / 1000) * 2).toFixed(2)
      );
    } catch (error) {
      console.log("error ==>", error);
      return price;
    }
  },
  getTimeFromMins: async (mins) => {
    let hours = Math.trunc(mins / 60);
    let minutes = mins % 60;
    return hours + "." + minutes;
  },
  getPadLeadingZeros: (num, size) => {
    var s = num + "";
    while (s.length < size) s = "0" + s;
    return s;
  },
  getShippingFee: async (item, destinationAddress, originAddress) => {
    var l = parseFloat(item.length);
    var w = parseFloat(item.width);
    var h = parseFloat(item.height);
    var weight = parseFloat(item.weight);

    const aramexUrl = process.env.ARAMEX_RateCalculator_URL + "CalculateRate";

    const calculateRequest = {
      ClientInfo: {
        UserName: process.env.ARAMEX_UserName,
        Password: process.env.ARAMEX_Password,
        Version: process.env.ARAMEX_Version,
        AccountNumber: process.env.ARAMEX_AccountNumber,
        AccountPin: process.env.ARAMEX_AccountPin,
        AccountEntity: process.env.ARAMEX_AccountEntity,
        AccountCountryCode: process.env.ARAMEX_AccountCountryCode,
        Source: 24,
      },
      DestinationAddress: {
        Line1: destinationAddress.Line1 ?? "",
        Line2: destinationAddress.Line2 ?? "",
        Line3: destinationAddress.Line3 ?? "",
        City: destinationAddress.City ?? "",
        StateOrProvinceCode: "",
        PostCode: destinationAddress.PostCode ?? "",
        CountryCode: "SA",
        Longitude: 0,
        Latitude: 0,
        BuildingNumber: null,
        BuildingName: null,
        Floor: null,
        Apartment: null,
        POBox: null,
        Description: null,
      },
      OriginAddress: {
        Line1: originAddress.Line1 ?? "",
        Line2: originAddress.Line2 ?? "",
        Line3: originAddress.Line3 ?? "",
        City: originAddress.City ?? "",
        StateOrProvinceCode: "",
        PostCode: originAddress.PostCode ?? "",
        CountryCode: "SA",
        Longitude: 0,
        Latitude: 0,
        BuildingNumber: null,
        BuildingName: null,
        Floor: null,
        Apartment: null,
        POBox: null,
        Description: null,
      },
      PreferredCurrencyCode: "SAR",
      ShipmentDetails: {
        Dimensions: {
          Length: l ?? 0,
          Width: w ?? 0,
          Height: h ?? 0,
          Unit: "CM",
        },
        ActualWeight: {
          Unit: "KG",
          Value: weight ?? 0,
        },
        ChargeableWeight: null,
        DescriptionOfGoods: null,
        GoodsOriginCountry: null,
        NumberOfPieces: 1,
        ProductGroup: "EXP",
        ProductType: "PPX",
        PaymentType: "P",
        PaymentOptions: "",
        CustomsValueAmount: null,
        CashOnDeliveryAmount: null,
        InsuranceAmount: null,
        CashAdditionalAmount: null,
        CashAdditionalAmountDescription: null,
        CollectAmount: null,
        Services: "",
        Items: null,
        DeliveryInstructions: null,
      },
      Transaction: {
        Reference1: "",
        Reference2: "",
        Reference3: "",
        Reference4: "",
        Reference5: "",
      },
    };
    var data = JSON.stringify(calculateRequest);
    var apiConfig = {
      method: "post",
      url: aramexUrl,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data: data,
    };
    var price = 20;
    try {
      const dataResults = await axios(apiConfig);
      return parseFloat((dataResults.data.TotalAmount.Value / 1000).toFixed(2));
    } catch (error) {
      console.log("error ==>", error.message);
      return price;
    }
  },

  //Create freshDesk Ticket for item report
  createFreshdeskTicketNumber: async (userInfo,subject,type, description,cc_email,cashout) => {
    try{
    
      var data = JSON.stringify({
        "description": description,
        "type": "Billing",
        "subject": type,
        "email": userInfo.email,
        "priority": 1,
        "status": 2,
        "cc_emails": cc_email,
        "tags": cashout
      });
      
      var config = {
        method: 'post',
        url: 'https://doffotradingcomp-help.freshdesk.com/api/v2/tickets',
        headers: { 
          'Content-Type': 'application/json', 
          'Accept': '*/*', 
          'Accept-Encoding': 'gzip, deflate, br', 
          'Connection': 'keep-alive', 
          'Authorization': 'Basic dlU4UTVhdVg2NDVoV09GbWp6bzpY', 
          'Cookie': '_x_w=43_2'
        },
        data : data
      };

      const responseData = await axios(config);
      return responseData.data;

    }
    catch(error){
      console.log("error ==>",error)
    }
    
  },

  //Create User on freshDesk on register time and hit cron
  createUserAtFreshdesk: async (userInfo) => {
    try{
      console.log('rech helper');
      var data = JSON.stringify({
        "name": userInfo.first_name,
        "email": userInfo.email,
        "active": true,
        "unique_external_id": userInfo._id
      });
  
      var config = {
        method: 'post',
        url: 'https://doffotradingcomp-help.freshdesk.com/api/v2/contacts',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': 'Basic dlU4UTVhdVg2NDVoV09GbWp6bzpY', 
          'Cookie': '_x_w=43_2'
        },
        data : data
      };
      console.log('responseData.data=>>>>>>>>>>>>>',config);
      const responseData = await axios(config);
      
      await User.updateOne({ _id: userInfo._id }, { fresh_desk_id: responseData.data.id});


      console.log('responseData.data=>>>>>>>>>>>>>',responseData.data);
      return responseData.data;
      

    }catch(error){
      console.log("error ==>",error.message)
    }
   
  },
  
  padLeadingZeros: padLeadingZeros,
  getShippingAgent,
};

async function padLeadingZeros(num, size) {
  var s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}
