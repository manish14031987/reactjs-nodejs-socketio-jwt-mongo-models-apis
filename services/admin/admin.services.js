const Users = require("../../models/User");
const { responseData } = require("../../helpers/responseData");
const { sendMail, saveFile, saveThumbFile } = require("../../helpers/helpers");
const bcrypt = require("bcryptjs");
const { response } = require("../../resources/response");
const _ = require("lodash");
var email_service = require("../email/email.services");
const config = require("../../config/config");
const { v4: uuidv4 } = require("uuid");

module.exports = {
  index: async (req, res) => {
    let {
      page,
      sort,
      direction,
      keyword,
      status,
      created_at_from,
      created_at_to,
    } = req.query;
    keyword = _.trim(keyword);

    const sortOptions = {
      [sort || "created_at"]: direction === "asc" ? 1 : -1,
    };
    var query = {};
    const options = {
      page: page || 1,
      limit: process.env.ADMIN_LIST_PAGING_LIMIT || 20,
      sort: sortOptions,
      select: {
        first_name: 1,
        status: 1,
        last_name: 1,
        email: 1,
        mobile_number: 1,
        api_token: 1,
        last_login_at: 1,
        department: 1,
        department_name: 1,
        created_at: 1,
        image: 1,
        permission: 1,
      },
    };
    if (keyword) {
      query = {
        $or: [
          { first_name: { $regex: keyword, $options: "i" } },
          { last_name: { $regex: keyword, $options: "i" } },
          { email: { $regex: keyword, $options: "i" } },
          { mobile_number: { $regex: keyword, $options: "i" } },
        ],
      };
    }
    if (status) {
      query.status = status;
    }
    query.role_id = 2;
    if (created_at_from && created_at_to) {
      query.created_at = {
        $gte: new Date(created_at_from + "T00:00:00.000Z").toISOString(),
        $lte: new Date(created_at_to + "T23:59:00.000Z").toISOString(),
      };
    } else if (created_at_from) {
      query.created_at = {
        $gte: new Date(created_at_from + "T00:00:00.000Z").toISOString(),
      };
    } else if (created_at_to) {
      query.created_at = {
        $lte: new Date(created_at_to + "T23:59:00.000Z").toISOString(),
      };
    }
    Users.paginate(query, options, async function (err, result) {
      if (err) {
        return res
          .status(422)
          .json(responseData("DATA_NOT_FOUND", {}, 422, req));
      }
      const data = await response(result);
      return res.json(responseData("DATA_RECEIVED", data, 200, req));
    });
  },
  changePassword: async (req, res) => {
    try {
      const { password, id } = req.body;
      Users.findOne({ _id: id }, async function (err, result) {
        if (err || !result) {
          return res
            .status(422)
            .json(responseData("DATA_NOT_FOUND", {}, 422, req));
        } else {
          const passwordHash = bcrypt.hashSync(password, 10);
          var user = {};
          user.password = passwordHash;
          user.api_token = null;
          await Users.updateOne({ _id: id }, user);

          Users.findOne({ _id: id }, async function (err, result) {
            if (err || !result) {
              return res
                .status(422)
                .json(responseData("DATA_NOT_FOUND", {}, 422, req));
            } else {
              return res.json(
                responseData("SUB_ADMIN_PASSWORD_UPDATED", {}, 200, req)
              );
            }
          });
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  create: async (req, res) => {
    try {
      const request = req.body;
      var permissionRequest = JSON.parse(request.permission);
      var sideMenu = [
        {
          id: "pages",
          title: "",
          type: "group",
          icon: "icon-pages",
          children: [],
        },
      ];
      permissionRequest.forEach((item) => {
        if (item.sideMenu) {
          if (item.p_id) {
            const isFoundP = sideMenu[0].children.some((element) => {
              if (element.id === item.p_object.id) {
                return true;
              }
            });
            if (!isFoundP) sideMenu[0].children.push(item.p_object);
          }
          let obj = sideMenu[0].children.find(
            (element) => element.id === item.object.p_id
          );
          if (obj && obj.id) {
            const index = sideMenu[0].children.findIndex(
              (element) => element.id === item.object.p_id
            );
            delete item.object.p_id;
            sideMenu[0].children[index].children.push(item.object);
          } else {
            sideMenu[0].children.push(item.object);
          }
        }
      });
      sideMenu[0].children.sort((a, b) =>
        a.order > b.order ? 1 : b.order > a.order ? -1 : 0
      );

      const files = req.files;
      const passwordHash = bcrypt.hashSync(request.password, 10);
      var user = new Users();
      var token = uuidv4();
      if (request.password !== request.password_confirmation) {
        return res
          .status(422)
          .json(responseData("PASSWORD_NOT_MATCH", {}, 422, req));
      }
      user.permission = permissionRequest;
      user.sidebarMenu = sideMenu;
      user.first_name = request.first_name;
      user.last_name = request.last_name;
      user.email = request.email;
      user.department = request.department;
      user.role_id = 2;
      user.password = passwordHash;
      user.device_token = null;
      user.mobile_number = request.mobile_number;
      user.otp = null;
      user.emailVerify = true;
      user.otpVerify = true;

      user.token = token;
      user.language = req.headers.language;
      if (files && files.image.name != undefined) {
        var profile = await saveFile(files.image, config.USER, null);
        await saveThumbFile(
          files.image,
          config.USER,
          null,
          profile,
          config.USER_HEIGHT,
          config.USER_WIDTH,
          `public/${config.USER}/thumb`
        );
        user.image = profile;
      }
      user.save(async function (err, result) {
        if (err) {
          for (prop in err.errors) {
            var str = err.errors[prop].message;
            return res.status(422).json(responseData(str, {}, 422, req));
          }
        } else {
          var options = await email_service.getEmailTemplateBySlug(
            "new-account"
          );
          options.description = _.replace(
            options.description,
            "[NAME]",
            `${request.first_name} ${request.last_name}`
          );
          options.description = _.replace(
            options.description,
            "[EMAIL]",
            request.email
          );
          options.description = _.replace(
            options.description,
            "[PASSWORD]",
            request.password
          );
          options.toEmail = request.email;
          sendMail(options);
          return res.json(responseData("SUB_ADMIN_CREATE", {}, 200, req));
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  update: async (req, res) => {
    try {
      const request = req.body;
      var permissionRequest = JSON.parse(request.permission);
      var sideMenu = [
        {
          id: "pages",
          title: "",
          type: "group",
          icon: "icon-pages",
          children: [],
        },
      ];
      permissionRequest.forEach((item) => {
        if (item.sideMenu) {
          if (item.p_id) {
            const isFoundP = sideMenu[0].children.some((element) => {
              if (element.id === item.p_object.id) {
                return true;
              }
            });
            if (!isFoundP) sideMenu[0].children.push(item.p_object);
          }
          let obj = sideMenu[0].children.find(
            (element) => element.id === item.object.p_id
          );
          if (obj && obj.id) {
            const index = sideMenu[0].children.findIndex(
              (element) => element.id === item.object.p_id
            );
            delete item.object.p_id;
            sideMenu[0].children[index].children.push(item.object);
          } else {
            sideMenu[0].children.push(item.object);
          }
        }
      });
      const files = req.files;
      Users.findOne({ _id: request.id }, async function (err, result) {
        if (err || !result) {
          return res
            .status(422)
            .json(responseData("DATA_NOT_FOUND", {}, 422, req));
        } else {
          var filename = result.image.substring(
            result.image.lastIndexOf("/") + 1
          );

          sideMenu[0].children.sort((a, b) =>
            a.order > b.order ? 1 : b.order > a.order ? -1 : 0
          );

          var updateObj = {};
          updateObj.permission = permissionRequest;
          updateObj.sidebarMenu = sideMenu;
          updateObj.department = request.department;
          updateObj.first_name = request.first_name;
          updateObj.last_name = request.last_name;
          updateObj.email = request.email;
          updateObj.mobile_number = request.mobile_number;
          if (files && files.image.name != undefined) {
            var profile = await saveFile(files.image, config.USER, filename);
            await saveThumbFile(
              files.image,
              config.USER,
              filename,
              profile,
              config.USER_HEIGHT,
              config.USER_WIDTH,
              `public/${config.USER}/thumb`
            );
            updateObj.image = profile;
          }

          try {
            await Users.findOneAndUpdate({ _id: request.id }, updateObj);
            return res.json(responseData("SUBADMIN_UPDATED", {}, 200, req));
          } catch (err) {
            for (prop in err.errors) {
              var str = err.errors[prop].message;
              return res.status(422).json(responseData(str, {}, 422, req));
            }
          }
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422));
    }
  },
  process: async (req, res) => {
    try {
      let { id, status } = req.query;
      var request = {};
      request.status = status;
      if (!status) {
        request.api_token = null;
      }
      await Users.updateOne({ _id: id }, request, async (err, result) => {
        Users.findOne({ _id: id }, async function (err, result) {
          if (err || !result) {
            return res
              .status(422)
              .json(responseData("DATA_NOT_FOUND", {}, 422, req));
          } else {
            var stateMessage = "SUBADMIN_DEACTIVATE_STATE";
            if (parseInt(status)) {
              var stateMessage = "SUBADMIN_ACTIVE_STATE";
            }
            return res.json(responseData(stateMessage, {}, 200, req));
          }
        });
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  delete: async (req, res) => {
    try {
      let { id } = req.query;
      await Users.deleteOne({ _id: id });
      return res.json(responseData("SUBADMIN_DELETE", {}, 200, req));
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422));
    }
  },
};
