var permission_service = require("../services/permissions/permission.services");
const { responseData } = require("../helpers/responseData");

module.exports = {
  /**
   *
   *
   * @method post
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
  create: async (req, res) => {
    try {
      await permission_service.create(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },

  /**
   *
   * @method post
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */

  save: async (req, res) => {
    try {
      await permission_service.save(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },

  /**
   * @method get
   * @param {*} req
   * @param {*} res
   * @returns
   */
  parentCategory: async (req, res) => {
    try {
      await permission_service.parentCategory(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  Index: async (req, res) => {
    try {
      await permission_service.index(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },

  /**
   *
   *
   * @method post
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
  update: async (req, res) => {
    try {
      await permission_service.update(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
  Process: async (req, res) => {
    try {
      await permission_service.process(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
  Delete: async (req, res) => {
    try {
      await permission_service.delete(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
};
