// *******************************************************************
// Node/Express Server
// 
// PARZIVAL was here
// 
// *******************************************************************

// Dependencies
// =============================================================
var express = require("express");
var bodyParser = require("body-parser");
var handleBars = require("express-handlebars");


// ****** DELETE IF NOT NEEDED VVV *******
var path = require("path");


// Require Directories
// =============================================================
var apiRoutes = require('./routes/apiRoutes');
var db = require("./models");


// Express server
// =============================================================
var app = express();
var PORT = process.env.PORT || 3000;
app.use(express.static("public"));


// bodyParser
// =============================================================
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


// Handlebars
// =============================================================
app.engine("handlebars", handleBars({ defaultLayout: "main" }));
app.set("view engine", "handlebars");


// **********RENAME THESE AS NECESSARY VVV ********************

// Call Routes
// =============================================================
require("./routes/api-routes")(app);
// require("./routes/htmlRoutes")(app);


// Listen
app.listen(PORT, function() {
    console.log("App listening on PORT " + PORT);
});
