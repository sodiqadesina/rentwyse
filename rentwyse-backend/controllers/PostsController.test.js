/**
 * Posts Controller Tests
 *
 * Covers:
 *  - deletePost (soft delete via updateOne)
 *  - newPost (create listing)
 *  - listPostById (respect soft delete)
 *
 * Post model is mocked as:
 *  - a constructor for newPost (new Post(...))
 *  - plus static methods: updateOne, findOne
 */

const Post = require("../models/post");
const postsController = require("./PostsController");

// --- Mock the Post model (constructor + static methods) --------------------

// IMPORTANT: jest.mock must be above the require in real file order.
// In your actual file, move this `jest.mock` to the top of the file if needed.
jest.mock("../models/post", () => {
  // Mock constructor: new Post(doc)
  const MockPostConstructor = jest.fn().mockImplementation((doc) => {
    return {
      ...doc,
      // save() simulates Mongoose .save(), returning a persisted post
      save: jest.fn().mockResolvedValue({
        _id: "123",
        title: doc.title,
        description: doc.description,
        imagePath: doc.imagePath || [],
        creator: doc.creator,
        // Add other fields as needed
      }),
    };
  });

  // Attach static methods that controller uses:
  MockPostConstructor.updateOne = jest.fn();
  MockPostConstructor.findOne = jest.fn();

  return MockPostConstructor;
});

// --- Common res mock -------------------------------------------------------

const createMockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

beforeEach(() => {
  jest.clearAllMocks();
});

//
// DELETE POST (SOFT DELETE)
//

describe("PostController - deletePost", () => {
  it("should soft delete a post and return success message", async () => {
    // Simulate successful soft delete (1 document updated)
    Post.updateOne.mockResolvedValue({
      acknowledged: true,
      matchedCount: 1,
      modifiedCount: 1,
    });

    const req = {
      params: { _id: "123" },
      userData: { userId: "user123" },
    };
    const res = createMockRes();

    await postsController.deletePost(req, res);

    // Ensure we hit correct query & update
    expect(Post.updateOne).toHaveBeenCalledWith(
      {
        _id: "123",
        creator: "user123",
        isDeleted: { $ne: true },
        status: { $ne: "deleted" },       // <- new condition
      },
      {
        $set: expect.objectContaining({
          isDeleted: true,
          status: "deleted",
          deletedAt: expect.any(Date),
        }),
      }
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Delete Successful!" });
  });

  it("should return 404 if the post does not exist or user is not authorized", async () => {
    // Simulate no document updated (e.g. not found or already deleted)
    Post.updateOne.mockResolvedValue({
      acknowledged: true,
      matchedCount: 0,
      modifiedCount: 0,
    });

    const req = {
      params: { _id: "non-existent-id" },
      userData: { userId: "user123" },
    };
    const res = createMockRes();

    await postsController.deletePost(req, res);

    expect(Post.updateOne).toHaveBeenCalledWith(
      {
        _id: "non-existent-id",
        creator: "user123",
        isDeleted: { $ne: true },
        status: { $ne: "deleted" },       // <- new condition
      },
      expect.any(Object) // update document (we don't care exact shape here)
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Post not found or user not authorized to delete",
    });
  });
});

//
// NEW POST
//

describe("PostController - newPost", () => {
  it("should create a new post and return success message", async () => {
    const req = {
      body: {
        title: "Test Post",
        description: "Test Description",
        city: "Waterloo",
      },
      userData: { userId: "user123" },
      files: [{ filename: "test.jpg" }],
      protocol: "http",
      get: jest.fn().mockReturnValue("localhost:3000"), // req.get("host")
    };

    const res = createMockRes();

    await postsController.newPost(req, res);

    // Ensure constructor was called to create the Post document
    expect(Post).toHaveBeenCalledTimes(1);
    const postArgs = Post.mock.calls[0][0];

    expect(postArgs).toEqual(
      expect.objectContaining({
        title: "Test Post",
        description: "Test Description",
        creator: "user123",
        // imagePath & other fields are derived in controller
      })
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Post added successfully",
        post: expect.objectContaining({
          _id: "123",
          title: "Test Post",
          description: "Test Description",
        }),
      })
    );
  });

  it("should not proceed if userId is missing (throws or handles error)", async () => {
    const req = {
      body: {
        title: "Test Post Without UserId",
        description: "Test Description",
      },
      userData: {}, // missing userId
      files: [{ filename: "test.jpg" }],
      protocol: "http",
      get: jest.fn().mockReturnValue("localhost:3000"),
    };

    const res = createMockRes();

    // Depending on your implementation, newPost might throw or send 401/400.
    // We'll just assert that it doesn't send a successful response.
    try {
      await postsController.newPost(req, res);
    } catch (e) {
      // ignore – the test focuses on not returning success
    }

    expect(res.status).not.toHaveBeenCalledWith(201);
    // Optionally you could assert a 400/401 here if that's in your controller.
  });
});

//
// LIST POST BY ID (RESPECTS SOFT DELETE)
//

describe("PostController - listPostById", () => {
  const mockPost = {
    _id: "123",
    title: "Test Post",
    description: "Test Description",
    creator: "user123",
  };

  it("should fetch a non-deleted post by ID and return it", async () => {
    // Controller uses Post.findOne({ _id: postId, isDeleted: { $ne: true } })
    Post.findOne.mockResolvedValue(mockPost);

    const req = {
      params: { id: "123" },
    };
    const res = createMockRes();

    await postsController.listPostById(req, res);

    expect(Post.findOne).toHaveBeenCalledWith({
      _id: "123",
      isDeleted: { $ne: true },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockPost);
  });

  it("should return 404 if the post is not found or is soft deleted", async () => {
    // findOne returns null → not found
    Post.findOne.mockResolvedValue(null);

    const req = {
      params: { id: "not-found-id" },
    };
    const res = createMockRes();

    await postsController.listPostById(req, res);

    expect(Post.findOne).toHaveBeenCalledWith({
      _id: "not-found-id",
      isDeleted: { $ne: true },
    });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Post not Found" });
  });
});
