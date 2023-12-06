const jwbt = require("jsonwebtoken");
var logger = require("./logger");
var config = require("../config/config");
const { accessTokenDuration, accessTokenSecretKey, refreshTokenDuration, refreshTokenSecretKey, forgotVerifyTokenDuration, forgotVerifyTokenSecretKey, smsOtpDuration, smsOtpTokenSecretKey } = config.auth;

/**
 * Generate access token from given data
 *
 */
//exports function generateAccessToken(data) {
exports.generateAccessToken = async (data, res) => {
    logger.log('info', 'JWT: Generating access token -', { data, expiresIn: accessTokenDuration });

    let accessToken = jwbt.sign({ data }, accessTokenSecretKey, { expiresIn: accessTokenDuration });
    return accessToken;

}

/**
 * Generate refresh token from given data
 *
 */
exports.generateRefreshToken = async (data, res) => {
    logger.log('info', 'JWT: Generating refresh token -', { data, expiresIn: refreshTokenDuration });

    let refreshToken = jwbt.sign({ data }, refreshTokenSecretKey, { expiresIn: refreshTokenDuration });
    return refreshToken;
}

/**
 * Generate SMS token from given data
 *
 */
exports.generateOTPToken = async (data, res) => {
    logger.log('info', 'JWT: Generating SMS OTP token -', { data, expiresIn: smsOtpDuration });
    let smsOTPToken = jwbt.sign({ data }, smsOtpTokenSecretKey, { expiresIn: smsOtpDuration });
    return smsOTPToken;
}

exports.generateForgotVerifyToken = async (data, res) => {
    logger.log('info', 'JWT: Generating forgot OTP token -', { data, expiresIn: forgotVerifyTokenDuration });

    return jwbt.sign({ data }, forgotVerifyTokenSecretKey, { expiresIn: forgotVerifyTokenDuration });
}

exports.verifyAccessToken = async (token, res) => {
    return await jwbt.verify(token, accessTokenSecretKey);

}

/**
 * Verify SMS OTP token.
 *
 */
exports.verifyOTPToken = async (token, res) => {
    return jwbt.verify(token, smsOtpTokenSecretKey);
}

/**
 * Verify Forgot OTP token.
 *
 */
exports.verifyForgotVerifyToken = async (token, res) => {
    return jwbt.verify(token, forgotVerifyTokenSecretKey);
}