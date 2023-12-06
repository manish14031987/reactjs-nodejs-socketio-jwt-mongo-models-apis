const Cms = require("../../models/Cms");
const ContactUs = require("../../models/ContactUs");
const Category = require("../../models/Category");
const { responseData } = require("../../helpers/responseData");
const { saveFile } = require("../../helpers/helpers");
const { response } = require("../../resources/response");
const _ = require("lodash");
const Promise = require("bluebird");
const config = require("../../config/config");
const reader = require("xlsx");

module.exports = {
  index: async (req, res) => {
    try {
      let { page, sort, direction, keyword } = req.query;
      var language = req.headers.language ? req.headers.language : "en";
      var langCode = config.LANGUAGE[language];
      const sortOptions = {
        [sort || "created_at"]: direction === "asc" ? 1 : -1,
      };
      const options = {
        page: page || 1,
        limit: process.env.ADMIN_LIST_PAGING_LIMIT || 20,
        sort: sortOptions,
        collation: {
          locale: language,
        },
      };
      var match = { "translate.language": language };
      if (keyword) {
        match["title"] = { $regex: _.trim(keyword), $options: "i" };
      }

      const query = Cms.aggregate([
        { $unwind: "$translate" },
        {
          $project: {
            _id: 1,
            translate: 1,
            created_at: 1,
            status: 1,
            slug: 1,
            title: 1,
          },
        },
        {
          $match: match,
        },
        {
          $sort: sortOptions,
        },
      ]).collation({ locale: langCode, strength: 1 });
      var docs = await Cms.aggregatePaginate(query, options);
      await Promise.map(docs.docs, async (item) => {
        return item;
      });
      const data = await response(docs);
      return res.json(responseData("DATA_RECEIVED", data, 200, req));
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  getCmsData: async (req, res) => {
    try {
      const { id } = req.query;
      Cms.findOne(
        { _id: id },
        { _id: 1, translate: 1, status: 1, slug: 1, title: 1 },
        async function (err, result) {
          if (err || !result) {
            return res
              .status(422)
              .json(responseData("DATA_NOT_FOUND", {}, 422, req));
          } else {
            return res.json(responseData("DATA_RECEIVED", result, 200, req));
          }
        }
      );
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  create: async (req, res) => {
    try {
      const { title, translate, meta_title, meta_keyword, meta_description } =
        req.body;
      const language = Object.keys(translate);
      var item = [];
      language.forEach((data) => {
        item.push(translate[data]);
      });
      var createObj = new Cms();
      createObj.title = title;
      createObj.meta_title = meta_title;
      createObj.meta_keyword = meta_keyword;
      createObj.meta_description = meta_description;
      createObj.translate = item;
      createObj.save(function (err) {
        if (err) {
          for (prop in err.errors) {
            var str = err.errors[prop].message;
            return res.status(422).json(responseData(str, {}, 422, req));
          }
        } else {
          return res.json(responseData("CMS_CREATED", {}, 200, req));
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  update: async (req, res) => {
    try {
      const { id, translate, meta_title, meta_keyword, meta_description } =
        req.body;
      const language = Object.keys(translate);
      var item = [];
      language.forEach((data) => {
        item.push(translate[data]);
      });
      let updateObj = {};
      updateObj.translate = item;
      updateObj.meta_title = meta_title;
      updateObj.meta_keyword = meta_keyword;
      updateObj.meta_description = meta_description;
      await Cms.updateOne({ _id: id }, updateObj, (err) => {
        if (err) {
          return res.status(422).json(responseData(err.message, {}, 422, req));
        }
        return res.json(responseData("CMS_UPDATE", {}, 200, req));
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  getPageData: async (req, res) => {
    try {
      let { slug } = req.params;
      var language = req.headers.language ? req.headers.language : "en";
      var match = { "translate.language": language };
      match.slug = slug;
      Cms.aggregate(
        [
          { $unwind: "$translate" },
          {
            $match: match,
          },
          {
            $project: {
              _id: 1,
              "translate.title": 1,
              "translate.description": 1,
            },
          },
        ],
        async function (err, result) {
          if (err || result == "") {
            return res
              .status(422)
              .json(responseData("DATA_NOT_FOUND", {}, 422, req));
          }
          return res.json(responseData("DATA_RECEIVED", result[0], 200, req));
        }
      );
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  aboutDoffo: async (req, res) => {
    try {
      let { slug } = req.query;
      var language = req.headers.language ? req.headers.language : "en";
      return res.json(
        responseData(
          "DATA_RECEIVED",
          `${process.env.BASE_URL}/${language}/mobile/${slug}`,
          200,
          req
        )
      );
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  contactUs: async (req, res) => {
    try {
      const { name, mobile_number, email, message } = req.body;
      var createObj = new ContactUs();
      createObj.name = name;
      createObj.email = email;
      createObj.mobile_number = mobile_number;
      createObj.message = message;
      createObj.save(async function (err) {
        if (err) {
          for (prop in err.errors) {
            var str = err.errors[prop].message;
            return res.status(422).json(responseData(str, {}, 422, req));
          }
        } else {
          /**
           * Send Email To Admin
           */
          // var settingsData = await setting_service.getSettingsRow();
          // var options = await email_service.getEmailTemplateBySlug(
          //   "admin-will-receive-this-email-when-there-is-a-new-contact-us-request"
          // );
          // options.description = _.replace(
          //   options.description,
          //   "[NAME]",
          //   settingsData.name
          // );
          // options.description = _.replace(
          //   options.description,
          //   "[CONTACT_US_LINK]",
          //   process.env.BASE_URL + "contact-us"
          // );
          // options.description = _.replace(
          //   options.description,
          //   "[LINK]",
          //   process.env.BASE_URL + "contact-us"
          // );
          // options.description = _.replace(
          //   options.description,
          //   "[SUPPORT_EMAIL]",
          //   settingsData.support_email
          // );
          // options.toEmail = settingsData.email;
          // sendMail(options);
          return res.json(responseData("CONTACT_REQUEST", {}, 200, req));
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  uploadFile: async (req, res) => {
    try {
      const { type } = req.body;
      const files = req.files;
      var fileName = await saveFile(files.file, config.CSV_UPLOAD, null);
      const file = reader.readFile(`public/${config.CSV_UPLOAD}/${fileName}`);

      let data = [];
      const sheets = file.SheetNames;

      for (let i = 0; i < sheets.length; i++) {
        const temp = reader.utils.sheet_to_json(
          file.Sheets[file.SheetNames[i]]
        );
        temp.forEach((res) => {
          data.push(res);
        });
      }
      if (data.length > 0) {
        if (type === "category") {
          for (let i = 0; i < data.length; i++) {
            var item = data[i];
            if (item.Category) {
              var filterRequest = { title: item.Category };
              var category = await checkCategory(filterRequest);
              if (category) {
                var request = {
                  title: item.Category,
                  _id: category._id,
                  translate: [
                    {
                      language: "en",
                      title: item.Category,
                    },
                    {
                      language: "ar",
                      title: item.Category,
                    },
                  ],
                };
                await updateCategory(request);

                var filterRequest = {
                  title: item["Sub-Category"],
                  parent: category._id,
                };
                var subCategory = await checkCategory(filterRequest);
                if (subCategory) {
                  var request = {
                    title: item["Sub-Category"],
                    _id: category._id,
                    parent: category._id,
                    translate: [
                      {
                        language: "en",
                        title: item.Category,
                      },
                      {
                        language: "ar",
                        title: item.Category,
                      },
                    ],
                  };
                  await updateCategory(request);
                } else {
                  var request = {
                    title: item["Sub-Category"],
                    parent: category._id,
                    translate: [
                      {
                        language: "en",
                        title: item["Sub-Category"],
                      },
                      {
                        language: "ar",
                        title: item["Sub-Category"],
                      },
                    ],
                  };
                  await createCategory(request);
                }
              } else {
                var request = {
                  title: item.Category,
                  translate: [
                    {
                      language: "en",
                      title: item.Category,
                    },
                    {
                      language: "ar",
                      title: item.Category,
                    },
                  ],
                };
                var saveCategory = await createCategory(request);
                if (saveCategory._id) {
                  var filterRequest = {
                    title: item["Sub-Category"],
                    parent: saveCategory._id,
                  };
                  var subCategory = await checkCategory(filterRequest);
                  if (subCategory) {
                    var request = {
                      title: item["Sub-Category"],
                      _id: category._id,
                      parent: category._id,
                      translate: [
                        {
                          language: "en",
                          title: item.Category,
                        },
                        {
                          language: "ar",
                          title: item.Category,
                        },
                      ],
                    };
                    await updateCategory(request);
                  } else {
                    var request = {
                      title: item["Sub-Category"],
                      parent: saveCategory._id,
                      translate: [
                        {
                          language: "en",
                          title: item["Sub-Category"],
                        },
                        {
                          language: "ar",
                          title: item["Sub-Category"],
                        },
                      ],
                    };
                    await createCategory(request);
                  }
                }
              }
            }
          }
        }
      }
      return res.json(responseData("DATA_UPDATED", [], 200, req));
    } catch (err) {
      return res.status(200).json(responseData("DATA_UPDATED", {}, 200, req));
    }
  },
};

async function checkCategory(filterRequest) {
  try {
    return await Category.findOne(filterRequest, { _id: 1 });
  } catch (err) {
    throw err;
  }
}
async function createCategory(request) {
  try {
    var createObj = new Category();
    createObj.title = request.title;
    if (request.parent) {
      createObj.parent = request.parent;
      if (createObj.title === "Other" || createObj.title === "other") {
        createObj.position = 1000;
      }
    }
    createObj.translate = request.translate;
    var result = await createObj.save();
    return result;
  } catch (err) {
    console.log("err ==>", err);
  }
}
async function updateCategory(request) {
  try {
    var createObj = {};
    createObj.title = request.title;
    if (request.parent) {
      createObj.parent = request.parent;
    }
    createObj.translate = request.translate;
    var result = await Category.updateOne({ _id: request._id }, createObj);
    return result;
  } catch (err) {
    console.log("err ==>", err);
  }
}
