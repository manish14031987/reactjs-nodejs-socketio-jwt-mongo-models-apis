var address_service = require("../services/userAddress/address.services");
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
      await address_service.create(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   *
   *
   * @method GET
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
  Index: async (req, res) => {
    try {
      await address_service.index(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   *
   *
   * @method PUT
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
  update: async (req, res) => {
    try {
      await address_service.update(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },

  /**
   *
   *
   * @method DELETE
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
  Delete: async (req, res) => {
    try {
      await address_service.delete(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },

  /**
   *
   *
   * @method PATCH
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
  isDefault: async (req, res) => {
    try {
      await address_service.isDefault(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },

  /**
   *
   *
   * @method get
   *
   * Here we can check user have add any address or no
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
  checkUser: async (req, res) => {
    try {
      await address_service.checkUser(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
};
