const { responseData } = require("../helpers/responseData");
var order_service = require("../services/order/order.services");

module.exports = {
  /**
   * Create a purchase order
   * {{URL}}order/purchase
   *
   * @method Post
   * @param {*} req
   * @param {*} res
   * @returns
   *
   * {"code":"","post_id":"61a4b6ee137e6032d42d488d","address_id":"61937924b3eefc0f3039bc18"}
   */
  purchase: async (req, res) => {
    try {
      await order_service.purchase(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Get Buying list
   * {{URL}}order
   *
   * @method Get
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  getListing: async (req, res) => {
    try {
      await order_service.getListing(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Get Order Details
   * {{URL}}order/details?id=61a77d6f74602c3b4055e2c2
   *
   * @method Get
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  getDetails: async (req, res) => {
    try {
      await order_service.getDetails(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Get getShippingLabel
   * {{URL}}order/getShippingLabel?id=61a77d6f74602c3b4055e2c2
   *
   * @method Get
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  getShippingLabel: async (req, res) => {
    try {
      await order_service.getShippingLabel(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Get getPickupInformation
   * {{URL}}order/getPickupInformation?id=61a77d6f74602c3b4055e2c2
   *
   * @method Get
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  getPickupInformation: async (req, res) => {
    try {
      await order_service.getPickupInformation(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Get cancelShipment
   * {{URL}}order/cancelShipment?id=61a77d6f74602c3b4055e2c2
   *
   * @method Get
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  cancelShipment: async (req, res) => {
    try {
      await order_service.cancelShipment(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Get cancelPickup
   * {{URL}}order/cancelPickup?id=61a77d6f74602c3b4055e2c2
   *
   * @method Get
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  cancelPickup: async (req, res) => {
    try {
      await order_service.cancelPickup(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Get Selling item list
   * {{URL}}order/selling
   *
   * @method Get
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  getSellingListing: async (req, res) => {
    try {
      await order_service.getSellingListing(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * mark as item sold
   * {{URL}}order/soldItem
   *
   * {"post_id":"62136c6ed8ad9b0e874c444e","type":"USER"}
   * {"post_id":"62136c6ed8ad9b0e874c444e","type":"OUTSIDE"}
   *
   * @method post
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  soldItem: async (req, res) => {
    try {
      await order_service.soldItem(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * mark as item sold
   * {{URL}}order/returnRequest
   *
   * {"order_id":"","report_id":"","description":"","image":"file"}
   *
   * @method post
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  returnRequest: async (req, res) => {
    try {
      await order_service.returnRequest(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * mark as item sold
   * {{URL}}order/cancel
   *
   * {"id":"6215d47d6a1e1949535ce92a","reason":""}
   *
   * @method post
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  cancelOrder: async (req, res) => {
    try {
      await order_service.cancelOrder(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * mark as item sold
   * {{URL}}order/admin
   *
   *
   * @method get
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  orderList: async (req, res) => {
    try {
      await order_service.orderList(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * reject order item if item it not good
   * {{URL}}order/rejectItem
   *
   * @method post
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  rejectItem: async (req, res) => {
    try {
      await order_service.rejectItem(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },

  /**
   * Approve order item if item it not good
   * {{URL}}order/approveItem
   *
   * @method post
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  approveItem: async (req, res) => {
    try {
      await order_service.approveItem(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },

  /**
   * Check Shipment Status
   * {{URL}}order/checkShipment
   *
   * {"ShipmentId": "3729569163"}
   *
   * @method post
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  checkShipment: async (req, res) => {
    try {
      await order_service.checkShipment(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
};
