const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

// we would need the unique validator package if we are to run the unique verification

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  province: {
    type: String,
    required: true,
  },
  zipcode: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  emailToken: { type: String },
  isEmailVerified: { type: Boolean, default: false },
});

userSchema.plugin(uniqueValidator); // so this is how we run the check on the username and email to make sure its unique

module.exports = mongoose.model("User", userSchema);
