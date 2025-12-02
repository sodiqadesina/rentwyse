const Post = require("../models/post");
const postsController = require("./PostsController");

// Mock the Post model
jest.mock("../models/post", () => {
  return jest.fn().mockImplementation(() => {
    return {
      save: jest.fn().mockResolvedValue({
        _id: "123",
        title: "Test Post",
        description: "Test Description",
        imagePath: ["test.jpg"],
        creator: "user123",
        // Add other fields here as per your schema
      }),
    };
  });
});

// test for delete post fuc in the Post Controller
describe("deletePost", () => {
  //Happy test case
  it("should delete a post and return success message", async () => {
    const mockDeleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
    Post.deleteOne = mockDeleteOne;

    const req = {
      params: { _id: "123" },
      userData: { userId: "user123" },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await postsController.deletePost(req, res);

    expect(mockDeleteOne).toHaveBeenCalledWith({
      _id: "123",
      creator: "user123",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Delete Successful!" });
  });

  //Failure test case
  it("should return an error message if the post does not exist or cannot be deleted", async () => {
    // Mocking Post.deleteOne to simulate no post being deleted (e.g., post doesn't exist)
    const mockDeleteOne = jest.fn().mockResolvedValue({ deletedCount: 0 });
    Post.deleteOne = mockDeleteOne;

    const req = {
      params: { _id: "non-existent-id" },
      userData: { userId: "user123" },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await postsController.deletePost(req, res);

    // Assert that the function is called with the expected parameters
    expect(mockDeleteOne).toHaveBeenCalledWith({
      _id: "non-existent-id",
      creator: "user123",
    });

    // Assert that the appropriate response is sent back
    expect(res.status).toHaveBeenCalledWith(404); // or 401 if not authorized
    expect(res.json).toHaveBeenCalledWith({
      message: "Post not found or user not authorized to delete",
    });
  });
});

//test for creating a post fuc in the Post Controller
describe("newPost", () => {
  it("should create a new post and return success message", async () => {
    const req = {
      body: {
        title: "Test Post",
        description: "Test Description",
      },
      userData: { userId: "user123" },
      files: [{ filename: "test.jpg" }],
      protocol: "http",
      get: jest.fn().mockReturnValue("localhost:3000"),
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await postsController.newPost(req, res);

    expect(Post).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Post added successfully",
        post: expect.objectContaining({
          _id: expect.any(String),
          title: "Test Post",
          description: "Test Description",
          // Validate other fields as necessary
        }),
      })
    );
  });

  // Test case for error when userId is not present
  it("should throw an error if userId is not present", async () => {
    const req = {
      body: {
        title: "Test Post Without UserId",
        description: "Test Description",
      },
      // userData is missing or does not have userId
      userData: {},
      files: [{ filename: "test.jpg" }],
      protocol: "http",
      get: jest.fn().mockReturnValue("localhost:3000"),
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Assert that the status and json methods are not called since an exception is expected
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

// Mock data for a single post
const mockPost = {
  _id: "123",
  title: "Test Post",
  description: "Test Description",
  creator: "user123",
  // Add other fields from your schema as necessary
};

// Mocking  Post.findById
Post.findById = jest.fn().mockResolvedValue(mockPost);

//test to list a Post by id fuc in the Post Controller
describe("listPostById", () => {
  it("should fetch a post by ID and return it", async () => {
    const req = {
      params: { id: "123" },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await postsController.listPostById(req, res);

    expect(Post.findById).toHaveBeenCalledWith("123");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockPost);
  });

  it("should return a 404 if the post is not found", async () => {
    // Setup Post.findById to return null for this test
    Post.findById.mockResolvedValue(null);

    const req = {
      params: { id: "not-found-id" },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await postsController.listPostById(req, res);

    expect(Post.findById).toHaveBeenCalledWith("not-found-id");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Post not Found" });
  });
});
