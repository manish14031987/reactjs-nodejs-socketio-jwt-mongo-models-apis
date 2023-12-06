var axios = require("axios");
const { responseData } = require("../../helpers/responseData");
module.exports = {
  calculateRateNew: async (req) => {
    try {
      const aramexUrl = process.env.ARAMEX_RateCalculator_URL + "CalculateRate";
      const { DestinationAddress, OriginAddress, Dimensions, ActualWeight } =
        req;
      const calculateRequest = {
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
        DestinationAddress: {
          Line1: DestinationAddress.Line1 ?? "",
          Line2: DestinationAddress.Line2 ?? "",
          Line3: DestinationAddress.Line3 ?? "",
          City: DestinationAddress.City ?? "",
          StateOrProvinceCode: "",
          PostCode: DestinationAddress.PostCode ?? "",
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
        OriginAddress: {
          Line1: OriginAddress.Line1 ?? "",
          Line2: OriginAddress.Line2 ?? "",
          Line3: OriginAddress.Line3 ?? "",
          City: OriginAddress.City ?? "",
          StateOrProvinceCode: "",
          PostCode: OriginAddress.PostCode ?? "",
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
        PreferredCurrencyCode: "SAR",
        ShipmentDetails: {
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
          DescriptionOfGoods: null,
          GoodsOriginCountry: null,
          NumberOfPieces: 1,
          ProductGroup: "EXP",
          ProductType: "PPX",
          PaymentType: "P",
          PaymentOptions: "",
          CustomsValueAmount: null,
          CashOnDeliveryAmount: null,
          InsuranceAmount: null,
          CashAdditionalAmount: null,
          CashAdditionalAmountDescription: null,
          CollectAmount: null,
          Services: "",
          Items: null,
          DeliveryInstructions: null,
        },
        Transaction: {
          Reference1: "",
          Reference2: "",
          Reference3: "",
          Reference4: "",
          Reference5: "",
        },
      };

      var data = JSON.stringify(calculateRequest);
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
            return response.data.TotalAmount.Value;
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

  calculateRate: async (req, res) => {
    try {
      const aramexUrl = process.env.ARAMEX_RateCalculator_URL + "CalculateRate";
      const {
        DestinationAddress,
        OriginAddress,
        PreferredCurrencyCode,
        ShipmentDetails,
        Transaction,
      } = req.body;
      const calculateRequest = {
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
        DestinationAddress: DestinationAddress,
        OriginAddress: OriginAddress,
        PreferredCurrencyCode: PreferredCurrencyCode,
        ShipmentDetails: ShipmentDetails,
        Transaction: Transaction,
      };
      var data = JSON.stringify(calculateRequest);
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
          return res
            .status(422)
            .json(responseData(error.message, {}, 422, req));
        });
    } catch (err) {
      return res.status(422).json(responseData(err.message, {}, 422, req));
    }
  },
};
