var path = require("path");
const i18next = require("i18next");
const Backend = require("i18next-fs-backend");
const middleware = require("i18next-http-middleware");

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

module.exports = i18next;
