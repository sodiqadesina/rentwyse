/**
 * Over here we have our app
 */

const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const passport = require("passport");  
const { hashPassword } = require("./config/bcrypt-config");
const userRoutes = require("./routes/user");
const postsRoutes = require("./routes/posts");
const path = require("path");
const kycRoutes = require("./routes/kyc");
const messageRoutes = require("./routes/messages");
const conversationRoutes = require("./routes/conversations");
const cors = require("cors");

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env' });
}

require("./config/passport-config")(passport); 

/**
 * Connect to MongoDB.
//  */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("connected to the database...");
  })
  .catch(() => {
    console.log("connection failed.");
  });

//body-parser
app.use(bodyParser.json());

// Middleware to parse form data
app.use(bodyParser.urlencoded({ extended: false }));

//allowing api call to our image folder
app.use("/images", express.static(path.join("images")));

// Setting up headers for CORES
// CORS configuration
//const cors = require("cors");

// TEMPORARY: Allow ALL origins
app.use(cors({
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
  allowedHeaders: "*",
  credentials: false // cannot use "*" with credentials:true
}));

// Handle preflight
app.options("*", cors());


//passport and sessions (no longer needed has we would be using jwt)
//routes
app.use("/api/user", userRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/conversations", conversationRoutes);

app.get("/", (req, res) => {
  res.send("welcome to rent-wyse");
});

// Exporting this app file
module.exports = app;
