var axios = require("axios");
const { responseData } = require("../../helpers/responseData");
var moment = require("moment");
module.exports = {
  createShipmentNew: async (req) => {
    try {
      const aramexUrl = process.env.ARAMEX_Shipping_URL + "CreateShipments";
      const {
        FromAddress,
        FromContact,
        ToAddress,
        ToContact,
        PickupLocation,
        FromDateTime,
        OperatingInstruction,
        Remarks,
        ShipmentRef,
        ShipperRef,
        ConsigneeRef1,
        ConsigneeRef2,
        OrderId,
        Dimensions,
        ActualWeight,
        DescriptionOfGoods,
      } = req;

      let fromDateUnix = moment(FromDateTime).unix();

      const d_t = new Date();
      let year = d_t.getFullYear();
      let month = ("0" + (d_t.getMonth() + 1)).slice(-2);
      let day = ("0" + d_t.getDate()).slice(-2);
      let hour = d_t.getHours();
      let minute = d_t.getMinutes();
      let seconds = d_t.getSeconds();

      let orderIdUnique =
        OrderId +
        "" +
        year +
        "" +
        month +
        "" +
        day +
        "" +
        hour +
        "" +
        minute +
        "" +
        seconds;

      const createShipmentsRequest = {
        ClientInfo: {
          UserName: process.env.ARAMEX_UserName,
          Password: process.env.ARAMEX_Password,
          Version: process.env.ARAMEX_Version,
          AccountNumber: process.env.ARAMEX_AccountNumber,
          AccountPin: process.env.ARAMEX_AccountPin,
          AccountEntity: process.env.ARAMEX_AccountEntity,
          AccountCountryCode: process.env.ARAMEX_AccountCountryCode,
          Source: 24,
        },
        Shipments: [
          {
            Reference1: ShipmentRef ?? "",
            Reference2: "",
            Reference3: "",
            Shipper: {
              Reference1: ShipperRef,
              Reference2: "",
              AccountNumber: "115051",
              PartyAddress: {
                Line1: FromAddress.Line1 ?? "",
                Line2: FromAddress.Line2 ?? "",
                Line3: FromAddress.Line3 ?? "",
                City: FromAddress.City ?? "",
                StateOrProvinceCode: "",
                PostCode: FromAddress.PostCode ?? "",
                CountryCode: "SA",
                Longitude: 0,
                Latitude: 0,
                BuildingNumber: null,
                BuildingName: null,
                Floor: null,
                Apartment: null,
                POBox: null,
                Description: null,
              },
              Contact: {
                Department: "",
                PersonName: FromContact.PersonName ?? "",
                Title: "",
                CompanyName: FromContact.CompanyName ?? "",
                PhoneNumber1: FromContact.PhoneNumber ?? "",
                PhoneNumber1Ext: "",
                PhoneNumber2: "",
                PhoneNumber2Ext: "",
                FaxNumber: "",
                CellPhone: FromContact.PhoneNumber ?? "",
                EmailAddress: "",
                Type: "",
              },
            },
            Consignee: {
              Reference1: ConsigneeRef1 ?? "",
              Reference2: ConsigneeRef2 ?? "",
              AccountNumber: "",
              PartyAddress: {
                Line1: ToAddress.Line1 ?? "",
                Line2: ToAddress.Line2 ?? "",
                Line3: ToAddress.Line3 ?? "",
                City: ToAddress.City ?? "",
                StateOrProvinceCode: "",
                PostCode: ToAddress.PostCode ?? "",
                CountryCode: "SA",
                Longitude: 0,
                Latitude: 0,
                BuildingNumber: "",
                BuildingName: "",
                Floor: "",
                Apartment: "",
                POBox: null,
                Description: "",
              },
              Contact: {
                Department: "",
                PersonName: ToContact.PersonName ?? "",
                Title: "",
                CompanyName: ToContact.CompanyName ?? "",
                PhoneNumber1: ToContact.PhoneNumber ?? "",
                PhoneNumber1Ext: "",
                PhoneNumber2: "",
                PhoneNumber2Ext: "",
                FaxNumber: "",
                CellPhone: ToContact.PhoneNumber ?? "",
                EmailAddress: "",
                Type: "",
              },
            },
            ThirdParty: {
              Reference1: "",
              Reference2: "",
              AccountNumber: "",
              PartyAddress: {
                Line1: "",
                Line2: "",
                Line3: "",
                City: "",
                StateOrProvinceCode: "",
                PostCode: "",
                CountryCode: "",
                Longitude: 0,
                Latitude: 0,
                BuildingNumber: null,
                BuildingName: null,
                Floor: null,
                Apartment: null,
                POBox: null,
                Description: null,
              },
              Contact: {
                Department: "",
                PersonName: "",
                Title: "",
                CompanyName: "",
                PhoneNumber1: "",
                PhoneNumber1Ext: "",
                PhoneNumber2: "",
                PhoneNumber2Ext: "",
                FaxNumber: "",
                CellPhone: "",
                EmailAddress: "",
                Type: "",
              },
            },
            ShippingDateTime: "/Date(" + fromDateUnix + "+0300)/",
            DueDate: "/Date(" + fromDateUnix + "+0300)/",
            Comments: Remarks ?? "",
            PickupLocation: PickupLocation ?? "",
            OperationsInstructions: OperatingInstruction ?? "",
            AccountingInstrcutions: "",
            Details: {
              Dimensions: {
                Length: Dimensions.Length ?? 0,
                Width: Dimensions.Width ?? 0,
                Height: Dimensions.Height ?? 0,
                Unit: "CM",
              },
              ActualWeight: {
                Unit: "KG",
                Value: ActualWeight ?? 0,
              },
              ChargeableWeight: null,
              DescriptionOfGoods: DescriptionOfGoods ?? "",
              GoodsOriginCountry: "",
              NumberOfPieces: 1,
              ProductGroup: "EXP",
              ProductType: "PDX",
              PaymentType: "P",
              PaymentOptions: "",
              CustomsValueAmount: null,
              CashOnDeliveryAmount: null,
              InsuranceAmount: null,
              CashAdditionalAmount: null,
              CashAdditionalAmountDescription: "",
              CollectAmount: null,
              Services: "",
              Items: [],
              DeliveryInstructions: null,
            },
            Attachments: [],
            ForeignHAWB: orderIdUnique,
            "TransportType ": 0,
            PickupGUID: null,
            Number: "",
            ScheduledDelivery: null,
          },
        ],
        LabelInfo: {
          ReportID: 9201,
          ReportType: "URL",
        },
        Transaction: {
          Reference1: "",
          Reference2: "",
          Reference3: "",
          Reference4: "",
          Reference5: "",
        },
      };
      var data = JSON.stringify(createShipmentsRequest);
      var config = {
        method: "post",
        url: aramexUrl,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: data,
      };

      axios(config)
        .then(function (response) {
          console.log(JSON.stringify(response.data));
          if (
            response != null &&
            response.data != null &&
            response.data.HasErrors == false &&
            response.data.Shipments != null &&
            response.data.Shipments.length > 0 &&
            response.data.Shipments[0].HasErrors == false
          ) {
            let resultRes = {
              ShipmentId: response.data.Shipments[0].ID,
              ShipmentForeignHAWB: response.data.Shipments[0].ForeignHAWB,
              ShipmentLabelURL:
                response.data.Shipments[0].ShipmentLabel.LabelURL,
            };
            console.log(JSON.stringify(resultRes));
            return resultRes;
          } else return null;
        })
        .catch(function (error) {
          console.log(error);
          return res.status(422).json(responseData(err.message, {}, 422, req));
        });
    } catch (err) {
      return null;
    }
  },
  createPickupNew: async (req) => {
    try {
      const aramexUrl = process.env.ARAMEX_Shipping_URL + "CreatePickup";
      const {
        FromAddress,
        FromContact,
        ToAddress,
        ToContact,
        PickupLocation,
        FromDateTime,
        ToDateTime,
        OperatingInstruction,
        Remarks,
        ShipmentRef,
        ShipperRef,
        ConsigneeRef1,
        ConsigneeRef2,
        OrderId,
        Dimensions,
        ActualWeight,
        DescriptionOfGoods,
      } = req;

      let fromDateUnix = moment(FromDateTime).unix();
      let toDateUnix = moment(ToDateTime).unix();

      const d_t = new Date();
      let year = d_t.getFullYear();
      let month = ("0" + (d_t.getMonth() + 1)).slice(-2);
      let day = ("0" + d_t.getDate()).slice(-2);
      let hour = d_t.getHours();
      let minute = d_t.getMinutes();
      let seconds = d_t.getSeconds();

      let orderIdUnique =
        OrderId +
        "" +
        year +
        "" +
        month +
        "" +
        day +
        "" +
        hour +
        "" +
        minute +
        "" +
        seconds;

      const createPickupRequest = {
        ClientInfo: {
          UserName: process.env.ARAMEX_UserName,
          Password: process.env.ARAMEX_Password,
          Version: process.env.ARAMEX_Version,
          AccountNumber: process.env.ARAMEX_AccountNumber,
          AccountPin: process.env.ARAMEX_AccountPin,
          AccountEntity: process.env.ARAMEX_AccountEntity,
          AccountCountryCode: process.env.ARAMEX_AccountCountryCode,
          Source: 24,
        },
        LabelInfo: {
          ReportID: 9201,
          ReportType: "URL",
        },
        Pickup: {
          PickupAddress: {
            Line1: FromAddress.Line1 ?? "",
            Line2: FromAddress.Line2 ?? "",
            Line3: FromAddress.Line3 ?? "",
            City: FromAddress.City ?? "",
            StateOrProvinceCode: "",
            PostCode: FromAddress.PostCode ?? "",
            CountryCode: "SA",
            Longitude: 0,
            Latitude: 0,
            BuildingNumber: null,
            BuildingName: null,
            Floor: null,
            Apartment: null,
            POBox: null,
            Description: null,
          },
          PickupContact: {
            Department: "",
            PersonName: FromContact.PersonName ?? "",
            Title: "",
            CompanyName: FromContact.CompanyName ?? "",
            PhoneNumber1: FromContact.PhoneNumber ?? "",
            PhoneNumber1Ext: "",
            PhoneNumber2: "",
            PhoneNumber2Ext: "",
            FaxNumber: "",
            CellPhone: "",
            EmailAddress: "",
            Type: "",
          },
          PickupLocation: PickupLocation,
          PickupDate: "/Date(" + fromDateUnix + "+0300)/",
          ReadyTime: "/Date(" + fromDateUnix + "+0300)/",
          LastPickupTime: "/Date(" + toDateUnix + "+0300)/",
          ClosingTime: "/Date(" + toDateUnix + "+0300)/",
          Comments: "",
          Reference1: "",
          Reference2: "",
          Vehicle: "",
          Shipments: [
            {
              Reference1: ShipmentRef ?? "",
              Reference2: "",
              Reference3: "",
              Shipper: {
                Reference1: ShipperRef,
                Reference2: "",
                AccountNumber: "115051",
                PartyAddress: {
                  Line1: FromAddress.Line1 ?? "",
                  Line2: FromAddress.Line2 ?? "",
                  Line3: FromAddress.Line3 ?? "",
                  City: FromAddress.City ?? "",
                  StateOrProvinceCode: "",
                  PostCode: FromAddress.PostCode ?? "",
                  CountryCode: "SA",
                  Longitude: 0,
                  Latitude: 0,
                  BuildingNumber: null,
                  BuildingName: null,
                  Floor: null,
                  Apartment: null,
                  POBox: null,
                  Description: null,
                },
                Contact: {
                  Department: "",
                  PersonName: FromContact.PersonName ?? "",
                  Title: "",
                  CompanyName: FromContact.CompanyName ?? "",
                  PhoneNumber1: FromContact.PhoneNumber ?? "",
                  PhoneNumber1Ext: "",
                  PhoneNumber2: "",
                  PhoneNumber2Ext: "",
                  FaxNumber: "",
                  CellPhone: FromContact.PhoneNumber ?? "",
                  EmailAddress: "",
                  Type: "",
                },
              },
              Consignee: {
                Reference1: ConsigneeRef1 ?? "",
                Reference2: ConsigneeRef2 ?? "",
                AccountNumber: "",
                PartyAddress: {
                  Line1: ToAddress.Line1 ?? "",
                  Line2: ToAddress.Line2 ?? "",
                  Line3: ToAddress.Line3 ?? "",
                  City: ToAddress.City ?? "",
                  StateOrProvinceCode: "",
                  PostCode: ToAddress.PostCode ?? "",
                  CountryCode: "SA",
                  Longitude: 0,
                  Latitude: 0,
                  BuildingNumber: "",
                  BuildingName: "",
                  Floor: "",
                  Apartment: "",
                  POBox: null,
                  Description: "",
                },
                Contact: {
                  Department: "",
                  PersonName: ToContact.PersonName ?? "",
                  Title: "",
                  CompanyName: ToContact.CompanyName ?? "",
                  PhoneNumber1: ToContact.PhoneNumber ?? "",
                  PhoneNumber1Ext: "",
                  PhoneNumber2: "",
                  PhoneNumber2Ext: "",
                  FaxNumber: "",
                  CellPhone: ToContact.PhoneNumber ?? "",
                  EmailAddress: "",
                  Type: "",
                },
              },
              ThirdParty: {
                Reference1: "",
                Reference2: "",
                AccountNumber: "",
                PartyAddress: {
                  Line1: "",
                  Line2: "",
                  Line3: "",
                  City: "",
                  StateOrProvinceCode: "",
                  PostCode: "",
                  CountryCode: "",
                  Longitude: 0,
                  Latitude: 0,
                  BuildingNumber: null,
                  BuildingName: null,
                  Floor: null,
                  Apartment: null,
                  POBox: null,
                  Description: null,
                },
                Contact: {
                  Department: "",
                  PersonName: "",
                  Title: "",
                  CompanyName: "",
                  PhoneNumber1: "",
                  PhoneNumber1Ext: "",
                  PhoneNumber2: "",
                  PhoneNumber2Ext: "",
                  FaxNumber: "",
                  CellPhone: "",
                  EmailAddress: "",
                  Type: "",
                },
              },
              ShippingDateTime: "/Date(" + fromDateUnix + "+0300)/",
              DueDate: "/Date(" + fromDateUnix + "+0300)/",
              Comments: Remarks ?? "",
              PickupLocation: PickupLocation ?? "",
              OperationsInstructions: OperatingInstruction ?? "",
              AccountingInstrcutions: "",
              Details: {
                Dimensions: {
                  Length: Dimensions.Length ?? 0,
                  Width: Dimensions.Width ?? 0,
                  Height: Dimensions.Height ?? 0,
                  Unit: "CM",
                },
                ActualWeight: {
                  Unit: "KG",
                  Value: ActualWeight ?? 0,
                },
                ChargeableWeight: null,
                DescriptionOfGoods: DescriptionOfGoods ?? "",
                GoodsOriginCountry: "",
                NumberOfPieces: 1,
                ProductGroup: "EXP",
                ProductType: "PDX",
                PaymentType: "P",
                PaymentOptions: "",
                CustomsValueAmount: null,
                CashOnDeliveryAmount: null,
                InsuranceAmount: null,
                CashAdditionalAmount: null,
                CashAdditionalAmountDescription: "",
                CollectAmount: null,
                Services: "",
                Items: [],
                DeliveryInstructions: null,
              },
              Attachments: [],
              ForeignHAWB: orderIdUnique,
              "TransportType ": 0,
              PickupGUID: null,
              Number: "",
              ScheduledDelivery: null,
            },
          ],
          PickupItems: [
            {
              ProductGroup: "EXP",
              ProductType: "PDX",
              NumberOfShipments: 1,
              PackageType: "Box",
              Payment: "P",
              ShipmentWeight: {
                Unit: "KG",
                Value: ActualWeight ?? 0,
              },
              ShipmentVolume: null,
              NumberOfPieces: 1,
              CashAmount: null,
              ExtraCharges: null,
              ShipmentDimensions: {
                Length: Dimensions.Length ?? 0,
                Width: Dimensions.Width ?? 0,
                Height: Dimensions.Height ?? 0,
                Unit: "CM",
              },
              Comments: Remarks ?? "",
            },
          ],
          Status: "Ready",
          ExistingShipments: null,
          Branch: "",
          RouteCode: "",
        },
        Transaction: {
          Reference1: "",
          Reference2: "",
          Reference3: "",
          Reference4: "",
          Reference5: "",
        },
      };
      var data = JSON.stringify(createPickupRequest);

      var config = {
        method: "post",
        url: aramexUrl,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: data,
      };

      axios(config)
        .then(function (response) {
          console.log(JSON.stringify(response.data));
          if (
            response != null &&
            response.data != null &&
            response.data.HasErrors == false &&
            response.data.ProcessedPickup != null
          ) {
            let resultRes = {
              PickupId: response.data.ProcessedPickup.ID ?? "",
              PickupGuid: response.data.ProcessedPickup.GUID ?? "",
              ShipmentId: "",
              ShipmentForeignHAWB: "",
              ShipmentLabelURL: "",
            };
            if (
              response.data.ProcessedPickup.ProcessedShipments != null &&
              response.data.ProcessedPickup.ProcessedShipments.length > 0 &&
              response.data.ProcessedPickup.ProcessedShipments[0].HasErrors ==
                false
            ) {
              resultRes.ShipmentId =
                response.data.ProcessedPickup.ProcessedShipments[0].ID;
              resultRes.ShipmentForeignHAWB =
                response.data.ProcessedPickup.ProcessedShipments[0].ForeignHAWB;
              resultRes.ShipmentLabelURL =
                response.data.ProcessedPickup.ProcessedShipments[0].ShipmentLabel.LabelURL;
            }
            console.log(JSON.stringify(resultRes));
            return resultRes;
          } else return null;
        })
        .catch(function (error) {
          console.log(error);
          return null;
        });
    } catch (err) {
      return null;
    }
  },

  cancelPickupNew: async (req) => {
    try {
      const aramexUrl = process.env.ARAMEX_Shipping_URL + "CancelPickup";
      const { Comments, PickupGUID } = req;
      const cancelPickupRequest = {
        ClientInfo: {
          UserName: process.env.ARAMEX_UserName,
          Password: process.env.ARAMEX_Password,
          Version: process.env.ARAMEX_Version,
          AccountNumber: process.env.ARAMEX_AccountNumber,
          AccountPin: process.env.ARAMEX_AccountPin,
          AccountEntity: process.env.ARAMEX_AccountEntity,
          AccountCountryCode: process.env.ARAMEX_AccountCountryCode,
          Source: 24,
        },
        Comments: Comments,
        PickupGUID: PickupGUID,
        Transaction: {
          Reference1: "",
          Reference2: "",
          Reference3: "",
          Reference4: "",
          Reference5: "",
        },
      };
      var data = JSON.stringify(cancelPickupRequest);

      var config = {
        method: "post",
        url: aramexUrl,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: data,
      };

      axios(config)
        .then(function (response) {
          console.log(JSON.stringify(response.data));
          if (
            (response != null) & (response.data != null) &&
            response.data.HasErrors == false
          ) {
            return true;
          } else return false;
        })
        .catch(function (error) {
          console.log(error);
          return null;
        });
    } catch (err) {
      return null;
    }
  },

  createShipments: async (req, res) => {
    try {
      const aramexUrl = process.env.ARAMEX_Shipping_URL + "CreateShipments";
      const { Shipments, LabelInfo, Transaction } = req.body;
      const createShipmentsRequest = {
        ClientInfo: {
          UserName: process.env.ARAMEX_UserName,
          Password: process.env.ARAMEX_Password,
          Version: process.env.ARAMEX_Version,
          AccountNumber: process.env.ARAMEX_AccountNumber,
          AccountPin: process.env.ARAMEX_AccountPin,
          AccountEntity: process.env.ARAMEX_AccountEntity,
          AccountCountryCode: process.env.ARAMEX_AccountCountryCode,
          Source: 24,
        },
        Shipments: Shipments,
        LabelInfo: LabelInfo,
        Transaction: Transaction,
      };
      var data = JSON.stringify(createShipmentsRequest);
      var config = {
        method: "post",
        url: aramexUrl,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: data,
      };

      axios(config)
        .then(function (response) {
          console.log(JSON.stringify(response.data));
          return res.json(
            responseData("DATA_RECEIVED", response.data, 200, req)
          );
        })
        .catch(function (error) {
          console.log(error);
          return res.status(422).json(responseData(err.message, {}, 422, req));
        });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },

  printLabel: async (req, res) => {
    try {
      const aramexUrl = process.env.ARAMEX_Shipping_URL + "PrintLabel";
      const {
        LabelInfo,
        OriginEntity,
        ProductGroup,
        ShipmentNumber,
        Transaction,
      } = req.body;
      const printLabelRequest = {
        ClientInfo: {
          UserName: process.env.ARAMEX_UserName,
          Password: process.env.ARAMEX_Password,
          Version: process.env.ARAMEX_Version,
          AccountNumber: process.env.ARAMEX_AccountNumber,
          AccountPin: process.env.ARAMEX_AccountPin,
          AccountEntity: process.env.ARAMEX_AccountEntity,
          AccountCountryCode: process.env.ARAMEX_AccountCountryCode,
          Source: 24,
        },
        OriginEntity: OriginEntity,
        ProductGroup: ProductGroup,
        ShipmentNumber: ShipmentNumber,
        LabelInfo: LabelInfo,
        Transaction: Transaction,
      };
      var data = JSON.stringify(printLabelRequest);
      var config = {
        method: "post",
        url: aramexUrl,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: data,
      };

      axios(config)
        .then(function (response) {
          console.log(JSON.stringify(response.data));
          return res.json(
            responseData("DATA_RECEIVED", response.data, 200, req)
          );
        })
        .catch(function (error) {
          console.log(error);
          return res.status(422).json(responseData(err.message, {}, 422, req));
        });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },

  createPickup: async (req, res) => {
    try {
      const aramexUrl = process.env.ARAMEX_Shipping_URL + "CreatePickup";
      const { Pickup, LabelInfo, Transaction } = req.body;
      const createPickupRequest = {
        ClientInfo: {
          UserName: process.env.ARAMEX_UserName,
          Password: process.env.ARAMEX_Password,
          Version: process.env.ARAMEX_Version,
          AccountNumber: process.env.ARAMEX_AccountNumber,
          AccountPin: process.env.ARAMEX_AccountPin,
          AccountEntity: process.env.ARAMEX_AccountEntity,
          AccountCountryCode: process.env.ARAMEX_AccountCountryCode,
          Source: 24,
        },
        Pickup: Pickup,
        LabelInfo: LabelInfo,
        Transaction: Transaction,
      };
      var data = JSON.stringify(createPickupRequest);

      var config = {
        method: "post",
        url: aramexUrl,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: data,
      };

      axios(config)
        .then(function (response) {
          console.log(JSON.stringify(response.data));
          return res.json(
            responseData("DATA_RECEIVED", response.data, 200, req)
          );
        })
        .catch(function (error) {
          console.log(error);
          return res.status(422).json(responseData(err.message, {}, 422, req));
        });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },

  cancelPickup: async (req, res) => {
    try {
      const aramexUrl = process.env.ARAMEX_Shipping_URL + "CancelPickup";
      const { Comments, PickupGUID, Transaction } = req.body;
      const cancelPickupRequest = {
        ClientInfo: {
          UserName: process.env.ARAMEX_UserName,
          Password: process.env.ARAMEX_Password,
          Version: process.env.ARAMEX_Version,
          AccountNumber: process.env.ARAMEX_AccountNumber,
          AccountPin: process.env.ARAMEX_AccountPin,
          AccountEntity: process.env.ARAMEX_AccountEntity,
          AccountCountryCode: process.env.ARAMEX_AccountCountryCode,
          Source: 24,
        },
        Comments: Comments,
        PickupGUID: PickupGUID,
        Transaction: Transaction,
      };
      var data = JSON.stringify(cancelPickupRequest);

      var config = {
        method: "post",
        url: aramexUrl,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: data,
      };

      axios(config)
        .then(function (response) {
          console.log(JSON.stringify(response.data));
          return res.json(
            responseData("DATA_RECEIVED", response.data, 200, req)
          );
        })
        .catch(function (error) {
          console.log(error);
          return res.status(422).json(responseData(err.message, {}, 422, req));
        });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },

  reserveShipmentNumberRange: async (req, res) => {
    try {
      const aramexUrl =
        process.env.ARAMEX_Shipping_URL + "ReserveShipmentNumberRange";
      const { Count, Entity, ProductGroup, Transaction } = req.body;
      const reserveShipmentNumberRangeRequest = {
        ClientInfo: {
          UserName: process.env.ARAMEX_UserName,
          Password: process.env.ARAMEX_Password,
          Version: process.env.ARAMEX_Version,
          AccountNumber: process.env.ARAMEX_AccountNumber,
          AccountPin: process.env.ARAMEX_AccountPin,
          AccountEntity: process.env.ARAMEX_AccountEntity,
          AccountCountryCode: process.env.ARAMEX_AccountCountryCode,
          Source: 24,
        },
        Count: Count,
        Entity: Entity,
        ProductGroup: ProductGroup,
        Transaction: Transaction,
      };
      var data = JSON.stringify(reserveShipmentNumberRangeRequest);

      var config = {
        method: "post",
        url: aramexUrl,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: data,
      };

      axios(config)
        .then(function (response) {
          console.log(JSON.stringify(response.data));
          return res.json(
            responseData("DATA_RECEIVED", response.data, 200, req)
          );
        })
        .catch(function (error) {
          console.log(error);
          return res.status(422).json(responseData(err.message, {}, 422, req));
        });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },

  holdShipments: async (req, res) => {
    try {
      const aramexUrl = process.env.ARAMEX_Shipping_URL + "HoldShipments";
      const { ShipmentHolds, Transaction } = req.body;
      const holdShipmentsRequest = {
        ClientInfo: {
          UserName: process.env.ARAMEX_UserName,
          Password: process.env.ARAMEX_Password,
          Version: process.env.ARAMEX_Version,
          AccountNumber: process.env.ARAMEX_AccountNumber,
          AccountPin: process.env.ARAMEX_AccountPin,
          AccountEntity: process.env.ARAMEX_AccountEntity,
          AccountCountryCode: process.env.ARAMEX_AccountCountryCode,
          Source: 24,
        },
        ShipmentHolds: ShipmentHolds,
        Transaction: Transaction,
      };
      var data = JSON.stringify(holdShipmentsRequest);

      var config = {
        method: "post",
        url: aramexUrl,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: data,
      };

      axios(config)
        .then(function (response) {
          console.log(JSON.stringify(response.data));
          return res.json(
            responseData("DATA_RECEIVED", response.data, 200, req)
          );
        })
        .catch(function (error) {
          console.log(error);
          return res.status(422).json(responseData(err.message, {}, 422, req));
        });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
};
