var recommend_service = require("../services/recommend/recommend.services");
const { responseData } = require("../helpers/responseData");

module.exports = {
  /**
   * Get recommend list
   *
   * @method get
   *
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  getList: async (req, res) => {
    try {
      await recommend_service.getList(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Remove recommend list
   *
   * @method delete
   *
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  deleteList: async (req, res) => {
    try {
      await recommend_service.deleteList(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
};
