const Post = require("../models/post");
const mongoose = require("mongoose");

/**
 * Lightweight logger wrapper for this controller.
 * Replace with Winston/pino later if needed.
 */
const logger = {
  info: (...args) => console.log("[INFO] [PostController]", ...args),
  error: (...args) => console.error("[ERROR] [PostController]", ...args),
};

/**
 * CREATE
 * ---------------------------------------------------------------------------
 * POST /api/posts
 *
 * Create a new rental post with one or more uploaded images.
 * Multer middleware is expected to populate `req.files`.
 */

exports.newPost = (req, res, next) => {
  // Ensure user is authenticated & has a userId
  if (!req.userData || !req.userData.userId) {
    logger.error("newPost called without valid userId", {
      userData: req.userData,
    });
    return res.status(401).json({ message: "User not authenticated." });
  }

  const url = req.protocol + "://" + req.get("host");

  const images = (req.files || []).map(
    (file) => url + "/images/" + file.filename
  );

  logger.info("Creating new post", {
    userId: req.userData.userId,
    imageCount: images.length,
  });

  const post = new Post({
    title: req.body.title,
    description: req.body.description,
    imagePath: images, // storing all images in an array
    creator: req.userData.userId,
    bedroom: req.body.bedroom,
    bathroom: req.body.bathroom,
    furnished: req.body.furnished,
    typeOfProperty: req.body.typeOfProperty,
    parkingAvailable: req.body.parkingAvailable,
    rentType: req.body.rentType,
    city: req.body.city,
    address: req.body.address,
    province: req.body.province,
    zipcode: req.body.zipcode,
    country: req.body.country,
    price: req.body.price,
    dateListed: req.body.dateListed,
    dateAvailableForRent: req.body.dateAvailableForRent,
  });

  logger.info("newPost payload", { body: req.body });
  logger.info("newPost document", { post });

  post
    .save()
    .then((result) => {
      logger.info("Post created successfully", {
        postId: result._id,
        userId: req.userData.userId,
      });

      res.status(201).json({
        post: {
          _id: result._id,
          title: result.title,
          description: result.description,
          // 🔧 your schema field is imagePath, not imagePaths
          imagePath: result.imagePath,
          creator: req.userData.userId,
          bedroom: result.bedroom,
          bathroom: result.bathroom,
          furnished: result.furnished,
          typeOfProperty: result.typeOfProperty,
          parkingAvailable: result.parkingAvailable,
          rentType: result.rentType,
          city: result.city,
          address: result.address,
          province: result.province,
          zipcode: result.zipcode,
          country: result.country,
          price: result.price,
          dateListed: result.dateListed,
          dateAvailableForRent: result.dateAvailableForRent,
        },
        message: "Post added successfully",
      });
    })
    .catch((error) => {
      logger.error("Creating post failed", { error });
      res.status(500).json({ message: "Creating Post failed" });
    });
};


/**
 * READ (list with filters)
 * ---------------------------------------------------------------------------
 * GET /api/posts
 *
 * Returns paginated list of posts with optional filters:
 *  - city
 *  - bedroom
 *  - bathroom
 *  - furnished (true/false)
 *  - parkingAvailable (true/false)
 *  - minPrice / maxPrice
 *
 * Soft-delete is enforced via `isDeleted: { $ne: true }`.
 */
exports.listPost = (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const postQuery = Post.find();

  // Constructing the filter query
  const filterQuery = {};

  // Soft delete – always exclude deleted posts
  filterQuery.isDeleted = { $ne: true }; // only fetch posts that are not soft-deleted

  filterQuery.status = { $ne: "flagged"} // exculude flagged posts 

  if (req.query.city) {
    filterQuery.city = { $regex: new RegExp(req.query.city, "i") };
  }
  if (req.query.bedroom) {
    filterQuery.bedroom = req.query.bedroom;
  }
  if (req.query.bathroom) {
    filterQuery.bathroom = req.query.bathroom;
  }
  if (req.query.furnished) {
    filterQuery.furnished = req.query.furnished === "true";
  }
  if (req.query.parkingAvailable) {
    filterQuery.parkingAvailable = req.query.parkingAvailable === "true";
  }
  if (req.query.minPrice || req.query.maxPrice) {
    filterQuery.price = {};
    if (req.query.minPrice) {
      filterQuery.price.$gte = parseInt(req.query.minPrice);
    }
    if (req.query.maxPrice) {
      filterQuery.price.$lte = parseInt(req.query.maxPrice);
    }
  }

  logger.info("listPost filters", { filterQuery, query: req.query });

  // Apply filters to the query
  postQuery.find(filterQuery);

  let fetchedPost;
  if (pageSize && currentPage) {
    postQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }

  postQuery
    .then((documents) => {
      fetchedPost = documents;
      return Post.countDocuments(filterQuery); // Count the filtered documents (non-deleted only)
    })
    .then((count) => {
      logger.info("Posts fetched successfully", {
        count,
        pageSize,
        currentPage,
      });

      res.status(200).json({
        message: "Posts fetched successfully!",
        posts: fetchedPost,
        maxPost: count,
      });
    })
    .catch((error) => {
      logger.error("Fetching posts failed", { error });
      res
        .status(500)
        .json({ message: "Fetching posts failed!!", error: error.message });
    });
};

/**
 * READ (by current user)
 * ---------------------------------------------------------------------------
 * GET /api/posts/user
 *
 * Lists posts created by the currently authenticated user, paginated.
 * Uses `req.userData.userId` populated by auth middleware.
 * Soft delete enforced (isDeleted != true).
 */
exports.listPostByUserId = (req, res, next) => {
  const userId = req.userData.userId; // Get user ID from request data
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;

  logger.info("Listing posts by user", {
    userId,
    pageSize,
    currentPage,
  });

  // Check if userId is valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    logger.error("Invalid user ID in listPostByUserId", { userId });
    return res.status(400).json({ message: "Invalid user ID" });
  }


  const postQuery = Post.find(filter); // Filtering the posts by user ID
  let fetchedPosts;

  if (pageSize && currentPage) {
    postQuery.skip(pageSize * (currentPage - 1)).limit(pageSize);
  }

  postQuery
    .then((documents) => {
      fetchedPosts = documents;
      return Post.countDocuments(filter); // Count only posts by this user (non-deleted)
    })
    .then((count) => {
      logger.info("Posts by user fetched successfully", {
        userId,
        count,
      });

      res.status(200).json({
        message: "Posts fetched successfully!",
        posts: fetchedPosts,
        maxPosts: count,
      });
    })
    .catch((error) => {
      logger.error("Fetching posts by user failed", { userId, error });
      res
        .status(500)
        .json({ message: "Fetching posts failed: " + error.message });
    });
};

/**
 * READ (single post by ID)
 * ---------------------------------------------------------------------------
 * GET /api/posts/:id
 *
 * Fetches a single post by ID, ignoring soft-deleted posts.
 */
exports.listPostById = (req, res, next) => {
  const postId = req.params.id;

  logger.info("Fetching post by ID", { postId });

  // Soft delete – don’t return deleted posts
  Post.findOne({ _id: postId, isDeleted: { $ne: true } })
    .then((post) => {
      logger.info("listPostById raw id", { postId });

      if (post) {
        res.status(200).json(post);
      } else {
        logger.info("Post not found in listPostById", { postId });
        res.status(404).json({ message: "Post not Found" });
      }
    })
    .catch((error) => {
      logger.error("Error during the search operation in listPostById", {
        postId,
        error,
      });
      res.status(500).json({ message: "Fetching Post failed" });
    });
};

/**
 * UPDATE
 * ---------------------------------------------------------------------------
 * PUT /api/posts/:id
 *
 * Edits an existing post by ID.
 * - Supports optional uploading of new images.
 * - Only allows editing posts created by the current user.
 * - Soft-deleted posts are not editable.
 */
exports.editPost = (req, res, next) => {
  const postId = req.params.id;
  let imagePath = req.body.imagePath;

  logger.info("Editing post", {
    postId,
    userId: req.userData && req.userData.userId,
  });

  // Check if there are new images uploaded
  if (req.files) {
    const url = req.protocol + "://" + req.get("host");
    imagePath = req.files.map((file) => url + "/images/" + file.filename);
  }

  // Create an object for the updated post data
  const postUpdateData = {
    _id: req.body.id,
    description: req.body.description,
    creator: req.userData.userId,
    bedRoom: req.body.bedRoom,
    bathroom: req.body.bathroom,
    furnished: req.body.furnished,
    typeOfProperty: req.body.typeOfProperty,
    parkingAvailable: req.body.parkingAvailable,
    rentType: req.body.rentType,
    city: req.body.city,
    address: req.body.address,
    province: req.body.province,
    zipcode: req.body.zipcode,
    country: req.body.country,
    price: req.body.price,
    dateListed: req.body.dateListed,
    dateAvailableForRent: req.body.dateAvailableForRent,
  };

  // Only update imagePath if new images were uploaded or provided
  if (imagePath) {
    postUpdateData.imagePath = imagePath;
  }

  // Note: this logs entire req object; kept as-is, but routed through logger
  logger.info("editPost raw request and update data", {
    req,
    postUpdateData,
    creatorField: req.userData && req.userData.creator,
  });

  // Optional: prevent editing soft-deleted posts
  Post.updateOne(
    { _id: postId, creator: req.userData.userId, isDeleted: { $ne: true } }, // do not edit deleted posts
    postUpdateData
  )
    .then((result) => {
      logger.info("Update result", { postId, result });

      // Handle both Mongoose 5 and 6 shapes
      const modified =
        result.modifiedCount > 0 ||
        result.nModified > 0; // fallback for older versions

      if (modified) {
        res.status(200).json({ message: "Update Successful!" });
      } else {
        res.status(200).json({ message: "No Change was made" });
      }
    })
    .catch((error) => {
      logger.error("Error during the update operation in editPost", {
        postId,
        error,
      });
      res.status(500).json({ message: "Update Failed!" });
    });
};


/**
 * DELETE (soft delete)
 * ---------------------------------------------------------------------------
 * DELETE /api/posts/:_id
 *
 * Soft deletes a post by marking:
 *  - isDeleted: true
 *  - deletedAt: Date
 *
 * Only the creator of the post can delete, and only active (non-deleted) posts
 * are affected.
 */
exports.deletePost = (req, res, next) => {
  logger.info("Soft deleting post", {
    postIdParam: req.params._id,
    userId: req.userData && req.userData.userId,
    status: req.userData.status
  });

  // Soft delete – mark as deleted instead of removing from DB
  Post.updateOne(
  {
    _id: req.params._id,
    creator: req.userData.userId,
    isDeleted: { $ne: true },
    status: { $ne: "deleted" },   // only non-deleted posts
  },
  {
    $set: {
      isDeleted: true,
      status: "deleted",
      deletedAt: new Date(),
    },
  }
)
  .then((result) => {
    logger.info("Delete operation result", { result });

    const modified =
      result.modifiedCount > 0 || result.nModified > 0;

    if (modified) {
      return res.status(200).json({ message: "Delete Successful!" });
    } else {
      return res.status(404).json({
        message: "Post not found or user not authorized to delete",
      });
    }
  })
  .catch((error) => {
    logger.error("Error during the Delete operation in deletePost", {
      error,
    });
    res.status(500).json({ message: "Delete Failed!" });
  });
};


/**
 * SEARCH
 * ---------------------------------------------------------------------------
 * GET /api/posts/search
 *
 * Lightweight search endpoint with multiple optional filters:
 *  - city (case-insensitive)
 *  - bedroom
 *  - bathroom
 *  - furnished (true/false)
 *  - parkingAvailable (true/false)
 *  - price (max price)
 *
 * Soft delete enforced (isDeleted != true).
 */
exports.listPostSearch = async (req, res, next) => {
  try {
    const { city, bedroom, bathroom, furnished, parkingAvailable, price } =
      req.query;

    const query = {};

    // Soft delete – only search active posts
    query.isDeleted = { $ne: true };

    // City (case-insensitive)
    if (city) query.city = { $regex: new RegExp(city, "i") };
    if (bedroom) query.bedroom = bedroom;
    if (bathroom) query.bathroom = bathroom;
    if (furnished) query.furnished = furnished === "true";
    if (parkingAvailable) query.parkingAvailable = parkingAvailable === "true";
    if (price) query.price = { $lte: parseInt(price) };

    logger.info("listPostSearch query", { query, rawQuery: req.query });

    const results = await Post.find(query);

    logger.info("listPostSearch results count", { count: results.length });

    res.status(200).json(results);
  } catch (error) {
    logger.error("listPostSearch error", { error });
    res.status(500).json({ error: "Internal Server Error" });
  }
};
