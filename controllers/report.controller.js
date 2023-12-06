"use strict";

const { reportService } = require("../services");
const { responseData } = require("../helpers/responseData");

module.exports = {
  /**
   * Get Report Item list
   * {{URL}}report
   * @method get
   *
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  getList: async (req, res) => {
    try {
      var selectPattern = {
        _id: 1,
        translate: 1,
        created_at: 1,
        status: 1,
        slug: 1,
        title: 1,
      };
      var data = await reportService.getPaginatedData(req, selectPattern);
      return res.json(responseData("DATA_RECEIVED", data, 200, req));
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },

  /**
   * Create request data
   * {{URL}}report
   *
   * {"id":"","translate":{"en":{"language":"en","title":"cvcvcv"},"ar":{"language":"ar","title":"cvcvcvcvcv   fgfg"}}}
   * @method post
   *
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  saveRecord: async (req, res) => {
    try {
      var createPattern = {};
      const { translate } = req.body;
      const language = Object.keys(translate);
      var item = [];
      language.forEach((data) => {
        if (data === "en") {
          createPattern.title = translate[data].title;
        }
        item.push(translate[data]);
      });
      createPattern.translate = item;
      await reportService.saveRecord(createPattern);
      return res.json(responseData("REPORT_CREATED", {}, 200, req));
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Delete recode item
   * {{URL}}report?id=621f56771077e119487bdec8
   *
   * @method delete
   *
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  deleteRecord: async (req, res) => {
    try {
      const { id } = req.query;
      const findPattern = { _id: id };
      await reportService.deleteRecord(findPattern);
      return res.json(responseData("REPORT_CREATED", {}, 200, req));
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Update recode item
   * {{URL}}report?id=621f6f9ae074754b64cabfa3&status=0
   *
   * @method patch
   *
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  processRecord: async (req, res) => {
    try {
      const { id, status } = req.query;
      const findPattern = { _id: id };
      const updatePattern = { status: status };
      await reportService.updateRecord(findPattern, updatePattern);
      return res.json(responseData("REPORT_UPDATE", {}, 200, req));
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Get recode item
   * {{URL}}report?id=621f6f9ae074754b64cabfa3
   *
   * @method get
   *
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  getRecord: async (req, res) => {
    try {
      const { id } = req.query;
      const findPattern = { _id: id };
      const selectPattern = {
        _id: 1,
        translate: 1,
        created_at: 1,
        status: 1,
        slug: 1,
        title: 1,
      };
      var data = await reportService.getRecord(findPattern, selectPattern);
      return res.json(responseData("DATA_RECEIVED", data, 200, req));
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Update Record
   * {{URL}}report
   *
   * {"id":"","translate":{"en":{"language":"en","title":"cvcvcv"},"ar":{"language":"ar","title":"cvcvcvcvcv   fgfg"}}}
   *
   * @method put
   *
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  updateRecord: async (req, res) => {
    try {
      const { id, translate } = req.body;
      const findPattern = { _id: id };
      const language = Object.keys(translate);
      var item = [];
      let updateObj = {};
      language.forEach(async (data) => {
        if (data === "en") {
          updateObj.title = translate[data].title;
        }
        item.push(translate[data]);
      });
      updateObj.translate = item;
      await reportService.updateRecord(findPattern, updateObj);
      return res.json(responseData("REPORT_UPDATE", {}, 200, req));
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   *  Get all recode
   * {{URL}}report
   *
   * @method get
   *
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  listRecode: async (req, res) => {
    try {
      var language = req.headers.language ? req.headers.language : "en";
      var filterPattern = {
        status: true,
        "translate.language": language,
      };
      var selectPattern = { _id: 1, "translate.title": 1 };
      var sortPattern = { "translate.title": 1 };
      var data = await reportService.getData(
        filterPattern,
        selectPattern,
        sortPattern
      );
      return res.json(responseData("DATA_UPDATED", data, 200, req));
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Submit report for item
   * {"post_id":"61f8f150950ef9583f66853a"}
   *
   * @method post
   *
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  submitReportItem: async (req, res) => {
    try {
      console.log('description',req.user_id);
      const createPattern = {
        user_id: req.user_id,
        post_id: req.body.post_id,
        description: req.body.description,
        type: req.body.type
        
      };
      var ticket_no = await reportService.submitReport(createPattern);
      return res.json(responseData("REPORT_SUBMITTED", {ticketNo:ticket_no}, 200, req));
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * get all product reported  issue
   * {{URL}}report/reportProduct
   * @method get
   *
   * @param {*} req
   * @param {*} res
   * @returns
   *
   */
  getReportedList: async (req, res) => {
    try {
      var selectPattern = {
        _id: 1,
        "report.title": 1,
        "item.title": 1,
        "item._id": 1,
        created_at: 1,
      };
      var data = await reportService.getReportedPaginatedData(
        req,
        selectPattern
      );
      return res.json(responseData("DATA_RECEIVED", data, 200, req));
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
};
