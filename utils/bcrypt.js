var bcrypt = require('bcryptjs');
/**
 * Create a hash for a string.
 *
 */

exports.hash = async (req, res) => {
  return bcrypt.hash(req, 11);
}

/**
 * Compare a string with the hash.
 *
 */
exports.compare = async (req, hashedValue) => {
  return bcrypt.compare(req, hashedValue);
}
