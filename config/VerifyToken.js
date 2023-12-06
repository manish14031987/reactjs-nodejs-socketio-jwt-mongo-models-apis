var jwt = require("jsonwebtoken");
const Users = require("../models/User");
var fs = require("fs");
const PUBLIC_KEY = fs.readFileSync("config/public.key");
const { responseData } = require("../helpers/responseData");
var logger = require("../utils/logger").Logger;
function verifyToken(req, res, next) {
  var obj = { api: req.originalUrl, method: req.method, body: req.body };
  logger.info(JSON.stringify(obj));
  var token = req.headers["x-access-token"];
  if (!token)
    return res.status(401).send(responseData("UNAUTHORIZED", {}, 401, req));
  jwt.verify(token, PUBLIC_KEY, async function (err, decoded) {
    if (err) {
      return res.status(401).send(responseData("UNAUTHORIZED", {}, 401, req));
    } else {
      var filter = {};
      filter.status = true;
      if (req.headers["devicetype"] && req.headers["devicetype"] == "mobile") {
        //filter.api_token = token;
      }
      const userData = await Users.findOne(filter, { _id: 1 }).lean();
      if (userData && userData._id) {
        req.user_id = decoded.id;
        next();
      } else {
        return res.status(401).send(responseData("UNAUTHORIZED", {}, 401, req));
      }
    }
  });
}

module.exports = verifyToken;
