const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/check-auth");
const extractFile = require("../middleware/file");

const kycController = require("../controllers/KycController");

//Adding a Post
router.post("", checkAuth, extractFile, kycController.newPost);

module.exports = router;