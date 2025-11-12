// Create a new router
const express = require("express")
const router = express.Router() // Initialize the Express Router

// GET /search — Render the basic search form page
router.get('/search', function(req, res, next) {
    // Renders the search view (e.g., search.ejs)
    res.render("search.ejs")
});

// GET /search-result — Handle a simple GET-based search result display (likely a legacy or test route)
router.get('/search-result', function (req, res, next) {
    // Uses req.query to retrieve parameters from the URL query string (e.g., ?keyword=term)
    // searching in the database (this line is a placeholder comment in original code)
    res.send("You searched for: " + req.query.keyword)
});

// GET /list — Retrieve and display all books from the database
router.get('/list', function(req, res, next) {
    let sqlquery = "SELECT * FROM books"; // SQL query to get all books
    
    // execute sql query
    db.query(sqlquery, (err, result) => {
        if (err) {
            // Pass the error to the Express error handler middleware
            next(err) 
        }
        // Renders the list view (list.ejs), passing the query result as 'availableBooks'
        res.render('list.ejs', {availableBooks:result})
     });
});

// GET /addbook — Render the form to add a new book
router.get("/addbook", function(req,res,next) {
    res.render("addbook.ejs");
});

// POST /bookadded — Insert a new book into the database (Lab 6D Task 3)
router.post('/bookadded', (req, res, next) => {
  // Extract 'name' and 'price' from the request body (submitted form data)
  const { name, price } = req.body;
    
  // Simple validation check for required fields
  if (!name || !price) {
    // Re-render the form with an error message if data is missing
    return res.render('addbook', { error: 'Name and price are required.' });
  }
  
  // SQL query to insert a new row. Uses '?' as placeholders for safety (prepared statements)
  const sql = 'INSERT INTO books (name, price) VALUES (?, ?)';
  
  // Execute the insert query
  db.query(sql, [name.trim(), parseFloat(price)], (err) => {
    if (err) return next(err); // Handle database errors
    
    // Send a confirmation message upon successful insertion
    res.send(`This book is added to database, name: ${name} price ${price}`);
  });
});

// GET /bargainbooks — Retrieve and display books with price less than $20.00
router.get('/bargainbooks', (req, res, next) => {
  // SQL query to select books where the price is less than 20.00, ordered by price
  const sql = 'SELECT id, name, price FROM books WHERE price < 20.00 ORDER BY price ASC';
  
  // Execute the query
  db.query(sql, (err, rows) => {
    if (err) return next(err); // Handle database errors
    
    // Render the 'bargainbooks' view, passing the result set
    res.render('bargainbooks', { books: rows });
  });
});

// GET /search — Render the search form (with initial state)
router.get('/search', (req, res) => {
  // Renders the search form, initializing results to null and mode to 'partial'
  res.render('search.ejs', { results: null, keyword: '', mode: 'partial' });
});

// POST /search — Handle the submission of the search form and display results
router.post('/search', (req, res, next) => {
  // Extract keyword and search mode from the request body
  const { keyword, mode } = req.body;
  
  // If no keyword is provided, re-render the search page with empty results
  if (!keyword) {
     return res.render('search.ejs', { results: [], keyword: '', mode: 'partial' });
  }

  const trimmed = keyword.trim();
  let sql, params;

  // Determine the SQL query based on the selected search mode
  if (mode === 'exact') {
    // Basic search: exact title match
    sql = 'SELECT id, name, price FROM books WHERE name = ? ORDER BY name ASC';
    params = [trimmed]; // Parameter is the trimmed keyword
  } else {
    // Advanced search: partial match (case-insensitive search using LOWER() and LIKE)
    sql = 'SELECT id, name, price FROM books WHERE LOWER(name) LIKE LOWER(?) ORDER BY name ASC';
    params = [`%${trimmed}%`]; // Parameter is the trimmed keyword wrapped in wildcards (%)
  }

  // Execute the dynamic search query
  db.query(sql, params, (err, rows) => {
    if (err) return next(err); // Handle database errors
    
    // Render the search view again, passing the results and the search criteria for context
    res.render('search', { results: rows, keyword: trimmed, mode: mode || 'partial' });
  });
});

// Export the router object so index.js (or the main application file) can access it
module.exports = router