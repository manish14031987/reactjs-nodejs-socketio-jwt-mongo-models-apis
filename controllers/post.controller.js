const {
  responseData,
  handleValidationMessage,
} = require("../helpers/responseData");
var post_service = require("../services/post/post.services");
const { lastViewItemService } = require("../services");

module.exports = {
  /**
   * Create a dummy post
   *
   * @method Post
   * @param {*} req
   * @param {*} res
   * @returns
   *
   * {"title":"Samsung Mobile","category":"615ef03131592f36bc325650","brand":"615ef9761a49921180e4c1aa","brandModel":"","condition":"619dfff42cd7010cfc75d6e0","description":"New mobile","price":130.99,"payment_type":"Cash","shipping":true,"shipping_id":"61937924b3eefc0f3039bc18","item_information":{"weight":2,"length":10,"width":100,"height":120},"who_pay":"Seller"}
   */
  createDummy: async (req, res) => {
    try {
      await post_service.createDummy(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Create a dummy post
   *
   * @method Post
   * @param {*} req
   * @param {*} res
   * @returns
   *
   * {"id":"619f67042fe50508f89a478f"}
   */
  preview: async (req, res) => {
    try {
      await post_service.preview(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Create a dummy post
   *
   * @method Post
   * @param {*} req
   * @param {*} res
   * @returns
   *
   * {"_id":"619f6e993fed933d100141cc","title":"Samsung Mobile","category":"615ef03131592f36bc325650","brand":"615ef9761a49921180e4c1aa","brandModel":"","condition":"619dfff42cd7010cfc75d6e0","description":"New mobile","price":130.99,"payment_type":"Cash","shipping":false,"shipping_id":"61937924b3eefc0f3039bc18","item_information":{"weight":2,"length":10,"width":100,"height":120},"who_pay":"Seller"}
   */
  updateDummy: async (req, res) => {
    try {
      await post_service.updateDummy(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Create a dummy post
   *
   * @method Post
   * @param {*} req
   * @param {*} res
   * @returns
   *
   * {"_id":"619f6e993fed933d100141cc"}
   */
  submitPost: async (req, res) => {
    try {
      await post_service.submitPost(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   *
   * @param {*} req
   * @param {*} res
   * @method get
   * @returns
   */
  getPost: async (req, res) => {
    try {
      await post_service.getPost(req, res);
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
   *
   * {{URL}}post/editItem?id=61a0dc371ecaed3270789279
   *
   * @method get
   */
  editItem: async (req, res) => {
    try {
      await post_service.editItem(req, res);
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
   *
   * {{URL}}post/image
   *
   * {"id":"61a226d64f2fdc0c7805734b"}
   *
   * @method delete
   */
  deletePostImage: async (req, res) => {
    try {
      await post_service.deletePostImage(req, res);
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
   *
   * {{URL}}post/update
   *
   * {"_id":"619f6e993fed933d100141cc","title":"Samsung Mobile","category":"615ef03131592f36bc325650","brand":"615ef9761a49921180e4c1aa","brandModel":"","condition":"619dfff42cd7010cfc75d6e0","description":"New mobile","price":130.99,"payment_type":"Cash","shipping":false,"shipping_id":"61937924b3eefc0f3039bc18","item_information":{"weight":2,"length":10,"width":100,"height":120},"who_pay":"Seller"}
   *
   * image with array "image[]"
   *
   * @method post
   *
   * request with form data
   */
  updatePost: async (req, res) => {
    try {
      await post_service.updatePost(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Get Post Details
   * {{URL}}post/details
   * {"id":"61a226d64f2fdc0c78057349","deviceToken":"10025"}
   *
   * @method post
   * @param {*} req
   * @param {*} res
   * @returns
   */
  postDetails: async (req, res) => {
    try {
      await post_service.postDetails(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Add item on Archive list
   *
   * {{URL}}post/archive
   * {"id":"61a226d64f2fdc0c78057349"}
   *
   * @method put
   * @param {*} req
   * @param {*} res
   * @returns
   */
  postArchive: async (req, res) => {
    try {
      await post_service.postArchive(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * Get post Archive List
   *
   * {{URL}}post/archive
   *
   * @method get
   * @param {*} req
   * @param {*} res
   * @returns
   */
  archiveList: async (req, res) => {
    try {
      await post_service.archiveList(req, res);
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
   *
   * {{URL}}post
   *
   * {"id":"61a226d64f2fdc0c7805734b"}
   *
   * @method delete
   */
  deletePost: async (req, res) => {
    try {
      await post_service.deletePost(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   * get all posted item form admin
   *
   * {{URL}}post/admin
   *
   * @param {*} req
   * @param {*} res
   * @method get
   * @returns
   */
  getPostList: async (req, res) => {
    try {
      await post_service.getPostList(req, res);
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
  Process: async (req, res) => {
    try {
      await post_service.process(req, res);
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
  viewItem: async (req, res) => {
    try {
      const { post_id } = req.body;
      var createRequest = {};
      createRequest.user_id = req.user_id;
      createRequest.post_id = post_id;
      await lastViewItemService.create(createRequest);
      return res.json(responseData("SAVE_VIEW_POST", {}, 200, req));
    } catch (err) {
      var msg = handleValidationMessage(err);
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
  /**
   *
   * @param {*} req
   * @param {*} res
   * @returns
   *
   * {{URL}}admin/update
   *
   * {"title":"PEN DRIVE","description":"","price":"200","category":"Music & Sound Recordings","brand":"Bmw","_id":"62c2abac450f9a6f0bb62758","categoryId":"","brandId":""}
   *
   * @method put
   *
   * request with form data
   */
  updatePostAdmin: async (req, res) => {
    try {
      await post_service.updatePostAdmin(req, res);
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
   *
   * {{URL}}boostApply
   *
   * {"subscription":"1 day plan","substationId":"6164377cbeb3aa2384526ce9","post_id":"62c6dac0214e993ed1b9c33f"}
   *
   * @method put
   *
   * request with form data
   */
  boostApply: async (req, res) => {
    try {
      await post_service.boostApply(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },

  /**
   * Create item form admin
   * @param {*} req
   * @param {*} res
   */
  createItem: async (req, res) => {
    try {
      await post_service.createItemAdmin(req, res);
    } catch (err) {
      var msg = err.message || "SOMETHING_WENT_WRONG!";
      return res.status(422).json(responseData(msg, {}, 422, req));
    }
  },
};
