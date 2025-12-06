// routes/admin.js
const express = require("express");
const router = express.Router();

const checkAuth = require("../middleware/check-auth");
const requireRole = require("../middleware/require-role");
const adminController = require("../controllers/adminController");

// convenience array
const adminOnly = [checkAuth, requireRole(["admin"])];

// 4.1 USER MANAGEMENT
router.get("/users", adminOnly, adminController.getUsers);
router.patch("/users/:id/status", adminOnly, adminController.updateUserStatus);
router.patch("/users/:id/role", adminOnly, adminController.updateUserRole);
router.get("/users/:id/activity", adminOnly, adminController.getUserActivity);

// 4.2 POST MODERATION
router.get("/posts", adminOnly, adminController.getPosts);
router.patch("/posts/:id/status", adminOnly, adminController.updatePostStatus);
router.patch("/posts/:id/featured", adminOnly, adminController.updatePostFeatured);
router.get("/posts/:id/detail", adminOnly, adminController.getPostDetail);

// 4.3 CONVERSATIONS & MESSAGES
router.get("/conversations", adminOnly, adminController.getConversations);
router.get("/conversations/:id", adminOnly, adminController.getConversationDetail);
router.patch(
  "/conversations/:id/status",
  adminOnly,
  adminController.updateConversationStatus
);

// 4.4 KYC
router.get("/kyc", adminOnly, adminController.getKycList);
router.get("/kyc/:id", adminOnly, adminController.getKycDetail);
router.patch("/kyc/:id/decision", adminOnly, adminController.decideKyc);

// 4.5 ANALYTICS
router.get(
  "/analytics/users-per-month",
  adminOnly,
  adminController.getUsersPerMonth
);
router.get(
  "/analytics/posts-per-city",
  adminOnly,
  adminController.getPostsPerCity
);
router.get(
  "/analytics/conversation-funnel",
  adminOnly,
  adminController.getConversationFunnel
);

// 4.6 SETTINGS & AUDIT
router.get("/settings", adminOnly, adminController.getSettings);
router.put("/settings", adminOnly, adminController.updateSettings);
router.get("/audit", adminOnly, adminController.getAuditLogs);

module.exports = router;
