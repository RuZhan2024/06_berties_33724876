
const express = require("express");
const router = express.Router();

const result = { "coord": { "lon": -0.1257, "lat": 51.5085 }, "weather": [{ "id": 801, "main": "Clouds", "description": "few clouds", "icon": "02d" }], "base": "stations", "main": { "temp": 282.77, "feels_like": 280.88, "temp_min": 281.76, "temp_max": 283.78, "pressure": 1004, "humidity": 83, "sea_level": 1004, "grnd_level": 1000 }, "visibility": 10000, "wind": { "speed": 3.6, "deg": 180 }, "clouds": { "all": 24 }, "dt": 1764689635, "sys": { "type": 2, "id": 2075535, "country": "GB", "sunrise": 1764661531, "sunset": 1764690886 }, "timezone": 0, "id": 2643743, "name": "London", "cod": 200 }




module.exports = router;
