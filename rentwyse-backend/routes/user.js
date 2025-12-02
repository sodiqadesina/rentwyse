const express = require("express");
const router = express.Router();
const passport = require("passport");
const userController = require("../controllers/userController");
const checkAuth = require("../middleware/check-auth");

// signup stays the same
router.post("/signup", userController.createUser);

// login now uses passport local, then userController.userLogin
router.post("/login", (req, res, next) => {
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) {
      return next(err);
    }

    if (!user) {
      // info.message comes from your LocalStrategy:
      // "User not found", "Password mismatch", "Auth failed: Email not verified", etc.
      return res.status(401).json({
        message:
          (info && info.message) || "Invalid username or password",
      });
    }

    // Attach the user so userController.userLogin can generate the JWT
    req.user = user;
    return userController.userLogin(req, res, next);
  })(req, res, next);
});

router.get("/verify-email", userController.verifyEmail);
router.get("/getUserDetails/:id", checkAuth, userController.getUserDetails);
router.put("/updateUser/:id", checkAuth, userController.updateUser);
router.put("/updatePassword/:id", checkAuth, userController.changePassword);

module.exports = router;
