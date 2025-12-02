const User = require("../models/user");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("../Services/emailService");

dotenv.config({ path: ".env" });

/**
 * POST /api/user/signup
 * Create a new user and send an email verification link.
 * FIXED: no double response, email is fire-and-forget.
 */
exports.createUser = async (req, res, next) => {
  const {
    username,
    password,
    email,
    firstName,
    lastName,
    address,
    city,
    province,
    zipcode,
    country,
    phone,
  } = req.body;

  console.log("req", req.body);

  try {
    // Hash password directly with bcrypt (same effect as hashPassword helper)
    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      firstName,
      lastName,
      city,
      address,
      province,
      zipcode,
      country,
      phone,
      emailToken: verificationToken,
      isEmailVerified: false,
    });

    const result = await newUser.save();

    //  Send response ONCE
    res.status(201).json({
      message: "user created Successfully!",
      result: result,
    });

    //   email sending; 
     try {
      await emailService.sendVerificationEmail(newUser.email, verificationToken);
    } catch (emailErr) {
      console.error("Failed to send verification email:", emailErr);
    }
  } catch (err) {
    console.error(err);

    // 🔍 Handle duplicate key / unique constraint errors nicely
    // Case 1: Mongo duplicate key error
    if (err.code === 11000 && err.keyValue) {
      const field = Object.keys(err.keyValue)[0]; // e.g. 'email' or 'username'
      return res.status(400).json({
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        field,
      });
    }

    // Case 2: mongoose-unique-validator style validation error
    if (err.errors) {
      if (err.errors.email && err.errors.email.kind === "unique") {
        return res.status(400).json({
          message: "Email already exists",
          field: "email",
        });
      }
      if (err.errors.username && err.errors.username.kind === "unique") {
        return res.status(400).json({
          message: "Username already exists",
          field: "username",
        });
      }
    }

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Invalid Authentication Credentials !!!!",
      });
    }
  }
};

/**
 * GET /api/user/verify-email?token=...
 * Verify email address using token from email.
 */
exports.verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({ emailToken: req.query.token });
    if (!user) {
      // Token not found or invalid token
      return res.status(400).send("This link is invalid or has expired.");
    }

    if (user.isEmailVerified) {
      // User has already verified their email
      return res
        .status(400)
        .send("This email has already been verified. You can now login.");
    }

    // Set the email as verified
    user.emailToken = null;
    user.isEmailVerified = true;
    await user.save();

    res.status(200).send("email verification succesfull");
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send(
        "An error occurred during the verification process. Please try again later."
      );
  }
};

/**
 * GET /api/user/getUserDetails/:id
 * Return user details (excluding password and emailToken).
 */
exports.getUserDetails = async (req, res, next) => {
  const userId = req.params.id;
  console.log("getUser hit...");
  try {
    const user = await User.findById(userId, "-password -emailToken");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ user: user });
  } catch (error) {
    res.status(500).json({ message: "Fetching user failed", error: error });
  }
};

/**
 * PUT /api/user/updateUser/:id
 * Update non-sensitive user fields.
 */
exports.updateUser = async (req, res, next) => {
  const {
    firstName,
    lastName,
    city,
    address,
    zipcode,
    province,
    country,
    phone,
  } = req.body;
  const userId = req.params.id;
  console.log("update user");

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.firstName = firstName;
    user.lastName = lastName;
    user.address = address;
    user.phone = phone;
    user.city = city;
    user.province = province;
    user.zipcode = zipcode;
    user.country = country;

    await user.save();
    res.status(200).json({ message: "User updated" });
  } catch (error) {
    res.status(500).json({ message: "Could not update user", error: error });
  }
};

/**
 * POST /api/user/login
 * Used AFTER Passport LocalStrategy succeeds.
 * Passport local attaches the user to req.user.
 *
 * Frontend contract is preserved:
 * - request body: { username, password }
 * - response: { token, expiresIn, userId }
 */
exports.userLogin = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res
        .status(401)
        .json({ message: "Invalid authentication credentials" });
    }

    const token = jwt.sign(
      { username: user.username, userId: user._id },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      token: token,
      expiresIn: 3600,
      userId: user._id,
    });
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      return res
        .status(401)
        .json({ message: "Invalid authentication credentials" });
    }
  }
};

/**
 * PUT /api/user/updatePassword/:id
 * Change password: verify current password, then set new password.
 */
exports.changePassword = async (req, res, next) => {
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Could not change password", error: error });
  }
};
