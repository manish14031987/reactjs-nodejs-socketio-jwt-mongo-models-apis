"use strict";
var cron = require("node-cron");
var cron_service = require("../services/cron/cron.services");

/**
 * For every day
 */
cron.schedule("0 0 * * *", () => {
  cron_service.postDeleteCron();
  cron_service.checkUserActivate();
  cron_service.checkReferral();
});

/**
 * For every 5 hours
 */
cron.schedule("* * * * *", () => {
  //cron_service.checkOrderStatus();
  cron_service.checkReturnStatus();
});

/**
 * For every 12 hours
 */
cron.schedule("0 */12 * * *", () => {
  cron_service.checkReturnStatus();
});

/**
 * For every 5 min
 */
cron.schedule("*/10 * * * *", () => {
  //cron_service.checkOfferExpired();
  //cron_service.checkReferral();
  // cron_service.checkOrderStatus();
  // cron_service.checkReturnStatus();
  // cron_service.syncCustomerToZohoBook();
  // cron_service.syncVendorToZohoBook();
  
});

/**
 * For every 40 min
 */
cron.schedule("*/40 * * * *", () => {
  cron_service.syncCustomerToZohoBook();
  cron_service.syncVendorToZohoBook();
  //cron_service.addCustomerToFreshDesk();
});

/**
 * For every 30 min
 */
cron.schedule("*/30 * * * *", () => {
  cron_service.updateThirdPartyAccessToken();
});
