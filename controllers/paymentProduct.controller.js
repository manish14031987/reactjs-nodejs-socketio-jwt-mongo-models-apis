const { responseData } = require("../helpers/responseData");
var payment_service = require("../services/payment_product/payment_product.services");

module.exports = {
  /**
   * @method get
   * @param {*} req
   * @param {*} res
   * @returns
   */
  buyNow: async (req, res) => {
    try {
      await payment_service.create(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  subscriptionPurchase: async (req, res) => {
    try {
      await payment_service.subscriptionPurchase(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  
  
   orderPayment: async (req, res) => {
    try {
      await payment_service.orderPayment(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  
     autorizePayment: async (req, res) => {
    try {
      await payment_service.autorizePayment(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  
  
  

  
};
