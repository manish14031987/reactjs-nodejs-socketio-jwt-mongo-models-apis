
var axios = require('axios');
const { responseData } = require("../../helpers/responseData");
module.exports = {
  trackPickupNew: async (req) => {
    try {    
        const aramexUrl = process.env.ARAMEX_Tracking_URL+ 'TrackPickup';
        const { PickupId } = req;
        const trackShipmentsRequest = {
          "ClientInfo": {
            "UserName": process.env.ARAMEX_UserName,
            "Password": process.env.ARAMEX_Password,
            "Version": process.env.ARAMEX_Version,
            "AccountNumber": process.env.ARAMEX_AccountNumber,
            "AccountPin": process.env.ARAMEX_AccountPin,
            "AccountEntity": process.env.ARAMEX_AccountEntity,
            "AccountCountryCode": process.env.ARAMEX_AccountCountryCode,
            "Source": 24
          },
          "Reference": PickupId,
          "Transaction": {
            "Reference1": "",
            "Reference2": "",
            "Reference3": "",
            "Reference4": "",
            "Reference5": ""
          }
        }
          var data = JSON.stringify(trackShipmentsRequest);
          var config = {
            method: 'post',
            url: aramexUrl,
            headers: { 
              'Content-Type': 'application/json', 
              'Accept': 'application/json'
            },
            data : data
          };

          axios(config)
          .then(function (response) {
            console.log(JSON.stringify(response.data));
            if (response != null & response.data != null && response.data.HasErrors == false)
            {  
              console.log("PickupId : "+response.data.Reference +" ,"+" LastStatus : "+response.data.LastStatus );            
               return { "PickupId" : response.data.Reference ?? "",
               "LastStatus" : response.data.LastStatus ?? ""
              }
            }
            else
            return null;
          })
          .catch(function (error) {
            console.log(error);
            return null;
          });
    } catch (err) {
      return null
    }
  },

  trackShipmentsNew: async (req) => {
    try {    
        const aramexUrl = process.env.ARAMEX_Tracking_URL+ 'TrackShipments';
        const {  ShipmentNumber } = req;
        const trackShipmentsRequest = {
          "ClientInfo": {
            "UserName": process.env.ARAMEX_UserName,
            "Password": process.env.ARAMEX_Password,
            "Version": process.env.ARAMEX_Version,
            "AccountNumber": process.env.ARAMEX_AccountNumber,
            "AccountPin": process.env.ARAMEX_AccountPin,
            "AccountEntity": process.env.ARAMEX_AccountEntity,
            "AccountCountryCode": process.env.ARAMEX_AccountCountryCode,
            "Source": 24
          },
          "GetLastTrackingUpdateOnly": false,
          "Shipments" : [ShipmentNumber],
          "Transaction": {
            "Reference1": "",
            "Reference2": "",
            "Reference3": "",
            "Reference4": "",
            "Reference5": ""
          }
        }
          var data = JSON.stringify(trackShipmentsRequest);
          var config = {
            method: 'post',
            url: aramexUrl,
            headers: { 
              'Content-Type': 'application/json', 
              'Accept': 'application/json'
            },
            data : data
          };

          axios(config)
          .then(function (response) {
            console.log(JSON.stringify(response.data));
            if (response != null & response.data != null && response.data.HasErrors == false)
            {  
              return response.data.TrackingResults;
            }
            else
            return null;
          })
          .catch(function (error) {
            console.log(error);
            return null;
          });
    } catch (err) {
      return null;
    }
  },

  trackPickup: async (req, res) => {
    try {    
        const aramexUrl = process.env.ARAMEX_Tracking_URL+ 'TrackPickup';
        const { Reference, Transaction } = req.body;
        const trackShipmentsRequest = {
          "ClientInfo": {
            "UserName": process.env.ARAMEX_UserName,
            "Password": process.env.ARAMEX_Password,
            "Version": process.env.ARAMEX_Version,
            "AccountNumber": process.env.ARAMEX_AccountNumber,
            "AccountPin": process.env.ARAMEX_AccountPin,
            "AccountEntity": process.env.ARAMEX_AccountEntity,
            "AccountCountryCode": process.env.ARAMEX_AccountCountryCode,
            "Source": 24
          },
          "Reference": Reference,
          "Transaction": Transaction
        }
          var data = JSON.stringify(trackShipmentsRequest);
          var config = {
            method: 'post',
            url: aramexUrl,
            headers: { 
              'Content-Type': 'application/json', 
              'Accept': 'application/json'
            },
            data : data
          };

          axios(config)
          .then(function (response) {
            console.log(JSON.stringify(response.data));
            return res.json(responseData("DATA_RECEIVED", response.data, 200, req));
          })
          .catch(function (error) {
            console.log(error);
            return res.status(422).json(responseData(err.message, {}, 422, req));
          });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },

  trackShipments: async (req, res) => {
    try {    
        const aramexUrl = process.env.ARAMEX_Tracking_URL+ 'TrackShipments';
        const { GetLastTrackingUpdateOnly, Shipments, Transaction } = req.body;
        const trackShipmentsRequest = {
          "ClientInfo": {
            "UserName": process.env.ARAMEX_UserName,
            "Password": process.env.ARAMEX_Password,
            "Version": process.env.ARAMEX_Version,
            "AccountNumber": process.env.ARAMEX_AccountNumber,
            "AccountPin": process.env.ARAMEX_AccountPin,
            "AccountEntity": process.env.ARAMEX_AccountEntity,
            "AccountCountryCode": process.env.ARAMEX_AccountCountryCode,
            "Source": 24
          },
          "GetLastTrackingUpdateOnly": GetLastTrackingUpdateOnly,
          "Shipments" : Shipments,
          "Transaction": Transaction
        }
          var data = JSON.stringify(trackShipmentsRequest);
          var config = {
            method: 'post',
            url: aramexUrl,
            headers: { 
              'Content-Type': 'application/json', 
              'Accept': 'application/json'
            },
            data : data
          };

          axios(config)
          .then(function (response) {
            console.log(JSON.stringify(response.data));
            return res.json(responseData("DATA_RECEIVED", response.data, 200, req));
          })
          .catch(function (error) {
            console.log(error);
            return res.status(422).json(responseData(err.message, {}, 422, req));
          });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  }
};