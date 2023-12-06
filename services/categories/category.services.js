const Category = require("../../models/Category");
const Brand = require("../../models/Brand");
const { responseData } = require("../../helpers/responseData");
const Promise = require("bluebird");
const _ = require("lodash");
const { ucFirst } = require("../../helpers/helpers");

module.exports = {
  index: async (req, res) => {
    try {
      let { keyword, depth, status } = req.query;
      const id = [];
      const parent = [];
      const Data = [];
      keyword = _.trim(keyword);
      var query = {};
      query.parent = null;
      if (keyword) {
        const categoryData = await Category.find(
          { title: { $regex: _.trim(keyword), $options: "i" } },
          { _id: 1, parent: 1 }
        );
        categoryData.forEach(function (item) {
          if (parent) {
            parent.push(item.parent);
          }
          id.push(item._id);
        });
      }
      if (status) {
        const categoryData = await Category.find(
          { status: status },
          { _id: 1, parent: 1 }
        );
        categoryData.forEach(function (item) {
          if (parent) {
            parent.push(item.parent);
          }
          id.push(item._id);
        });
      }

      await Category.aggregate([
        {
          $match: query,
        },
        {
          $graphLookup: {
            from: "categories",
            startWith: "$_id",
            connectFromField: "parent_id",
            connectToField: "parent",
            as: "children",
            depthField: "depth",
            maxDepth: depth ? 0 : 3,
          },
        },
        { $sort: { title: 1 } },
      ])
        .exec()
        .then(async (categories) => {
          categories.map((category) => {
            if (keyword || status) {
              category.children = list2treeChildren(
                category.children,
                category._id,
                id
              );
            } else {
              category.children = list2tree(category.children, category._id);
            }
            if (keyword || status) {
              if (
                checkAvailability(parent, category._id) ||
                checkAvailability(id, category._id)
              ) {
                Data.push(category);
              }
            } else {
              Data.push(category);
            }
          });

          res.json(responseData("DATA_RECEIVED", Data, 200, req));
        })
        .catch((err) => {
          return res.status(422).json(responseData(err.message, {}, 422, req));
        });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  create: async (req, res) => {
    try {
      var { translate, parent } = req.body;
      const language = Object.keys(translate);
      var item = [];
      var createObj = new Category();
      language.forEach((data) => {
        if (data === "en") {
          createObj.title = translate[data].title;
        }
        item.push(translate[data]);
      });
      if (parent) {
        createObj.parent = parent;
      }
      createObj.translate = item;
      createObj.save(function (err) {
        if (err) {
          for (prop in err.errors) {
            var str = err.errors[prop].message;
            return res.status(422).json(responseData(str, {}, 422, req));
          }
        } else {
          return res.json(responseData("CATEGORY_CREATED", {}, 200, req));
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  update: async (req, res) => {
    try {
      var { translate, parent } = req.body;
      var request = req.body;
      Category.findOne({ _id: request.id }, async function (err, result) {
        if (err || !result) {
          return res
            .status(422)
            .json(responseData("DATA_NOT_FOUND", {}, 422, req));
        } else {
          try {
            var updateObj = {};
            const language = Object.keys(translate);
            var item = [];
            language.forEach((data) => {
              if (data === "en") {
                updateObj.title = translate[data].title;
              }
              item.push(translate[data]);
            });
            if (parent) {
              updateObj.parent = parent;
            }
            updateObj.translate = item;
            await Category.findOneAndUpdate({ _id: request.id }, updateObj);
            return res.json(responseData("CATEGORY_UPDATED", {}, 200, req));
          } catch (err) {
            for (prop in err.errors) {
              var str = err.errors[prop].message;
              return res.status(422).json(responseData(str, {}, 422, req));
            }
          }
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  process: async (req, res) => {
    try {
      let { id, status } = req.query;
      await Category.updateOne(
        { _id: id },
        { status: status },
        async (err, result) => {
          Category.findOne({ _id: id }, async function (err, result) {
            if (err || !result) {
              return res
                .status(422)
                .json(responseData("DATA_NOT_FOUND", {}, 422, req));
            } else {
              if (!parseInt(status)) {
                if (!result.parent) {
                  await Category.updateMany(
                    { parent: result._id },
                    { status: false }
                  );
                }
              }
              var stateMessage = "CATEGORY_DEACTIVATE_STATE";
              if (parseInt(status)) {
                var stateMessage = "CATEGORY_ACTIVE_STATE";
              }
              return res.json(responseData(stateMessage, {}, 200, req));
            }
          });
        }
      );
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  delete: async (req, res) => {
    try {
      let { id } = req.query;
      const count = await Category.countDocuments({ parent: id });
      const brandCategory = await Brand.countDocuments({
        "category.category": id,
      });
      if (count !== 0) {
        return res.status(422).json(responseData("NOT_DELETE", {}, 422, req));
      }
      if (brandCategory !== 0) {
        return res
          .status(422)
          .json(responseData("NOT_DELETE_BRAND", {}, 422, req));
      }

      await Category.deleteOne({ _id: id }, async (err, result) => {
        if (err) {
          return res
            .status(422)
            .json(responseData("DATA_NOT_FOUND", {}, 422, req));
        } else {
          await Category.deleteMany({ parent: id });
          return res.json(responseData("CATEGORY_DELETED", {}, 200, req));
        }
      });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  subCategory: async (req, res) => {
    try {
      var language = req.headers.language ? req.headers.language : "en";
      const data = await Category.aggregate([
        {
          $lookup: {
            from: "categories",
            localField: "parent",
            foreignField: "_id",
            as: "categories",
          },
        },
        { $unwind: "$categories" },
        {
          $match: {
            parent: { $ne: null },
            "translate.language": language,
          },
        },
        {
          $project: {
            _id: 1,
            translate: {
              $filter: {
                input: "$translate",
                as: "item",
                cond: { $eq: ["$$item.language", language] },
              },
            },
            "categories.translate": {
              $filter: {
                input: "$categories.translate",
                as: "item",
                cond: { $eq: ["$$item.language", language] },
              },
            },
          },
        },
      ]).sort({ title: 1 });
      await Promise.map(data, async (item) => {
        item.translate = item.translate[0];
        item.categories = item.categories.translate[0];
        item.categories.title = ucFirst(item.categories.title);
        return item;
      });
      res.json(responseData("DATA_RECEIVED", data, 200, req));
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
  categoryList: async (req, res) => {
    try {
      let { depth, type } = req.query;
      var language = req.headers.language ? req.headers.language : "en";
      const Data = [];
      var categoryList = [];
      var query = {};
      query.parent = null;
      query.status = true;
      await Category.aggregate([
        {
          $match: query,
        },
        {
          $graphLookup: {
            from: "categories",
            startWith: "$_id",
            connectFromField: "parent_id",
            connectToField: "parent",
            as: "children",
            depthField: "depth",
            maxDepth: depth ? 0 : 3,
          },
        },
        {
          $unwind: "$children",
        },
        {
          $sort: {
            "children.position": 1,
            "children.title": 1,
          },
        },
        {
          $group: {
            _id: "$title",
            title: {
              $first: "$title",
            },
            category_id: {
              $first: "$_id",
            },
            translate: {
              $first: "$translate",
            },
            children: {
              $push: "$children",
            },
          },
        },
        {
          $sort: { title: 1 },
        },
        {
          $unset: "children.title",
        },
      ])
        .exec()
        .then(async (categories) => {
          categories.map((category) => {
            Data.push(category);
            var obj = {};
            obj._id = category._id;
            if (language === "en") {
              obj.title = category.translate[0].title;
            }
            if (language === "ar") {
              obj.title = category.translate[1].title;
            }
            obj.children = subCategory(
              category.children,
              language,
              obj.title,
              category.category_id,
              type
            );
            categoryList.push(obj);
          });
          res.json(responseData("DATA_RECEIVED", categoryList, 200, req));
        })
        .catch((err) => {
          return res.status(422).json(responseData(err.message, {}, 422, req));
        });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
};

function list2tree(list, root_id) {
  var map = {},
    node,
    roots = [],
    i;
  for (i = 0; i < list.length; i += 1) {
    map[list[i]._id] = i; // initialize the map
    list[i].children = []; // initialize the children
  }
  for (i = 0; i < list.length; i += 1) {
    node = list[i];
    if (node.parent.toString() !== root_id.toString()) {
      list[map[node.parent]].children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
function subCategory(list, language, title, id, type) {
  var node,
    roots = [],
    i;
  if (type === "all") {
    var obj = {};
    obj.parent = "";
    obj._id = id;
    obj.title = "View All";
    obj.categoryStatus = true;
    roots.push(obj);
  }
  for (i = 0; i < list.length; i += 1) {
    node = list[i];
    var obj = {};
    obj.parent = "";
    obj.categoryStatus = false;
    if (node.slug === "other") {
      obj.parent = title;
    }
    obj._id = node._id;
    if (language === "en") {
      obj.title = node.translate[0].title;
    }
    if (language === "ar") {
      obj.title = node.translate[1].title;
    }
    roots.push(obj);
  }
  return roots;
}

function list2treeChildren(list, root_id, id) {
  var map = {},
    node,
    roots = [],
    i;
  for (i = 0; i < list.length; i += 1) {
    map[list[i]._id] = i; // initialize the map
    list[i].children = []; // initialize the children
  }
  for (i = 0; i < list.length; i += 1) {
    node = list[i];
    if (checkAvailability(id, node._id)) {
      if (node.parent.toString() !== root_id.toString()) {
        list[map[node.parent]].children.push(node);
      } else {
        roots.push(node);
      }
    }
  }
  return roots;
}

function checkAvailability(arr, val) {
  return arr.some((arrVal) => _.trim(val) === _.trim(arrVal));
}
