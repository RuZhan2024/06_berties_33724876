# 06_berties_books_33724876 – Bertie’s Books (Express + MySQL)

A small Node.js web app built with **Express**, **EJS**, and **MySQL**.

It includes:

- A simple book catalogue (list / add / search / bargain).
- User registration and login with **hashed passwords**.
- **Session-based login state** using `express-session`.
- **Access control** on book and admin pages (only logged-in users).
- Database configuration via **dotenv** (credentials not stored in source code).
- Login **audit logging** to record successful and failed logins.
- Server-side **validation** and **sanitisation** on key forms.
- A **weather forecast** page calling the OpenWeatherMap API (`/weather`).  
- A simple **JSON Books API** (`/api/books`) with search, price filters and sorting.
- An **ungraded JSON API extension** with pagination (`/api/books_limit`) and an EJS test page (`/api-test`) to exercise both API endpoints.

## Technologies Used

- **Node.js + Express** — server and routing
- **EJS** — view templates
- **MySQL (mysql2)** — database and connection pool
- **dotenv** — environment-based configuration for database credentials
- **bcrypt** — password hashing
- **express-session** — session management and authorisation
- **express-validator** — server-side form validation
- **express-sanitizer** — input sanitisation to reduce XSS risk
- **CSS** — shared stylesheet (`public/main.css`)
- **forever** — process manager for the VM

## Prerequisites

- Node.js 18+
- MySQL 8
- Goldsmiths VM access for deployment (for the deployed version)

## Install & Run Locally

```bash
# 1) Get the code
git clone https://github.com/RuZhan2024/06_berties_33724876.git
cd 06_berties_33724876

# 2) Install dependencies
npm install
````

## Database Setup

### Creating and seeding the database

Use the provided SQL scripts:

```bash
mysql -u root -p < create_db.sql
mysql -u root -p < insert_test_data.sql
```

These scripts:

* Create the `berties_books` database.
* Create an application user (`berties_books_app`) with appropriate privileges.
* Create tables for:

  * **Books** data (title, price, etc.).
  * **Users** (first name, last name, username, email, hashed password).
  * **Login audit** records (email/username, success/failure, timestamp).
* Insert sample book data.
* Insert a test user:

  * **username:** `gold`
  * **password:** `smiths`

  This user can be used as a default demo login account.

> **Note on security**
> For convenience, `create_db.sql` and `insert_test_data.sql` use fixed credentials and test data so the database can be initialised quickly. In a production setup, you would not commit hard-coded passwords; instead, the user/password would be set up directly on the server, and only environment variables would be used by the app.

## Configuration with dotenv

The app uses **dotenv** so that database credentials are kept in a local `.env` file instead of in the source code.

A `.env` file is placed in the project root and contains variables such as:

```ini
BB_HOST=localhost
BB_USER=berties_books_app
BB_PASSWORD=qwertyuiop
BB_DATABASE=berties_books
BB_PORT=3306
```

These names are used when the MySQL connection pool is created:

```js
const db = mysql.createPool({
  host: process.env.BB_HOST || "localhost",
  user: process.env.BB_USER,
  password: process.env.BB_PASSWORD,
  database: process.env.BB_DATABASE,
  port: process.env.BB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

global.db = db;
```

On the VM, a separate `.env` file is created with the VM’s database details, so the same codebase works both locally and remotely.

## Weather Forecast (Lab 9a – Calling APIs)

The app includes a simple **weather forecast** feature at:

* `GET /weather`

This page calls the **OpenWeatherMap** API to fetch the current weather for a chosen city and displays it in a styled EJS template.

### How it works

* The route builds an API URL like:

  ```text
  https://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric
  ```

* The JSON response is parsed on the server and mapped to a small result object:

  * City and country.
  * Temperature (°C) and “feels like” temperature.
  * Min/max temperature.
  * Humidity.
  * Weather description (e.g. “few clouds”).
  * Wind speed and direction.

* If the API call fails or the city is unknown, a friendly **error message** is rendered instead of crashing.

### Weather page

The view `views/weatherforecast.ejs` provides:

* A search form:

  ```html
  <form action="/weather" method="get" class="form">
    <label for="city">
      City
      <input
        id="city"
        name="city"
        type="text"
        placeholder="Please enter the city."
      />
    </label>
    <button type="submit" class="btn">Search</button>
  </form>
  ```

* A results card that shows the current weather using the shared `main.css` styles (cards, buttons, typography).

The home page (`index.ejs`) includes a link to `/weather`, so the feature is easy to find in the deployed app.

## Books API (Lab 9b – Providing APIs)

The app exposes a small **JSON API** for books. This is intended to be consumed by other programs, not by a browser template.

### Base URL

All JSON API routes are mounted under `/api`:

* `GET /api/books` — return books as JSON (graded route).
* `GET /api/books_limit` — return books as JSON with pagination metadata.

The JSON API is **public** (not behind login) so it can be accessed without authentication.

### JSON format

The main endpoint (`/api/books`) responds with a JSON **array** of books, e.g.:

```json
[
  { "id": 1, "name": "Brighton Rock", "price": 20.25 },
  { "id": 2, "name": "Brave New World", "price": 25.00 }
]
```

In case of database errors, the API returns a JSON error object.

The extended endpoint (`/api/books_limit`) returns a **paged** response:

```json
{
  "version": "2",
  "page": 1,
  "per_page": 10,
  "total": 23,
  "total_pages": 3,
  "items": [
    { "id": 1, "name": "Brighton Rock", "price": 20.25 },
    { "id": 2, "name": "Brave New World", "price": 25.00 }
  ]
}
```

This endpoint is an ungraded extension to demonstrate paginated APIs and is not required by the core lab spec.

### Query parameters – `/api/books`

The `/api/books` endpoint supports several optional query parameters:

#### 1. `search` – search by name (case-insensitive)

* Filters books where the `name` contains the search term, case-insensitively.
* Implemented using `LOWER(name) LIKE LOWER(?)` in SQL.

Examples:

* `GET /api/books?search=Brighton`
* `GET /api/books?search=world`

#### 2. `minprice` and `maxprice` – price range filters

* `minprice` — only return books with `price >= minprice`.
* `maxprice` — only return books with `price <= maxprice`.
* Both are optional; if omitted, that side of the range is not applied.

Examples:

* `GET /api/books?minprice=5`
* `GET /api/books?maxprice=15`
* `GET /api/books?minprice=5&maxprice=20`

Numeric values are parsed; invalid or empty values are ignored.

#### 3. `sort` – sort order

* `sort=name` — sort alphabetically by book name.
* `sort=price` — sort numerically by price ascending.
* Defaults to `name` if `sort` is missing or invalid.

Examples:

* `GET /api/books?sort=price`
* `GET /api/books?search=world&minprice=5&maxprice=20&sort=price`

The sort column is restricted to a small **whitelist** (`name`, `price`) to avoid SQL injection from user-provided column names.

### Ungraded extension: `/api/books_limit` (pagination)

The ungraded extension endpoint `/api/books_limit` supports the **same filters** as `/api/books`:

* `search`
* `minprice`
* `maxprice`

On top of that, it supports basic pagination:

* `page` — which page to return (1-based, default `1`).
* `per_page` — how many items per page (default `10`, capped at `50`).

The response includes:

* `version` — API version string (`"2"`).
* `page` / `per_page` — current page and page size.
* `total` — total number of matching books.
* `total_pages` — derived from `total / per_page`.
* `items` — the current page of book records.

Example:

```http
GET /api/books_limit?search=world&minprice=5&maxprice=30&sort=price&page=2&per_page=5
```

This returns the second page of results that match the given filters.

### API test page (EJS, ungraded)

To make testing easier, there is a small HTML page at:

* `GET /api-test`

This is **not** part of the JSON API; it is a normal EJS view that uses `fetch()` in the browser to call:

* `GET /api/books`
* `GET /api/books_limit`

The page:

* Lives in `views/test_apis.ejs`.
* Uses the shared `main.css` styles (cards, tables, buttons) so it looks consistent with the rest of the site.
* Contains two small forms:

  * A form to call `/api/books` and show the raw JSON and a table of results.
  * A form to call `/api/books_limit`, including `page` and `per_page` inputs, and a simple pagination info line (`Page X of Y • total items: Z`).

The route is defined in the main router:

```js
// Simple page to try both /api/books and /api/books_limit
router.get("/api-test", (req, res) => {
  res.render("test_apis", { title: "Books API tester" });
});
```

This page is mainly for debugging / demonstration of the API and is an **ungraded** extra.

## Session Management & Authorisation

Session management is enabled using `express-session` in `index.js`:

```js
const session = require('express-session');

app.use(session({
  secret: 'somerandomstuff',
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: 600000 // 10 minutes
  }
}));
```

A small middleware exposes login state to all EJS templates:

```js
app.use((req, res, next) => {
  res.locals.isAuthenticated = !!req.session.userId;
  res.locals.currentUser = req.session.user;
  next();
});
```

On a **successful login**, `users.js` saves the user information in the session:

```js
req.session.userId = user.id;
req.session.user = user.first_name + " " + user.last_name;
```

A `redirectLogin` middleware is used to protect routes that should only be available to logged-in users:

```js
const redirectLogin = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.redirect("../users/login");
  }
  next();
};
```

### Routes with restricted access

The following routes are protected by `redirectLogin` and require a logged-in session:

* **Book routes** (`routes/books.js`):

  * `GET /books/list` – list all books.
  * `GET /books/addbook` – show add-book form.
  * `POST /books/bookadded` – submit new book.
  * `GET /books/bargainbooks` – bargain books.
  * `GET /books/search` – search form.
  * `POST /books/search` – search results.
  * `GET /books/search-result` – legacy simple search demo.

* **User/admin routes** (`routes/users.js`):

  * `GET /users/userlist` – list registered users (no passwords shown).
  * `GET /users/audit` – view login audit entries.
  * `GET /users/logout` – logout route (destroys session).

These routes are restricted because they either:

* Expose **sensitive data** (user list, audit log).
* Perform **actions** that only authenticated users should do (adding/searching books, viewing internal data).

### Routes that remain public

The following routes are intentionally public:

* `GET /` – home page (index).
* `GET /about` – about page.
* `GET /users/register` – registration form.
* `POST /users/registered` – registration handler.
* `GET /users/login` – login form.
* `POST /users/login` – login handler.
* `GET /weather` – weather forecast page.
* `GET /api/books` – JSON books API (graded).
* `GET /api/books_limit` – paginated JSON books API (ungraded extension).
* `GET /api-test` – EJS test page for the books APIs.

These remain open so users (or other applications) can:

* Discover the site.
* Register and log in.
* Access the weather feature.
* Consume the books API without logging in.
* Manually test the API via the `/api-test` helper page.

### Logout

Logout is implemented as:

```js
router.get("/logout", redirectLogin, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/");
    }
    res.clearCookie("connect.sid");
    res.send('you are now logged out. <a href="/">Home</a>');
  });
});
```

This destroys the session on the server and clears the session cookie so protected pages cannot be accessed without logging in again.

## Validation

Validation is implemented using **`express-validator`** on key routes.

### Registration (`POST /users/registered`)

In `users.js` the registration form is validated so that:

* `first` (first name)

  * Must be non-empty.
  * Has a reasonable maximum length.
* `last` (last name)

  * Must be non-empty.
  * Has a reasonable maximum length.
* `email`

  * Validated with `.isEmail()`.
* `username`

  * Validated with `.isLength({ min: 5, max: 20 })`.
* `password`

  * Validated to ensure length ≥ 8 characters.
* `confirm_password`

  * Checked to ensure it **matches** `password`.

If any validation fails, the registration page is re-rendered with an error message, and the user is not created.

Validation is designed so that reasonably strong passwords (for example `aaaaAAAA1234!`) are accepted.

### Book creation (`POST /books/bookadded`)

In `books.js`:

* `name`

  * `.trim()` then `.isLength({ min: 1 })` → book title is required.
* `price`

  * `.isFloat({ min: 0 })` → must be a number ≥ 0.

On validation failure the form is re-rendered with the first error message.

### Book search (`POST /books/search`)

In `books.js`:

* `keyword`

  * `.trim().notEmpty()` → search term is required.
* `mode`

  * Must be either `"exact"` or `"partial"` (if provided).

If validation fails, the search page is re-rendered with no results and an error message.

### Where validation is not applied, and why

* **Login route**:

  * Uses a simple check to ensure both fields (email/username + password) are present.
  * The main validation is the **database lookup + bcrypt password comparison**, which determines whether the credentials are valid.
  * Additional field-level rules here do not add much security, so the login form keeps minimal validation.

* **Static pages** (`/`, `/about`):

  * No user input is processed, so validation is not relevant.

Validation focuses on forms that create or query data (registration, adding books, searching), as these are the most likely to receive invalid or malicious input.

## Sanitisation

Sanitisation is implemented using **`express-sanitizer`**. It is enabled globally in `index.js`:

```js
const expressSanitizer = require('express-sanitizer');
app.use(express.urlencoded({ extended: true }));
app.use(expressSanitizer());
```

This makes `req.sanitize(...)` available in all routes.

### Registration fields

In `users.js`, the following fields are sanitised before use:

* `first` (first name)
* `last` (last name)
* `email`
* `username`

Example:

```js
const first = req.sanitize(req.body.first);
const last = req.sanitize(req.body.last);
const email = req.sanitize(req.body.email);
const username = req.sanitize(req.body.username);
```

This removes any embedded HTML/JavaScript from names and email, preventing XSS if those values are later displayed in templates (for example, on a welcome message or user list).

### Login

* The username/email field is sanitised before querying the database, protecting against HTML injection in any error messages.
* The password is **not** sanitised: password strings are not rendered back to the user and are only used for hashing/verification. Sanitising them could change their value and cause authentication failures.

### Book creation

In `books.js`:

* `name` is sanitised before inserting into the database or echoing in responses:

  ```js
  const name = req.sanitize(req.body.name);
  ```

* `price` is treated as a number and not sanitised (it is validated as a float and not rendered as raw HTML).

### Book search and legacy search-result

* The search keyword is sanitised before:

  * Being included in SQL queries.
  * Being rendered back into the search results page.
* The legacy `GET /books/search-result` route also sanitises `req.query.keyword` before echoing it back in a plain text response.

### Where sanitisation is not applied, and why

* **Passwords** (registration + login):

  * Sanitising passwords would modify the user’s chosen secret and could lead to confusing behaviour.
  * Passwords are never rendered back to the browser, only passed to `bcrypt`, so they are not an XSS vector.

* **Numeric fields** like `price`:

  * These are validated as numbers and are not rendered as raw HTML attributes, so sanitising them is unnecessary.

Sanitisation is applied to string fields that can be displayed back to users (names, username, email, book title, search keyword). This balances security (preventing XSS) with usability (not interfering with passwords or numeric values).

## Password Hashing (Overview)

* Passwords entered at registration are **never stored in plain text**.
* Before being saved, each password is processed using the **bcrypt** library with a configurable number of salt rounds.
* During login, the submitted password is checked against the stored hashed password using `bcrypt.compare`.
* This ensures that even if the database contents are exposed, original passwords cannot be read directly.

## Audit Logging (Overview)

* Every login attempt is recorded in an audit table:

  * The email/username provided in the login form.
  * Whether the attempt was **successful** or **failed**.
  * The time the attempt was made.
* Failed attempts (wrong password or unknown user) are also logged.
* The `/users/audit` page provides a simple view of this history and can be used to review suspicious activity or debug login issues.

## Project Structure

```text
06_berties_33724876/
├─ public/
│  └─ main.css                 # shared styles for all pages
├─ routes/
│  ├─ main.js                  # home, about, and /api-test helper page
│  ├─ books.js                 # book-related routes (list/add/search/bargain)
│  ├─ users.js                 # registration, login, user list, audit
│  └─ api.js                   # JSON API for books (/api/books, /api/books_limit)
├─ views/
│  ├─ index.ejs                # home
│  ├─ about.ejs                # about page
│  ├─ list.ejs                 # book list/bargain books
│  ├─ addbook.ejs              # add book form
│  ├─ search.ejs               # book search
│  ├─ register.ejs             # registration form
│  ├─ login.ejs                # login form
│  ├─ userList.ejs             # list of users
│  ├─ audit.ejs                # login audit table
│  ├─ weatherforecast.ejs      # weather search + results page
│  └─ test_apis.ejs            # (ungraded) page to exercise /api/books and /api/books_limit
├─ create_db.sql               # database schema + app user creation
├─ insert_test_data.sql        # initial sample data (books + demo user)
├─ index.js                    # Express app bootstrap, sessions, MySQL pool
├─ package.json
├─ .env                        # local DB configuration (not committed)
└─ links.txt                   # home=http://www.doc.gold.ac.uk/usr/122/
```

## Start the App (locally)

```bash
npm start
# then visit
# http://localhost:8000
```

You can register a new user via `/users/register`, or log in as the demo user:

* username: `gold`
* password: `smiths`

## Deploying on the VM (and running “forever”)

On the VM:

```bash
git clone https://github.com/RuZhan2024/06_berties_33724876.git
cd 06_berties_33724876

npm install
```

Initialise MySQL and the database (first time only):

```bash
sudo apt-get update
sudo apt-get install mysql-server

sudo mysql
# inside MySQL shell:
source create_db.sql;
source insert_test_data.sql;
```

Create a `.env` file on the VM with the same `BB_*` variables described above.

Run the app:

```bash
# simple run
npm start

# OR run it "forever":
npx forever start -a -l forever.log -o out.log -e err.log index.js

# manage the process:
npx forever list
npx forever stop index.js
```

## links.txt

The file `links.txt` in the project root contains a single line pointing to the deployed app on the VM:

```text
home=http://www.doc.gold.ac.uk/usr/122/
```
