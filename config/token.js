var jwt = require("jsonwebtoken");
var fs = require("fs");
const PUBLIC_KEY = fs.readFileSync("config/public.key");
function verifyToken(req, res, next) {
  var token = req.headers["x-access-token"];
  jwt.verify(token, PUBLIC_KEY, async function (err, decoded) {
    if (err) {
      req.user_id = 0;
      next();
    } else {
      req.user_id = decoded.id;
      next();
    }
  });
}

module.exports = verifyToken;
