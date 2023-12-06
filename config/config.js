module.exports = {
  ACCOUNT_ID_CUSTOMER_PAYMENT: "54446",
  VENDOR_PAYMENT_PAID_THROUGH_ACCOUNT_ID: "32313",
  ITEM_ID_FOR_SELLER_COMMISSION_INVOICE: "312441332332323000000308880",
  TAX_ID_FOR_SELLER_COMMISSION_INVOICE: "31244130232323300000151058",
  EXPENSE_PAID_THROUGH_ACCOUNT_ID: "31244130000333300853852",
  EXPENSE_ACCOUNT_ID: "3124413000000323312392003",
  EXPENSE_ITEM_ID: "312441300000032231333232392003",
  SHIPPING_ITEM_ID: "312441300000123123210326127",
  SHIPPING_ACCOUNT_ID: "31244130023232312330000853934",
  PROCESSING_ITEM_ID: "3124413000000832331225259",
  PROCESSING_ACCOUNT_ID: "312441300002323200000409",
  CREDIT_NOTE_CUSTOMER_TAX_ID: "31244130023230000151058",
  CREDIT_NOTE_REFUND_FROM_ACCOUNT_ID: "312412321312413000000853852",
  USER: "avatar",
  USER_IMAGE_PATH: "userImage",
  DOCUMENT_IMAGE_PATH: "document",
  USER_WIDTH: 500,
  USER_HEIGHT: 500,
  USER_BACKGROUND_WIDTH: 500,
  USER_BACKGROUND_HEIGHT: 500,
  CATEGORY: "category",
  CATEGORY_WIDTH: 200,
  CATEGORY_HEIGHT: 200,
  CATEGORY_IMAGE_PATH: "categoryImage",
  USER_DEFAULT_IMAGE: "static/user.png",
  CARD_DEFAULT_IMAGE: "static/payment/",
  USER_DEFAULT_BACKGROUND_IMAGE: "static/banner.png",
  MAX_IMAGE_SIZE: 1,

  // banner
  BANNER: "banner",
  BANNER_IMAGE: "banner",
  BANNER_THUMB: "public/banner/thumb",
  BANNER_IMAGE_PATH: "bannerImage",
  BANNER_HEIGHT: 700,
  BANNER_WIDTH: 1000,
  BANNER_DEFAULT_IMAGE: "static/user.png",
  TRACKING_IMAGE_PATH: "trackingImage",
  TRACKING_PATH: "public/tracking/",

  // post
  POST: "post",
  POST_IMAGE: "post",
  POST_THUMB: "public/post/thumb",
  POST_IMAGE_PATH: "postImage",
  POST_IMAGE_PATH_ORIGINAL: "postImageOriginal",
  POST_HEIGHT: 375,
  POST_WIDTH: 375,
  POST_DEFAULT_IMAGE: "static/post.png",

  /**
   * Return request
   */
  RETURN_REQUEST: "returnRequest",
  RETURN_REQUEST_IMAGE: "returnRequest",
  RETURN_REQUEST_THUMB: "public/returnRequest/thumb",
  RETURN_REQUEST_IMAGE_PATH: "returnRequestImage",
  RETURN_REQUEST_HEIGHT: 500,
  RETURN_REQUEST_WIDTH: 500,
  RETURN_REQUEST_DEFAULT_IMAGE: "static/post.png",

  MAX_IMAGE_SIZE: 1,
  NOTIFICATION_DEFAULT_IMAGE: "static/notification.png",

  // csv
  CSV_UPLOAD: "csv-file",

  NodeMailerTransport: {
    host: "smtp.zoho.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "hisham@doffo.sa", // generated ethereal user
      pass: "Doffo@123", // generated ethereal password
    },
  },
  LANGUAGE: {
    en: "en_US",
    ar: "ar",
  },
  SHIPPING_FEE: 21,
  PROCESSING_FEE: 0.022,
  PROCESSING_FEE_PERCENTAGE: 0.022, // 2.2
  SEARCH_LIMIT: 9,
  SHIPPING_FEE_MIN: 18,
  SHIPPING_FEE_MAX: 21,
  SHIPPING_FEE_TEXT: "(18 to 21)",
  // PAYMENT_REQUEST_CONFIGURATION: {
  //   terminalId: "doffo",
  //   password: "doffo@123",
  //   clientIp: "192.168.1.119",
  //   hash: "",
  //   merchantKey:
  //     "20ed08027c51e0e087eafe7153210dfd54a138e17e91758fd38a41b89a2bb5eb",
  //   service_url:
  //     "https://payments-dev.urway-tech.com/URWAYPGService/transaction/jsonProcess/JSONrequest",
  // },
  PAYMENT_REQUEST_CONFIGURATION: {
    terminalId: "1231",
    password: "312312@urway",
    clientIp: "192.168.1.119",
    hash: "",
    merchantKey:
      "312321",
    service_url:
      "https://payments-dev.urway-tech.com/URWAYPGService/transaction/jsonProcess/JSONrequest",
  },
  COUNTRY: "SA",
  CURRENCY: "SAR",
  CAPTURE: 5,
  REFUND: 2,
  CREATE_SHIPMENT_REQUEST_OBJECT: {
    ShipmentRequest: {
      Description: "Test ORDER ",
      Request: {
        RequestOption: "validate",
      },
      Shipment: {
        Description: "Doffo Trading Co.",
        Shipper: {
          Name: "Doffo Trading Co.",
          AttentionName: "Doffo Trading Co.",
          Phone: {
            Number: "+966566727010",
          },
          ShipperNumber: "832FR4",
          Address: {
            AddressLine: "7947 Abu Bakr Al Siddiq",
            City: "Jeddah",
            StateProvinceCode: "Jeddah",
            PostalCode: "21577",
            CountryCode: "SA",
          },
        },
        ShipFrom: {
          Name: "Test Sender",
          Phone: {
            Number: "919785487576",
          },
          EMailAddress: "test@test.com",
          Address: {
            AddressLine: [
              "4th Phase",
              "2nd Cross Rd, Ganapathy Nagar",
              "Phase 3, Peenya",
            ],
            City: "Chennai",
            StateProvinceCode: "IN",
            PostalCode: "600096",
            CountryCode: "SA",
          },
        },
        ShipTo: {
          Name: "Test Consignee",
          Phone: {
            Number: "919785487576",
          },
          EMailAddress: "test@test.com",
          Address: {
            AddressLine: [
              "4th Phase",
              "2nd Cross Rd, Ganapathy Nagar",
              "Phase 3, Peenya",
            ],
            City: "Chennai",
            StateProvinceCode: "IN",
            PostalCode: "600096",
            CountryCode: "SA",
          },
        },
        PaymentInformation: {
          ShipmentCharge: {
            Type: "01",
            BillShipper: {
              AccountNumber: "832FR4",
            },
          },
        },
        Service: {
          Code: "65",
          Description: "UPS Saver",
        },
        Package: [
          {
            Description: "Product",
            Packaging: {
              Code: "02",
            },
            PackageWeight: {
              UnitOfMeasurement: {
                Code: "KGS",
              },
              Weight: "20",
            },
            Dimensions: {
              Length: "150",
              Width: "32",
              Height: "12",
              UnitOfMeasurement: {
                Code: "CM",
              },
            },
            ReferenceNumber: [
              {
                Value: "12123",
              },
            ],
          },
        ],
      },
      LabelSpecification: {
        LabelImageFormat: { Code: "PNG", Description: "PNG" },
        HTTPUserAgent: "Mozilla/4.5",
        LabelStockSize: { Height: "6", Width: "4" },
      },
    },
  },
  CREATE_PICKUP_REQUEST_OBJECT: {
    PickupCreationRequest: {
      RatePickupIndicator: "N",
      Shipper: {
        Account: {
          AccountNumber: "832FR4",
          AccountCountryCode: "SA",
        },
      },
      PickupDateInfo: {
        CloseTime: "1400",
        ReadyTime: "0500",
        PickupDate: "20190131",
      },
      PickupAddress: {
        CompanyName: "Pickup Proxy",
        ContactName: "Pickup Manager",
        AddressLine: "315 Saddle Bridge Drive",
        City: "Allendale",
        StateProvince: "NJ",
        PostalCode: "07401",
        CountryCode: "SA",
        ResidentialIndicator: "Y",
        Phone: {
          Number: "6785851399",
          Extension: "911",
        },
      },
      AlternateAddressIndicator: "Y",
      PickupPiece: [
        {
          ServiceCode: "065",
          Quantity: "1",
          DestinationCountryCode: "SA",
          ContainerCode: "02",
        },
      ],
      TotalWeight: {
        Weight: "5.5",
        UnitOfMeasurement: "KGS",
      },
      OverweightIndicator: "N",
      PaymentMethod: "01",
      SpecialInstruction: "Jias Test ",
      ReferenceNumber: "CreatePickupRefJia",
      Notification: {
        ConfirmationEmailAddress: "vholloway@ups.com",
        UndeliverableEmailAddress: "vholloway@ups.com",
      },
    },
  },
  SMS: {
    url: "http://rest.gateway.sa/api/SendSMS?",
    ApiKey: "V8mrN0NGwR3231276hJIKPvfgxdm5zcRFjA+fCicpbYPq7t4=",
    ClientId: "01dbfc123213bd-2f2c-4363-b130-926efa649200",
    SenderId: "3123123",
    api_id: "312312",
    api_password: "sBf1233ns604s7",
  },
};
