var nodemailer = require('nodemailer');
var { markdown } = require('nodemailer-markdown');

var logger = require('./logger');
var mail = require('../config/config');
const transporter = nodemailer.createTransport(mail.NodeMailertansport);
transporter.use('compile', markdown());
const from = mail.from;

/**
 * Send email using nodemailer transporter.
 *
 */
exports.send = async (mailOptions, res) => {
  try {
    if (!mailOptions.from) {
      mailOptions = { ...mailOptions, from };
    }
    logger.log('debug', 'Mail: Sending email with options -', mailOptions);
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (err) {
    logger.log('error', 'Mail: Failed to send email - %s', err.message);
  }
}


