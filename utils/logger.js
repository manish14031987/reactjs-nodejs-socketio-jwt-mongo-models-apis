// Firstly we'll need to import the fs library
var fs = require("fs");

// next we'll want make our Logger object available
// to whatever file references it.
var Logger = (exports.Logger = {});

// Create 3 sets of write streams for the 3 levels of logging we wish to do
// every time we get an error we'll append to our error streams, any debug message
// to our debug stream etc...
var infoStream = fs.createWriteStream("logs/info.txt");

var zohoBookStream = fs.createWriteStream("logs/zohoBook.txt");
var zohoBookInvoiceStream = fs.createWriteStream("logs/zohoBookInvoice.txt");

var socketStream = fs.createWriteStream("logs/socket-request.txt");
var socketErrorStream = fs.createWriteStream("logs/socket-error.txt");
// Notice we set the path of our log files in the first parameter of
// fs.createWriteStream. This could easily be pulled in from a config
// file if needed.
var errorStream = fs.createWriteStream("logs/error.txt");
// createWriteStream takes in options as a second, optional parameter
// if you wanted to set the file encoding of your output file you could
// do so by setting it like so: ('logs/debug.txt' , { encoding : 'utf-8' });
var debugStream = fs.createWriteStream("logs/debug.txt");

// Finally we create 3 different functions
// each of which appends our given messages to
// their own log files along with the current date as an
// iso string and a \n newline character
Logger.info = function (msg) {
  var message = new Date().toISOString() + " : " + msg + "\n";
  infoStream.write(message);
};

Logger.zohoBook = function (msg) {
  var message = new Date().toISOString() + " : " + msg + "\n";
  zohoBookStream.write(message);
};
Logger.zohoBookInvoice = function (msg) {
  // console.log(123);
  const d = new Date();
  const filePath =
    "logs/zohoBook/" +
    d.getDay() +
    "-" +
    d.getMonth() +
    "-" +
    d.getFullYear() +
    ".txt";
  var message = new Date().toISOString() + " : " + msg + "\n";
  //console.log(message);
  fs.appendFile(filePath, message, (err) => {
    if (err) {
      console.error(err);
    }
    // file written successfully
  });
};
Logger.socketRequest = function (msg) {
  var message = new Date().toISOString() + " : " + msg + "\n";
  socketStream.write(message);
};

Logger.socketError = function (msg) {
  var message = new Date().toISOString() + " : " + msg + "\n";
  socketErrorStream.write(message);
};

Logger.debug = function (msg) {
  var message = new Date().toISOString() + " : " + msg + "\n";
  debugStream.write(message);
};

Logger.error = function (msg) {
  var message = new Date().toISOString() + " : " + msg + "\n";
  errorStream.write(message);
};
