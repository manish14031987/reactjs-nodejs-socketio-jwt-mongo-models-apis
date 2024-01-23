require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });
var express = require("express");
var path = require("path");
var logger = require("morgan");
var fileUpload = require("express-fileupload");
var cors = require("cors");
require("./config/database");
var router = express.Router(); 
const i18next = require("i18next");
const Backend = require("i18next-fs-backend");
const middleware = require("i18next-http-middleware");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var authRouter = require("./routes/auth");
var cmsRouter = require("./routes/cms");
var emailRouter = require("./routes/email");
var faqRouter = require("./routes/faq");
var customerRouter = require("./routes/customer");
var adminRouter = require("./routes/admin");
var settingRouter = require("./routes/settings");
var notificationRouter = require("./routes/notification");
var CategoryRouter = require("./routes/category");
var BrandRouter = require("./routes/brand");
var permissionRouter = require("./routes/permission");
var LanguageRouter = require("./routes/language");
var DepartmentRouter = require("./routes/department");
var BannerRouter = require("./routes/banner");
var SubscriptionRouter = require("./routes/subscription");
var BannerRouter = require("./routes/banner");
var modelRouter = require("./routes/model");
var couponRouter = require("./routes/coupon");
var CommissionRouter = require("./routes/commission");
var NewsletterRouter = require("./routes/newsletter");
var AddressRouter = require("./routes/address");
var ReasonRouter = require("./routes/reason");
var PostRouter = require("./routes/post");
var FavoriteRouter = require("./routes/favorite");
var RecommendRouter = require("./routes/recommend");
var HomeRouter = require("./routes/home");
var OrderRouter = require("./routes/order");
var TransactionRouter = require("./routes/transaction");
var OfferRouter = require("./routes/offer");
var CardRouter = require("./routes/card");
var FeedBackRouter = require("./routes/feedback");
var CronRouter = require("./routes/cron");
var ReturnRequestRouter = require("./routes/returnRequest");
var BankRouter = require("./routes/bank");
var ReportRouter = require("./routes/report");
var DoffoRequestRouter = require("./routes/doffoRequest");
var boostRequestRouter = require("./routes/boostRequest");
var paymentProductRouter = require("./routes/paymentProduct");
var cashOutRequestRouter = require("./routes/cashOutRequest");
var dropUpLocationRouter = require("./routes/dropUpLocation");

var app = express();

var corsOption = {
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  exposedHeaders: ["x-access-token"],
};

app.use(cors(corsOption));
app.use(middleware.handle(i18next));
app.use(fileUpload());
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, "public")));

app.use("/v1/", indexRouter);
app.use("/v1/users", usersRouter);
app.use("/v1/auth", authRouter);
app.use("/v1/cms", cmsRouter);
app.use("/v1/email", emailRouter);
app.use("/v1/faq", faqRouter);
app.use("/v1/setting", settingRouter);
app.use("/v1/notification", notificationRouter);
app.use("/v1/customer", customerRouter);
app.use("/v1/subAdmin", adminRouter);
app.use("/v1/category", CategoryRouter);
app.use("/v1/brand", BrandRouter);
app.use("/v1/permission", permissionRouter);
app.use("/v1/language", LanguageRouter);
app.use("/v1/department", DepartmentRouter);
app.use("/v1/banner", BannerRouter);
app.use("/v1/subscription", SubscriptionRouter);
app.use("/v1/banner", BannerRouter);
app.use("/v1/model", modelRouter);
app.use("/v1/coupon", couponRouter);
app.use("/v1/commission", CommissionRouter);
app.use("/v1/newsletter", NewsletterRouter);
app.use("/v1/address", AddressRouter);
app.use("/v1/reason", ReasonRouter);
app.use("/v1/post", PostRouter);
app.use("/v1/favorite", FavoriteRouter);
app.use("/v1/recommend", RecommendRouter);
app.use("/v1/home", HomeRouter);
app.use("/v1/order", OrderRouter);
app.use("/v1/transaction", TransactionRouter);
app.use("/v1/offer", OfferRouter);
app.use("/v1/card", CardRouter);
app.use("/v1/feedback", FeedBackRouter);
app.use("/v1/cron", CronRouter);
app.use("/v1/returnRequest", ReturnRequestRouter);
app.use("/v1/bank", BankRouter);
app.use("/v1/report", ReportRouter);
app.use("/v1/doffoRequest", DoffoRequestRouter);
app.use("/v1/boostRequest", boostRequestRouter);
app.use("/v1/product-payment", paymentProductRouter);
app.use("/v1/cashOut-request", cashOutRequestRouter);
app.use("/v1/dropUpLocation", dropUpLocationRouter);

app.use("/static", express.static(path.join(__dirname, "public/images/")));
app.use(
  "/userImage",
  express.static(path.join(__dirname, "public/avatar/thumb/"))
);
app.use("/document", express.static(path.join(__dirname, "public/avatar/")));
app.use(
  "/bannerImage",
  express.static(path.join(__dirname, "public/banner/thumb/"))
);
app.use(
  "/postImage",
  express.static(path.join(__dirname, "public/post/thumb/"))
);
app.use(
  "/postImageOriginal",
  express.static(path.join(__dirname, "public/post/"))
);
app.use(
  "/trackingImage",
  express.static(path.join(__dirname, "public/tracking/"))
);
app.use(
  "/returnRequestImage",
  express.static(path.join(__dirname, "public/returnRequest/"))
);

i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: "en",
    preload: ["en", "ar"],
    debug: false,
    backend: {
      loadPath: path.join(__dirname, "locales/{{lng}}/translations.json"),
    },
  });

app.use(function (req, res) {
  res.status(404).json({
    status: 404,
    message: "Sorry can't find that!",
    data: {},
  });
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.json({
    status: err.status,
    message: err.message,
    data: {},
  });
  next();
});

module.exports = app;
