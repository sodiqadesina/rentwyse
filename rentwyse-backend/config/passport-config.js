// config/passport-config.js

const LocalStrategy = require("passport-local").Strategy;
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const bcrypt = require("bcrypt");
const User = require("../models/user");

/**
 * Configure Passport strategies:
 * - LocalStrategy: username + password login
 * - JwtStrategy: protect routes with Bearer token
 */
module.exports = function (passport) {
  // ----- LOCAL STRATEGY (username + password) -----
  passport.use(
    new LocalStrategy(
      {
        usernameField: "username", // frontend sends { username, password }
        passwordField: "password",
      },
      async (username, password, done) => {
        try {
          const user = await User.findOne({ username });

          if (!user) {
            return done(null, false, { message: "User not found" });
          }

          // Enforce email verification (comment this out in dev)
          if (!user.isEmailVerified) {
            return done(null, false, {
              message: "Auth failed: Email not verified",
            });
          }

          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: "Password mismatch" });
          }

          // Success
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // ----- JWT STRATEGY (protect routes) -----
  const jwtOpts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_KEY,
  };

  passport.use(
    new JwtStrategy(jwtOpts, async (jwtPayload, done) => {
      try {
        // jwtPayload is { username, userId } from your userController.userLogin
        const user = await User.findById(jwtPayload.userId);
        if (!user) {
          return done(null, false);
        }

        // Attach user to req.user
        return done(null, user);
      } catch (err) {
        return done(err, false);
      }
    })
  );
};
