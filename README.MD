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

These remain open so users can:

* Discover the site.
* Register a new account.
* Log in for the first time.

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
│  ├─ main.js                  # home and about routes
│  ├─ books.js                 # book-related routes (list/add/search/bargain)
│  └─ users.js                 # registration, login, user list, audit
├─ views/
│  ├─ index.ejs                # home
│  ├─ about.ejs                # about page
│  ├─ list.ejs                 # book list/bargain books
│  ├─ addbook.ejs              # add book form
│  ├─ search.ejs               # book search
│  ├─ register.ejs             # registration form
│  ├─ login.ejs                # login form
│  ├─ userList.ejs             # list of users
│  └─ audit.ejs                # login audit table
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
