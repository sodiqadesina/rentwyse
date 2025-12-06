const Post = require("../models/post");
const mongoose = require("mongoose");


//create
exports.newPost = (req, res, next) => {
  // We already imported the multer middle-ware in the route
  const url = req.protocol + "://" + req.get("host");

  const images = req.files.map((file) => url + "/images/" + file.filename);

  console.log("Rental Property Images " + images);

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

  console.log(req.body);
  console.log(post);

  post
    .save()
    .then((result) => {
      res.status(201).json({
        post: {
          _id: result._id,
          title: result.title,
          description: result.description,
          imagePath: result.imagePaths, // returning all image paths
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
      res.status(500).json({ message: "Creating Post failed" });
    });
};

//Read
exports.listPost = (req, res, next) => {
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;
  const postQuery = Post.find();

  // Constructing the filter query
  const filterQuery = {};

  // Soft delete – always exclude deleted posts
  filterQuery.isDeleted = { $ne: true }; // only fetch posts that are not soft-deleted

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

  console.log(filterQuery);

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
      res.status(200).json({
        message: "Posts fetched successfully!",
        posts: fetchedPost,
        maxPost: count,
      });
    })
    .catch((error) => {
      res
        .status(500)
        .json({ message: "Fetching posts failed!!", error: error.message });
    });
};

//Read
exports.listPostByUserId = (req, res, next) => {
  const userId = req.userData.userId; // Get user ID from request data
  const pageSize = +req.query.pagesize;
  const currentPage = +req.query.page;

  // Check if userId is valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  // Soft delete – filter by creator AND not deleted
  const filter = { creator: userId, isDeleted: { $ne: true } };

  const postQuery = Post.find(filter); // Filtering the  posts by user ID
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
      res.status(200).json({
        message: "Posts fetched successfully!",
        posts: fetchedPosts,
        maxPosts: count,
      });
    })
    .catch((error) => {
      res
        .status(500)
        .json({ message: "Fetching posts failed: " + error.message });
    });
};

//Read
exports.listPostById = (req, res, next) => {
  // Soft delete – don’t return deleted posts
  Post.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
    .then((post) => {
      console.log(req.params.id);
      if (post) {
        res.status(200).json(post);
      } else {
        res.status(404).json({ message: "Post not Found" });
      }
    })
    .catch((error) => {
      console.error("Error during the search operation:", error);
      res.status(500).json({ message: "Fetching Post failed" });
    });
};

//Update
exports.editPost = (req, res, next) => {
  const postId = req.params.id;
  let imagePath = req.body.imagePath;

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

  // Only update imagePath if new images were uploaded
  if (imagePath) {
    postUpdateData.imagePath = imagePath;
  }

  console.log(req, postUpdateData, req.userData.creator);

  // Optional: prevent editing soft-deleted posts
  Post.updateOne(
    { _id: postId, creator: req.userData.userId, isDeleted: { $ne: true } }, // do not edit deleted posts
    postUpdateData
  )
    .then((result) => {
      console.log("Update result = ", result);
      if (result.modifiedCount > 0 || result.nModified > 0) {
        res.status(200).json({ message: "Update Successful!" });
      } else {
        res.status(200).json({ message: "No Change was made" });
      }
    })
    .catch((error) => {
      console.error("Error during the update operation:", error);
      res.status(500).json({ message: "Update Failed!" });
    });
};

//Delete
exports.deletePost = (req, res, next) => {
  console.log(req.params._id);

  // Soft delete – mark as deleted instead of removing from DB
  Post.updateOne(
    { _id: req.params._id, creator: req.userData.userId, isDeleted: { $ne: true } }, // only active posts
    { $set: { isDeleted: true, deletedAt: new Date() } } // mark as deleted
  )
    .then((result) => {
      console.log(result);

      // Handle both Mongoose 5 and 6 shapes
      const modified =
        result.modifiedCount > 0 ||
        result.nModified > 0; // fallback for older versions

      if (modified) {
        res.status(200).json({ message: "Delete Successful!" }); // keep same response text
      } else {
        res
          .status(404)
          .json({ message: "Post not found or user not authorized to delete" });
      }
    })
    .catch((error) => {
      console.error("Error during the Delete operation:", error);
      res.status(500).json({ message: "Delete Failed!" });
    });
};

//Search
exports.listPostSearch = async (req, res, next) => {
  try {
    const { city, bedroom, bathroom, furnished, parkingAvailable, price } =
      req.query;

    const query = {};

    // Soft delete – only search active posts
    query.isDeleted = { $ne: true };

    // if (city) query.city = city;
    //below code is for the search string case-insensitive
    if (city) query.city = { $regex: new RegExp(city, "i") };
    if (bedroom) query.bedroom = bedroom;
    if (bathroom) query.bathroom = bathroom;
    if (furnished) query.furnished = furnished === "true";
    if (parkingAvailable) query.parkingAvailable = parkingAvailable === "true";
    if (price) query.price = { $lte: parseInt(price) };

    const results = await Post.find(query);
    res.status(200).json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

