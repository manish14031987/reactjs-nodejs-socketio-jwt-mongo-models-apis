const { responseData } = require("../helpers/responseData");
var rateCalculatorServices = require("../services/aramex/rateCalculator.service");

module.exports = {
  /**
   *
   * @method post
   *
   * @param {*} req
   * @param {*} res
   * @returns
   */
   calculateRate: async (req, res) => {
    try {
      await rateCalculatorServices.calculateRate(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  }
};
