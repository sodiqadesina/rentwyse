const express = require("express");
const router = express.Router();
const PostController = require("../controllers/PostsController");
const Post = require("../models/post");
const checkAuth = require("../middleware/check-auth");
const extractFile = require("../middleware/file");

//Adding a Post
router.post("", checkAuth, extractFile, PostController.newPost);

//fetching all Posts
router.get("", PostController.listPost);

// example
// http://localhost:3000/api/search-posts?city=Waterloo
//http://localhost:3000/api/search-posts?bedroom=2&furnished=true&price=1000
//search-post
router.get("/search-posts", PostController.listPostSearch);

// // Fetching post by post Id
router.get("/:id", PostController.listPostById);

// // Fetching post by user Id
router.get("/user-post/:userId", checkAuth, PostController.listPostByUserId);

// //Editing Post
router.put("/:id", checkAuth, extractFile, PostController.editPost);

// //Deleting Post
router.delete("/:_id", checkAuth, PostController.deletePost);

module.exports = router;
