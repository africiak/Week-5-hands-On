const express = require("express");
const app = express();
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");

//initiaization
app.use(express.json());
app.use(cors()); //which applications an make requests to our server
dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL successfully: ", db.threadId);
  //create a database
  db.query(`CREATE DATABASE IF NOT EXISTS expensetracker`, (err, result) => {
    if (err) return console.log(err);

    console.log("Database expensetracker created/checked");

    //select your database
    db.changeUser({ database: "expensetracker" }, (err) => {
      if (err) return console.log(err);

      console.log("changed to expensetracker");

      //create users table
      const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(100) NOT NULL UNIQUE,
                username VARCHAR(50) NOT NULL,
                password VARCHAR(255) NOT NULL
                )
            `;

      db.query(createUsersTable, (err, result) => {
        if (err) return console.log(err);

        console.log("Users table checked/created");
      });
    });
  });
});

//user registration route
app.post("/api/register", async (req, res) => {
  try {
    const usersQuery = `SELECT * FROM users WHERE email = ?`;

    db.query(usersQuery, [req.body.email], (err, data) => {
      if (err) {
        console.error("Database error during user check:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      if (data.length > 0) {
        return res.status(409).json({ message: "User already exists" });
      }

      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(req.body.password, salt);

      const createUserQuery = `INSERT INTO users(email, username, password) VALUES (?, ?, ?)`;
      const values = [req.body.email, req.body.username, hashedPassword];

      db.query(createUserQuery, values, (err, data) => {
        if (err) {
          console.error("Database error during user creation:", err);
          return res.status(500).json({ message: "Something went wrong" });
        }

        return res
          .status(201)
          .json({ message: "User has been created successfully" });
      });
    });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const users = `SELECT * FROM users WHERE email = ?`;

    db.query(users, [req.body.email], (err, data) => {
      if (data.length === 0)
        return res.status(404).json({ message: "user not Found" });

      //check if password is valid
      const isPasswordValid = bcrypt.compareSync(
        req.body.password,
        data[0].password
      );

      if (!isPasswordValid)
        return res.status(400).json({ message: "Invalid email or password" });

      return res.status(200).json({ message: "login successful" });
    });
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(3000, () => {
  console.log("server running on port 3000");
});
