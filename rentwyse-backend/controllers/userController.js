// controllers/userController.js
/**
 * User Controller
 *
 * Handles:
 *  - User signup and email verification
 *  - User profile retrieval and updates
 *  - Authentication (login)
 *  - Password changes
 */

const User = require("../models/user");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("../Services/emailService");

dotenv.config({ path: ".env" });

/**
 * Lightweight logger wrapper.
 * Replace implementation with Winston/pino later if needed.
 */
const logger = {
  info: (...args) => console.log("[INFO] [UserController]", ...args),
  error: (...args) => console.error("[ERROR] [UserController]", ...args),
};

/**
 * POST /api/user/signup
 *
 * Create a new user and send an email verification link.
 *
 * Flow:
 *  1. Hash incoming password with bcrypt.
 *  2. Generate a verification token.
 *  3. Persist the new user.
 *  4. Respond 201 with created user.
 *  5. Fire-and-forget: send verification email (errors are logged, not returned).
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

  logger.info("Signup request received", {
    username,
    email,
    city,
    province,
    country,
  });

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

    logger.info("User created successfully", { userId: result._id, email });

    // Send response ONCE (important: do this before async email sending)
    res.status(201).json({
      message: "user created Successfully!",
      result: result,
    });

    // Fire-and-forget: send verification email in the background.
    try {
      logger.info("Sending verification email", { email: newUser.email });
      await emailService.sendVerificationEmail(newUser.email, verificationToken);
      logger.info("Verification email sent successfully", {
        email: newUser.email,
      });
    } catch (emailErr) {
      logger.error("Failed to send verification email:", emailErr);
    }
  } catch (err) {
    logger.error("createUser error:", err);

    // Handle duplicate key / unique constraint errors nicely

    // Case 1: Mongo duplicate key error (e.g. { code: 11000, keyValue: { email: "..." } })
    if (err.code === 11000 && err.keyValue) {
      const field = Object.keys(err.keyValue)[0]; // e.g. 'email' or 'username'
      const message =
        field.charAt(0).toUpperCase() + field.slice(1) + " already exists";

      logger.info("Duplicate key error on signup", { field, value: err.keyValue[field] });

      return res.status(400).json({
        message,
        field,
      });
    }

    // Case 2: mongoose-unique-validator style validation error
    if (err.errors) {
      if (err.errors.email && err.errors.email.kind === "unique") {
        logger.info("Unique validation error on email during signup");
        return res.status(400).json({
          message: "Email already exists",
          field: "email",
        });
      }
      if (err.errors.username && err.errors.username.kind === "unique") {
        logger.info("Unique validation error on username during signup");
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
 *
 * Verify email address using the token sent via email.
 *
 * Flow:
 *  1. Find user by emailToken.
 *  2. If not found, token is invalid or expired.
 *  3. If already verified, inform user.
 *  4. Otherwise, clear token and set isEmailVerified = true.
 */
exports.verifyEmail = async (req, res) => {
  const token = req.query.token;
  logger.info("Email verification request received", { token });

  try {
    const user = await User.findOne({ emailToken: token });

    if (!user) {
      logger.info("Invalid or expired email verification token", { token });
      return res.status(400).send("This link is invalid or has expired.");
    }

    if (user.isEmailVerified) {
      logger.info("Email already verified", { userId: user._id, email: user.email });
      return res
        .status(400)
        .send("This email has already been verified. You can now login.");
    }

    user.emailToken = null;
    user.isEmailVerified = true;
    await user.save();

    logger.info("Email verification successful", {
      userId: user._id,
      email: user.email,
    });

    res.status(200).send("email verification succesfull");
  } catch (error) {
    logger.error("verifyEmail error:", error);
    res
      .status(500)
      .send(
        "An error occurred during the verification process. Please try again later."
      );
  }
};

/**
 * GET /api/user/getUserDetails/:id
 *
 * Return user details (excluding password and emailToken).
 */
exports.getUserDetails = async (req, res, next) => {
  const userId = req.params.id;
  logger.info("GET /api/user/getUserDetails/:id hit", { userId });

  try {
    const user = await User.findById(userId, "-password -emailToken");
    if (!user) {
      logger.info("getUserDetails - user not found", { userId });
      return res.status(404).json({ message: "User not found" });
    }

    logger.info("getUserDetails success", { userId });
    res.status(200).json({ user: user });
  } catch (error) {
    logger.error("getUserDetails error:", error);
    res.status(500).json({ message: "Fetching user failed", error: error });
  }
};

/**
 * PUT /api/user/updateUser/:id
 *
 * Update non-sensitive user fields.
 *
 * Body:
 *  - firstName
 *  - lastName
 *  - city
 *  - address
 *  - zipcode
 *  - province
 *  - country
 *  - phone
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

  logger.info("PUT /api/user/updateUser/:id hit", {
    userId,
    body: {
      firstName,
      lastName,
      city,
      province,
      country,
    },
  });

  try {
    const user = await User.findById(userId);

    if (!user) {
      logger.info("updateUser - user not found", { userId });
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

    logger.info("User profile updated successfully", { userId });
    res.status(200).json({ message: "User updated" });
  } catch (error) {
    logger.error("updateUser error:", error);
    res.status(500).json({ message: "Could not update user", error: error });
  }
};

/**
 * POST /api/user/login
 *
 * Used AFTER Passport LocalStrategy succeeds.
 * Passport LocalStrategy attaches the authenticated user to req.user.
 *
 * Frontend contract (current implementation):
 *  - request body: { username, password }
 *  - response: { token, expiresIn, userId, role }
 */
exports.userLogin = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      logger.info("userLogin - req.user not set (Passport failure)");
      return res
        .status(401)
        .json({ message: "Invalid authentication credentials" });
    }

    logger.info("User login successful, generating JWT", {
      userId: user._id,
      username: user.username,
      role: user.role,
    });

    const token = jwt.sign(
      { username: user.username, userId: user._id, role: user.role },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );

    return res.status(200).json({
      token: token,
      expiresIn: 3600,
      userId: user._id,
      role: user.role,
    });
  } catch (error) {
    logger.error("userLogin error:", error);
    if (!res.headersSent) {
      return res
        .status(401)
        .json({ message: "Invalid authentication credentials" });
    }
  }
};

/**
 * PUT /api/user/updatePassword/:id
 *
 * Change password:
 *  1. Verify current password.
 *  2. Hash and set new password.
 *
 * Body:
 *  - currentPassword
 *  - newPassword
 */
exports.changePassword = async (req, res, next) => {
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;

  logger.info("PUT /api/user/updatePassword/:id hit", { userId });

  try {
    const user = await User.findById(userId);
    if (!user) {
      logger.info("changePassword - user not found", { userId });
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      logger.info("changePassword - incorrect current password", { userId });
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedNewPassword;
    await user.save();

    logger.info("Password updated successfully", { userId });
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    logger.error("changePassword error:", error);
    res
      .status(500)
      .json({ message: "Could not change password", error: error });
  }
};
