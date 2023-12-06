var { Request, Response, NextFunction } = require("express");

var jwt = require("../utils/jwt");
var logger = require("../utils/logger");

/**
 * A middleware to authenticate the authorization token i.e. access token.
 *
 */

exports.authenticate = async (req, res, next) => {
  var token = req.headers["x-access-token"];
  logger.log("info", "JWT: Verifying token - %s", token);
  if (!token) {
    var response = { status: false, message: "No token provided", data: {} };
    return res.status(403).send(response);
  }
  try {
    const responseToc = await jwt.verifyAccessToken(token);
    console.log(responseToc);
    res.locals.accessToken = token;
    res.locals.loggedInPayload = responseToc.data;
    logger.log(
      "debug",
      "JWT: Authentication verified -",
      res.locals.loggedInPayload
    );
    next();
  } catch (err) {
    logger.log("error", "JWT: Authentication failed - %s", err.message);
    var response = {
      status: false,
      message: "Authentication token failed.",
      data: {},
    };
    return res.status(401).send(response);
    next();
  }
};
