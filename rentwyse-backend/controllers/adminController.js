// controllers/adminController.js
/**
 * Admin Controller
 *
 * Centralized admin-only operations for:
 *  - User management
 *  - Post moderation
 *  - Conversation & messaging oversight
 *  - KYC workflows
 *  - Platform analytics
 *  - Global settings & audit logs
 *
 * All routes using this controller MUST be protected by:
 *  - JWT authentication middleware (check-auth)
 *  - Role-based authorization middleware (requireRole(["admin"]))
 */

const mongoose = require("mongoose");
const User = require("../models/user");
const Post = require("../models/post");
const Conversation = require("../models/conversation");
const Message = require("../models/message");
const Kyc = require("../models/kyc");
const Settings = require("../models/settings");
const AuditLog = require("../models/auditLog");

/**
 * Lightweight logger wrapper.
 * If you later introduce Winston / pino, you can replace this implementation.
 */
const logger = {
  info: (...args) => console.log("[INFO] [AdminController]", ...args),
  error: (...args) => console.error("[ERROR] [AdminController]", ...args),
};

/**
 * Helper: create a structured audit log entry for critical admin actions.
 *
 * @param {string|ObjectId} adminId    - Admin performing the action (req.user._id).
 * @param {string}          action     - Action code, e.g. "UPDATE_USER_STATUS".
 * @param {string}          targetType - "user" | "post" | "conversation" | "kyc" | "settings".
 * @param {ObjectId}        targetId   - ID of the affected entity.
 * @param {object}          details    - Small JSON payload with extra context.
 */
async function logAudit(adminId, action, targetType, targetId, details = {}) {
  try {
    await AuditLog.create({
      admin: adminId,
      action,
      targetType,
      targetId,
      details,
    });

    logger.info("Audit log created", { adminId, action, targetType, targetId });
  } catch (err) {
    logger.error("Failed to create audit log:", err.message, {
      adminId,
      action,
      targetType,
      targetId,
    });
  }
}

/* ============================================================================
 * 4.1 USER MANAGEMENT
 * ==========================================================================*/

/**
 * GET /api/admin/users
 *
 * Paginated list of users with optional filters and search.
 *
 * Query parameters:
 *  - page      : number (default: 1)
 *  - pageSize  : number (default: 20)
 *  - status    : "active" | "banned" (optional)
 *  - city      : string (optional)
 *  - role      : "user" | "admin" (optional)
 *  - search    : string (partial match on username/email, optional)
 */
exports.getUsers = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      city,
      role,
      search, // optional: search by username/email
    } = req.query;

    logger.info("GET /api/admin/users", {
      adminId: req.user && req.user._id,
      query: req.query,
    });

    const pageNum = parseInt(page, 10) || 1;
    const limit = parseInt(pageSize, 10) || 20;
    const skip = (pageNum - 1) * limit;

    const filter = {};

    if (status) filter.status = status;
    if (city) filter.city = city;
    if (role) filter.role = role;

    if (search) {
      filter.$or = [
        { username: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-password -emailToken -resetToken"),
      User.countDocuments(filter),
    ]);

    logger.info("GET /api/admin/users success", {
      total,
      page: pageNum,
      pageSize: limit,
    });

    res.json({
      users,
      total,
      page: pageNum,
      pageSize: limit,
    });
  } catch (err) {
    logger.error("getUsers error:", err);
    res.status(500).json({ message: "Failed to fetch users." });
  }
};

/**
 * PATCH /api/admin/users/:id/status
 *
 * Update user status to "active" or "banned".
 *
 * Body:
 *  - status: "active" | "banned"
 */
exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    logger.info("PATCH /api/admin/users/:id/status", {
      adminId: req.user && req.user._id,
      targetUserId: id,
      status,
    });

    if (!["active", "banned"].includes(status)) {
      return res.status(400).json({ message: "Invalid status." });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).select("-password -emailToken");

    if (!user) {
      logger.info("updateUserStatus - user not found", { targetUserId: id });
      return res.status(404).json({ message: "User not found." });
    }

    // audit log
    await logAudit(req.user._id, "UPDATE_USER_STATUS", "user", user._id, {
      status,
    });

    res.json({ message: "User status updated.", user });
  } catch (err) {
    logger.error("updateUserStatus error:", err);
    res.status(500).json({ message: "Failed to update user status." });
  }
};

/**
 * PATCH /api/admin/users/:id/role
 *
 * Promote/demote a user between "user" and "admin".
 *
 * Body:
 *  - role: "user" | "admin"
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    logger.info("PATCH /api/admin/users/:id/role", {
      adminId: req.user && req.user._id,
      targetUserId: id,
      role,
    });

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role },
      { new: true }
    ).select("-password -emailToken");

    if (!user) {
      logger.info("updateUserRole - user not found", { targetUserId: id });
      return res.status(404).json({ message: "User not found." });
    }

    await logAudit(req.user._id, "UPDATE_USER_ROLE", "user", user._id, {
      role,
    });

    res.json({ message: "User role updated.", user });
  } catch (err) {
    logger.error("updateUserRole error:", err);
    res.status(500).json({ message: "Failed to update user role." });
  }
};

/**
 * GET /api/admin/users/:id/activity
 *
 * High-level activity overview for a specific user:
 *  - Basic profile info.
 *  - Total post count and conversation count.
 *  - Latest posts and conversations (for quick inspection).
 */
exports.getUserActivity = async (req, res) => {
  try {
    const { id: userId } = req.params;

    logger.info("GET /api/admin/users/:id/activity", {
      adminId: req.user && req.user._id,
      targetUserId: userId,
    });

    const user = await User.findById(userId).select(
      "username email role status createdAt kycStatus city"
    );
    if (!user) {
      logger.info("getUserActivity - user not found", { targetUserId: userId });
      return res.status(404).json({ message: "User not found." });
    }

    const [postsCount, convosCount, latestPosts, latestConvos] =
      await Promise.all([
        Post.countDocuments({ creator: userId }),
        Conversation.countDocuments({ participants: userId }),
        Post.find({ creator: userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("title city status createdAt"),
        Conversation.find({ participants: userId })
          .sort({ lastMessageAt: -1 })
          .limit(5)
          .select("postId status lastMessageAt")
          .populate("postId", "title city"),
      ]);

    logger.info("getUserActivity success", {
      targetUserId: userId,
      postsCount,
      convosCount,
    });

    res.json({
      user,
      metrics: {
        postsCount,
        convosCount,
      },
      latestPosts,
      latestConvos,
    });
  } catch (err) {
    logger.error("getUserActivity error:", err);
    res.status(500).json({ message: "Failed to fetch user activity." });
  }
};

/* ============================================================================
 * 4.2 POST MODERATION
 * ==========================================================================*/

/**
 * GET /api/admin/posts
 *
 * Paginated list of posts with basic filters.
 *
 * Query parameters:
 *  - page      : number (default: 1)
 *  - pageSize  : number (default: 20)
 *  - status    : "draft" | "active" | "flagged" | "deleted" (optional)
 *  - city      : string (optional)
 *  - search    : string (partial match on title, optional)
 */
exports.getPosts = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      city,
      search, // optional: search by title
      featured,
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limit = parseInt(pageSize, 10) || 20;
    const skip = (pageNum - 1) * limit;

    const filter = {};

    if (status) filter.status = status;
    if (city) filter.city = city;
    if (search) {
      filter.title = new RegExp(search, "i");
    }
    if (typeof featured !== "undefined" && featured !== "") {
      filter.featured = featured === "true";
    }

    const [rawPosts, total] = await Promise.all([
      Post.find(filter)
        .sort({ dateListed: -1, createdAt: -1 }) // prefer real listing date if present
        .skip(skip)
        .limit(limit)
        .populate("creator", "username email")
        // IMPORTANT: include dateListed here
        .select("title city price rent status featured dateListed createdAt updatedAt")
        .lean(),
      Post.countDocuments(filter),
    ]);

    const posts = rawPosts.map((p) => ({
      ...p,
      // normalise rent (this was already working fine)
      rent:
        typeof p.rent === "number"
          ? p.rent
          : typeof p.price === "number"
          ? p.price
          : null,

      // *** KEY FIX ***
      // Use dateListed when available, fall back to createdAt otherwise
      createdAt: p.dateListed || p.createdAt || null,
    }));

    res.status(200).json({
    posts,
    total,
    page: pageNum,
    pageSize: limit,
  });
  } catch (err) {
    console.error("getPosts error:", err);
    res.status(500).json({ message: "Failed to fetch posts." });
  }
};

/**
 * PATCH /api/admin/posts/:id/status
 *
 * Update a post's moderation status.
 *
 * Body:
 *  - status: "draft" | "active" | "flagged" | "deleted"
 */



exports.updatePostStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    logger.info("PATCH /api/admin/posts/:id/status", {
      adminId: req.user && req.user._id,
      postId: id,
      status,
    });

    const validStatuses = ["draft", "active", "flagged", "deleted"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid post status." });
    }

    const now = new Date();
    const isDeleted = status === "deleted";

    const post = await Post.findByIdAndUpdate(
      id,
      {
        status,
        isDeleted,
        deletedAt: isDeleted ? now : null,
        updatedAt: now,
      },
      { new: true }
    );

    if (!post) {
      logger.info("updatePostStatus - post not found", { postId: id });
      return res.status(404).json({ message: "Post not found." });
    }

    await logAudit(req.user._id, "UPDATE_POST_STATUS", "post", post._id, {
      status,
      isDeleted,
    });

    return res.status(200).json({ message: "Post status updated.", post });
  } catch (err) {
    logger.error("updatePostStatus error:", err);
    return res.status(500).json({ message: "Failed to update post status." });
  }
};


/**
 * PATCH /api/admin/posts/:id/featured
 *
 * Mark a post as featured or not.
 *
 * Body:
 *  - featured: boolean
 */
exports.updatePostFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;

    logger.info("PATCH /api/admin/posts/:id/featured", {
      adminId: req.user && req.user._id,
      postId: id,
      featured,
    });

    const post = await Post.findByIdAndUpdate(
      id,
      { featured: !!featured, updatedAt: new Date() },
      { new: true }
    );

    if (!post) {
      logger.info("updatePostFeatured - post not found", { postId: id });
      return res.status(404).json({ message: "Post not found." });
    }

    await logAudit(req.user._id, "UPDATE_POST_FEATURED", "post", post._id, {
      featured: !!featured,
    });

    res.json({ message: "Post featured flag updated.", post });
  } catch (err) {
    logger.error("updatePostFeatured error:", err);
    res.status(500).json({ message: "Failed to update post featured flag." });
  }
};

/**
 * GET /api/admin/posts/:id/detail
 *
 * Detailed view of a single post along with its conversations summary.
 */
exports.getPostDetail = async (req, res) => {
  try {
    const { id: postId } = req.params;

    logger.info("GET /api/admin/posts/:id/detail", {
      adminId: req.user && req.user._id,
      postId,
    });

    const post = await Post.findById(postId)
      .populate("creator", "username email")
      .lean();

    if (!post) {
      logger.info("getPostDetail - post not found", { postId });
      return res.status(404).json({ message: "Post not found." });
    }

    const conversations = await Conversation.find({ postId })
      .select("participants status hasAgreement hasDocuments lastMessageAt")
      .populate("participants", "username email")
      .lean();

    res.json({ post, conversations });
  } catch (err) {
    logger.error("getPostDetail error:", err);
    res.status(500).json({ message: "Failed to fetch post detail." });
  }
};

/* ============================================================================
 * 4.3 CONVERSATIONS & MESSAGES
 * ==========================================================================*/

/**
 * GET /api/admin/conversations
 *
 * Paginated list of conversations with basic filters.
 *
 * Query parameters:
 *  - page        : number (default: 1)
 *  - pageSize    : number (default: 20)
 *  - status      : "open" | "closed" | "flagged" (optional)
 *  - hasDocuments: "true" | "false" (optional)
 */
exports.getConversations = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      hasDocuments,
    } = req.query;

    logger.info("GET /api/admin/conversations", {
      adminId: req.user && req.user._id,
      query: req.query,
    });

    const pageNum = parseInt(page, 10) || 1;
    const limit = parseInt(pageSize, 10) || 20;
    const skip = (pageNum - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (hasDocuments === "true") filter.hasDocuments = true;
    if (hasDocuments === "false") filter.hasDocuments = false;

    const [conversations, total] = await Promise.all([
      Conversation.find(filter)
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "postId participants status hasAgreement hasDocuments lastMessageAt"
        )
        .populate("postId", "title city")
        .populate("participants", "username email"),
      Conversation.countDocuments(filter),
    ]);

    logger.info("GET /api/admin/conversations success", {
      total,
      page: pageNum,
      pageSize: limit,
    });

    res.json({
      conversations,
      total,
      page: pageNum,
      pageSize: limit,
    });
  } catch (err) {
    logger.error("getConversations error:", err);
    res.status(500).json({ message: "Failed to fetch conversations." });
  }
};

/**
 * GET /api/admin/conversations/:id
 *
 * Detailed conversation view, including all messages.
 */
exports.getConversationDetail = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("GET /api/admin/conversations/:id", {
      adminId: req.user && req.user._id,
      conversationId: id,
    });

    const conversation = await Conversation.findById(id)
      .populate("participants", "username email")
      .populate("postId", "title city")
      .lean();

    if (!conversation) {
      logger.info("getConversationDetail - conversation not found", {
        conversationId: id,
      });
      return res.status(404).json({ message: "Conversation not found." });
    }

    const messages = await Message.find({ conversationId: id })
      .sort({ createdAt: 1 })
      .populate("sender", "username")
      .populate("receiver", "username")
      .lean();

    res.json({ conversation, messages });
  } catch (err) {
    logger.error("getConversationDetail error:", err);
    res.status(500).json({ message: "Failed to fetch conversation detail." });
  }
};

/**
 * PATCH /api/admin/conversations/:id/status
 *
 * Update conversation moderation state.
 *
 * Body:
 *  - status: "open" | "closed" | "flagged"
 */
exports.updateConversationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    logger.info("PATCH /api/admin/conversations/:id/status", {
      adminId: req.user && req.user._id,
      conversationId: id,
      status,
    });

    if (!["open", "closed", "flagged"].includes(status)) {
      return res.status(400).json({ message: "Invalid conversation status." });
    }

    const conversation = await Conversation.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!conversation) {
      logger.info("updateConversationStatus - conversation not found", {
        conversationId: id,
      });
      return res.status(404).json({ message: "Conversation not found." });
    }

    await logAudit(
      req.user._id,
      "UPDATE_CONVERSATION_STATUS",
      "conversation",
      conversation._id,
      { status }
    );

    res.json({ message: "Conversation status updated.", conversation });
  } catch (err) {
    logger.error("updateConversationStatus error:", err);
    res.status(500).json({ message: "Failed to update conversation status." });
  }
};

/* ============================================================================
 * 4.4 KYC ENDPOINTS
 * ==========================================================================*/

/**
 * GET /api/admin/kyc
 *
 * Paginated list of KYC records.
 *
 * Query parameters:
 *  - status   : "pending" | "approved" | "rejected" (default: "pending")
 *  - page     : number (default: 1)
 *  - pageSize : number (default: 20)
 */
exports.getKycList = async (req, res) => {
  try {
    const { status = "pending", page = 1, pageSize = 20 } = req.query;

    logger.info("GET /api/admin/kyc", {
      adminId: req.user && req.user._id,
      query: req.query,
    });

    const pageNum = parseInt(page, 10) || 1;
    const limit = parseInt(pageSize, 10) || 20;
    const skip = (pageNum - 1) * limit;

    const filter = {};
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Kyc.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "username email kycStatus"),
      Kyc.countDocuments(filter),
    ]);

    logger.info("GET /api/admin/kyc success", {
      total,
      page: pageNum,
      pageSize: limit,
    });

    res.json({
      items,
      total,
      page: pageNum,
      pageSize: limit,
    });
  } catch (err) {
    logger.error("getKycList error:", err);
    res.status(500).json({ message: "Failed to fetch KYC list." });
  }
};

/**
 * GET /api/admin/kyc/:id
 *
 * Detailed view of a single KYC record.
 */
exports.getKycDetail = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("GET /api/admin/kyc/:id", {
      adminId: req.user && req.user._id,
      kycId: id,
    });

    const kyc = await Kyc.findById(id)
      .populate("user", "username email kycStatus")
      .populate("reviewedBy", "username email");

    if (!kyc) {
      logger.info("getKycDetail - KYC record not found", { kycId: id });
      return res.status(404).json({ message: "KYC record not found." });
    }

    res.json(kyc);
  } catch (err) {
    logger.error("getKycDetail error:", err);
    res.status(500).json({ message: "Failed to fetch KYC detail." });
  }
};

/**
 * PATCH /api/admin/kyc/:id/decision
 *
 * Approve or reject a KYC record.
 *
 * Body:
 *  - status   : "approved" | "rejected"
 *  - adminNote: string (optional comment)
 */
exports.decideKyc = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    logger.info("PATCH /api/admin/kyc/:id/decision", {
      adminId: req.user && req.user._id,
      kycId: id,
      status,
    });

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid KYC status." });
    }

    const kyc = await Kyc.findById(id);
    if (!kyc) {
      logger.info("decideKyc - KYC record not found", { kycId: id });
      return res.status(404).json({ message: "KYC record not found." });
    }

    kyc.status = status;
    kyc.adminNote = adminNote || kyc.adminNote;
    kyc.reviewedBy = req.user._id;
    kyc.reviewedAt = new Date();
    await kyc.save();

    // Sync with User.kycStatus
    await User.findByIdAndUpdate(kyc.user, { kycStatus: status });

    await logAudit(req.user._id, "DECIDE_KYC", "kyc", kyc._id, {
      status,
      adminNote,
      userId: kyc.user,
    });

    res.json({ message: "KYC decision saved.", kyc });
  } catch (err) {
    logger.error("decideKyc error:", err);
    res.status(500).json({ message: "Failed to decide KYC." });
  }
};

/* ============================================================================
 * 4.5 ANALYTICS
 * ==========================================================================*/

/**
 * GET /api/admin/analytics/users-per-month
 *
 * Aggregated count of users grouped by year + month of creation.
 * Used for admin dashboard line charts.
 */
exports.getUsersPerMonth = async (req, res) => {
  try {
    logger.info("GET /api/admin/analytics/users-per-month", {
      adminId: req.user && req.user._id,
    });

    const result = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json(result);
  } catch (err) {
    logger.error("getUsersPerMonth error:", err);
    res.status(500).json({ message: "Failed to fetch users-per-month." });
  }
};

/**
 * GET /api/admin/analytics/posts-per-city
 *
 * Aggregated count of posts per city (excluding deleted posts).
 * Used for bar charts / heatmaps on admin dashboard.
 */
exports.getPostsPerCity = async (req, res) => {
  try {
    logger.info("GET /api/admin/analytics/posts-per-city", {
      adminId: req.user && req.user._id,
    });

    const result = await Post.aggregate([
      {
        $match: {
          // Adjust this if you use a different deletion flag.
          status: { $ne: "deleted" },
        },
      },
      {
        $group: {
          _id: "$city",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json(result);
  } catch (err) {
    logger.error("getPostsPerCity error:", err);
    res.status(500).json({ message: "Failed to fetch posts-per-city." });
  }
};

/**
 * GET /api/admin/analytics/conversation-funnel
 *
 * Aggregated overview of the messaging funnel:
 *  - totalConversations
 *  - conversations with at least one document (agreement)
 *  - conversations with a receipt (payment/transaction)
 */
exports.getConversationFunnel = async (req, res) => {
  try {
    logger.info("GET /api/admin/analytics/conversation-funnel", {
      adminId: req.user && req.user._id,
    });

    const resultArr = await Conversation.aggregate([
      {
        $group: {
          _id: null,
          totalConversations: { $sum: 1 },
          withAgreement: {
            $sum: {
              $cond: [{ $gt: ["$documents.length", 0] }, 1, 0],
            },
          },
          withReceipt: {
            $sum: {
              $cond: [{ $ifNull: ["$receipt.totalAmount", false] }, 1, 0],
            },
          },
        },
      },
    ]);

    const result = resultArr[0] || {
      totalConversations: 0,
      withAgreement: 0,
      withReceipt: 0,
    };

    res.json(result);
  } catch (err) {
    logger.error("getConversationFunnel error:", err);
    res.status(500).json({ message: "Failed to fetch conversation funnel." });
  }
};

/* ============================================================================
 * 4.6 SETTINGS & AUDIT
 * ==========================================================================*/

/**
 * GET /api/admin/settings
 *
 * Fetch singleton Settings document. If none exists, one is created with defaults.
 */
exports.getSettings = async (req, res) => {
  try {
    logger.info("GET /api/admin/settings", {
      adminId: req.user && req.user._id,
    });

    // Singleton pattern: only one settings document should exist.
    let settings = await Settings.findOne({});
    if (!settings) {
      settings = await Settings.create({
        serviceCharge: 0,
        salesTax: 0,
        currency: "CAD",
      });
      logger.info("Settings document auto-created with defaults.");
    }

    res.json(settings);
  } catch (err) {
    logger.error("getSettings error:", err);
    res.status(500).json({ message: "Failed to fetch settings." });
  }
};

/**
 * PUT /api/admin/settings
 *
 * Update global platform settings (serviceCharge, salesTax, currency).
 *
 * Body example:
 *  {
 *    "serviceCharge": 10,
 *    "salesTax": 13,
 *    "currency": "CAD"
 *  }
 */
exports.updateSettings = async (req, res) => {
  try {
    const payload = {
      serviceCharge: req.body.serviceCharge,
      salesTax: req.body.salesTax,
      currency: req.body.currency,
    };

    logger.info("PUT /api/admin/settings", {
      adminId: req.user && req.user._id,
      payload,
    });

    let settings = await Settings.findOne({});
    if (!settings) {
      settings = await Settings.create(payload);
      logger.info("Settings document created via updateSettings.");
    } else {
      Object.assign(settings, payload);
      await settings.save();
      logger.info("Settings document updated.");
    }

    await logAudit(req.user._id, "UPDATE_SETTINGS", "settings", settings._id, {
      serviceCharge: settings.serviceCharge,
      salesTax: settings.salesTax,
      currency: settings.currency,
    });

    res.json({ message: "Settings updated.", settings });
  } catch (err) {
    logger.error("updateSettings error:", err);
    res.status(500).json({ message: "Failed to update settings." });
  }
};

/**
 * GET /api/admin/audit
 *
 * Fetch paginated audit log entries.
 *
 * Query parameters:
 *  - action   : string (filter by action code, optional)
 *  - adminId  : ObjectId string (filter by admin, optional)
 *  - page     : number (default: 1)
 *  - pageSize : number (default: 20)
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      action,
      adminId,
      page = 1,
      pageSize = 20,
    } = req.query;

    logger.info("GET /api/admin/audit", {
      requesterId: req.user && req.user._id,
      query: req.query,
    });

    const pageNum = parseInt(page, 10) || 1;
    const limit = parseInt(pageSize, 10) || 20;
    const skip = (pageNum - 1) * limit;

    const filter = {};
    if (action) filter.action = action;
    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      filter.admin = adminId;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("admin", "username email"),
      AuditLog.countDocuments(filter),
    ]);

    logger.info("GET /api/admin/audit success", {
      total,
      page: pageNum,
      pageSize: limit,
    });

    res.json({
      logs,
      total,
      page: pageNum,
      pageSize: limit,
    });
  } catch (err) {
    logger.error("getAuditLogs error:", err);
    res.status(500).json({ message: "Failed to fetch audit logs." });
  }
};
