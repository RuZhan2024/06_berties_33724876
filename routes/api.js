
const express = require("express");
const router = express.Router();

router.get("/books", function (req, res, next) {
  // Normalise query keys to lowercase so SEARCH / search both work 
  const q = {};
  for (const [key, value] of Object.entries(req.query)) {
    q[key.toLowerCase()] = value;
  }

  // Read query parameters from the normalised object 
  const search = (q.search || "").trim();
  const minPriceRaw = q.minprice;                 // ?minprice=10
  const maxPriceRaw = q.maxprice || q["max_price"]; // ?maxprice=20 or ?max_price=20
  const sortRaw = (q.sort || "name").toLowerCase(); // ?sort=name|price

  // Build SQL + params 
  let sql = "SELECT id, name, price FROM books";
  const conditions = [];
  const params = [];

  // Search by name (case-insensitive)
  if (search) {
    conditions.push("LOWER(name) LIKE LOWER(?)");
    params.push(`%${search}%`);
  }

  // Min price
  if (minPriceRaw !== undefined && minPriceRaw !== "") {
    const minPrice = Number(minPriceRaw);
    if (!Number.isNaN(minPrice)) {
      conditions.push("price >= ?");
      params.push(minPrice);
    }
  }

  // Max price
  if (maxPriceRaw !== undefined && maxPriceRaw !== "") {
    const maxPrice = Number(maxPriceRaw);
    if (!Number.isNaN(maxPrice)) {
      conditions.push("price <= ?");
      params.push(maxPrice);
    }
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  // Safe sort column (whitelist)
  const allowedSortColumns = {
    name: "name",
    price: "price",
  };
  const sortColumn = allowedSortColumns[sortRaw] || "name";
  sql += ` ORDER BY ${sortColumn} ASC`;

  //Execute query
  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("DB error in /api/books:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

module.exports = router;
