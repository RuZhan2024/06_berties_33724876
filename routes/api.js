
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

// Extra endpoint: same filters as /books but with pagination and some metadata
router.get("/books_limit", function (req, res, next) {
  try {
    // Turn all query keys into lowercase so SEARCH / Search / search are treated the same
    const q = {};
    for (const [key, value] of Object.entries(req.query)) {
      q[key.toLowerCase()] = value;
    }

    const search = (q.search || "").trim();
    const minPriceRaw = q.minprice;
    const maxPriceRaw = q.maxprice || q["max_price"];
    const sortRaw = (q.sort || "name").toLowerCase();

    // Helpers for parsing numbers with basic validation
    const parsePrice = (raw, paramName) => {
      if (raw === undefined || raw === "") return null;
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        const err = new Error(`Invalid value for "${paramName}"`);
        err.status = 400;
        throw err;
      }
      return value;
    };

    const parsePositiveInt = (raw, paramName, defaultValue) => {
      if (raw === undefined || raw === "") return defaultValue;
      const value = Number(raw);
      if (!Number.isInteger(value) || value <= 0) {
        const err = new Error(`Invalid value for "${paramName}"`);
        err.status = 400;
        throw err;
      }
      return value;
    };

    // Price filters
    const minPrice = parsePrice(minPriceRaw, "minprice");
    const maxPrice = parsePrice(maxPriceRaw, "maxprice");

    // Basic sanity check on the range
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      const err = new Error('"minprice" cannot be greater than "maxprice"');
      err.status = 400;
      throw err;
    }

    // Pagination: page and page size (capped at 50)
    const page = parsePositiveInt(q.page, "page", 1);
    let perPage = parsePositiveInt(q.per_page || q.perpage, "per_page", 10);
    if (perPage > 50) perPage = 50;
    const offset = (page - 1) * perPage;

    // Build WHERE conditions and parameters (shared by count + data queries)
    const conditions = [];
    const filterParams = [];

    if (search) {
      conditions.push("LOWER(name) LIKE LOWER(?)");
      filterParams.push(`%${search}%`);
    }
    if (minPrice !== null) {
      conditions.push("price >= ?");
      filterParams.push(minPrice);
    }
    if (maxPrice !== null) {
      conditions.push("price <= ?");
      filterParams.push(maxPrice);
    }

    let baseSql = "FROM books";
    if (conditions.length > 0) {
      baseSql += " WHERE " + conditions.join(" AND ");
    }

    // Only allow sorting by known columns
    const allowedSortColumns = { name: "name", price: "price" };
    const sortColumn = allowedSortColumns[sortRaw] || "name";

    // Query for the current page of results
    const dataSql = `
      SELECT id, name, price
      ${baseSql}
      ORDER BY ${sortColumn} ASC
      LIMIT ? OFFSET ?
    `;
    const dataParams = [...filterParams, perPage, offset];

    // Separate query just to count how many rows match the filters
    const countSql = `
      SELECT COUNT(*) AS total
      ${baseSql}
    `;
    const countParams = filterParams;

    // First get the total
    db.query(countSql, countParams, (err, countRows) => {
      if (err) {
        console.error("DB error (count) in GET /books_limit:", err);
        const dbErr = new Error("Database error");
        dbErr.status = 500;
        return next(dbErr);
      }

      const total = countRows[0]?.total ?? 0;

      // Then fetch the actual page of data
      db.query(dataSql, dataParams, (err2, rows) => {
        if (err2) {
          console.error("DB error (data) in GET /books_limit:", err2);
          const dbErr2 = new Error("Database error");
          dbErr2.status = 500;
          return next(dbErr2);
        }

        // Return some basic paging info plus the rows
        return res.json({
          version: "2",
          page,
          per_page: perPage,
          total,
          total_pages: Math.ceil(total / perPage),
          items: rows,
        });
      });
    });
  } catch (err) {
    console.error("Error in GET /books_limit handler:", err);
    return next(err);
  }
});

module.exports = router;
