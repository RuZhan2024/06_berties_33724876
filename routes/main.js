// Create a new router
const express = require("express")
const router = express.Router()
const request = require("request");

// Handle our routes
router.get('/',function(req, res, next){
    res.render('index.ejs', {isAuthenticated: res.locals.isAuthenticated})
});

// -----------------------------------------------------------------------------
// Logout route – destroy the session and log the user out
// -----------------------------------------------------------------------------

router.get("/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.redirect("/");
      }
      // Simple confirmation + link back to home
      res.send('you are now logged out. <a href="/">Home</a>');
    });
  });

router.get('/about',function(req, res, next){
    res.render('about.ejs')
});

router.get("/weather", (req, res) => {

  const city = req.query.city || "London,uk";
  const key = "b44940e5eda0e721e710cd08b3725ba0";
  const api = `https://api.openweathermap.org/data/2.5/weather?q=${city}&APPID=${key}`;
  request(api, (err, response, body) => {

      if (err) {
          nexrt(err)
      } else {
          const weather = JSON.parse(body);
          let wmsg = ""
          if (weather !== undefined && weather.main !== undefined) {
              wmsg = '<p>It is ' + weather.main.temp +
                  ' degrees in ' + weather.name +
                  '! </p> <p>The humidity now is: ' +
                  weather.main.humidity + '</p>';
          } else {
              wmsg = `<p>Haven't searched the weather forecast of ${city}</p>`;
          }
          res.render("weatherforecast.ejs", { result: wmsg });
      }
  })

});

// Export the router object so index.js can access it
module.exports = router