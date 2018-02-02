// Dependencies
var express = require("express");
var mongojs = require("mongojs");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var exphbs = require('express-handlebars');

// / Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");
var app = express();

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();

app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// By default mongoose uses callbacks for async queries, we're setting it to use promises (.then syntax) instead
// Connect to the Mongo DB using Heroku mLab addon and/or the local host
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoNBANewsScraperDB";

mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI, {
  //   useMongoClient: true
});

// Routes

// index
app.get("/", function (req, res) {
  res.redirect("/articles");
});


// A GET route for scraping the NBA website
app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with request
  var url = "http://www.nytimes.com/";

  request(url, function (error, response, html) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(html);
    var titlesArray = [];
    // Now, we grab every h2 within an article tag, and do the following:
    $("article h2").each(function (i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this).children("a").text();
      result.link = $(this).children("a").attr("href");
      titlesArray.push(result.title);

      var entry = new Article(result);

      entry.save(function (err, data) {
        if (err) throw err;
        console.log(data);
      });

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function (data) {
          // View the added result in the console
          console.log(data);
        })
        .catch(function (err) {
          // If an error occurred, send it to the client
          return res.json(err);
        });
    });

    // If we were able to successfully scrape and save an Article, send a message to the client
    res.send("Scrape Complete");
    res.redirect("/");
  });
});



app.get("/articles", function (req, res) {
  db.Article.find({})
    .then(function (data) {
      res.json(data);
      // res.render("index", { article: data });
    })
    .catch(function (err) {
      res.json(err);
    });
});

app.get("/articles/:id", function (req, res) {
  db.Article.findOne({ _id: req.params.id })
    .populate("note")
    .then(function (data) {
      res.json(data);
    })
    .catch(function (err) {
      res.json(err);
    });
});

app.post("/articles/:id", function (req, res) {
  db.Note.create(req.body)
    .then(function (data) {
      return db.Article.findOneAndUpdate({ _id: req.params.id },
        { $push: { note: data._id } }, { new: true });
    })
    .then(function (data) {
      res.json(data);
      res.redirect(req.params.id);
    })
    .catch(function (err) {
      res.json(err);
    });
});


app.get("/delete/:id", function (req, res) {
  db.Note.remove({ _id: req.params.id })
    .then(function (data) {
      res.redirect("/");
    })
    .catch(function (err) {
      res.json(err);
    });
});



app.get("/clearAll", function (req, res) {
  db.Article.remove(req.body)
    .then(function (data) {
      res.redirect("/");
    })
    .catch(function (err) {
      res.json(err);
    });
});









// Start the server
app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
