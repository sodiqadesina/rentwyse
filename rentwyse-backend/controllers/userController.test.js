/**
 * User Controller Tests
 *
 * Tests core flows:
 *  - createUser (signup)
 *  - verifyEmail
 *  - getUserDetails
 *  - updateUser
 *  - userLogin
 *  - changePassword
 */

jest.mock("bcrypt", () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(),
}));

jest.mock("crypto", () => ({
  randomBytes: jest.fn(),
}));

jest.mock("../Services/emailService", () => ({
  sendVerificationEmail: jest.fn(),
}));

// Mock User model as a constructor with a save() instance method,
// plus static methods like findOne, findById.
jest.mock("../models/user", () => {
  // Constructor mock: copy passed-in document fields to `this`
  const mockFn = jest.fn(function (doc) {
    if (doc) {
      Object.assign(this, doc);
    }
  });

  mockFn.prototype.save = jest.fn();

  mockFn.findOne = jest.fn();
  mockFn.findById = jest.fn();

  return mockFn;
});

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("../Services/emailService");
const User = require("../models/user");
const userController = require("./userController");

// Common mock response
const createMockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  send: jest.fn(),
  headersSent: false,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("UserController - createUser", () => {
  it("should create a new user, return 201, and send verification email", async () => {
    const req = {
      body: {
        username: "testuser",
        password: "plainpw",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        address: "123 St",
        city: "Waterloo",
        province: "ON",
        zipcode: "N2L",
        country: "Canada",
        phone: "1234567890",
      },
    };
    const res = createMockRes();
    const next = jest.fn();

    // bcrypt.hash → hashed password
    bcrypt.hash.mockResolvedValue("hashedpw");

    // crypto.randomBytes → verification token buffer
    const tokenBuffer = Buffer.from("verificationtoken");
    crypto.randomBytes.mockReturnValue(tokenBuffer);

    // Instance save() → created user
    const mockSavedUser = {
      _id: "user123",
      email: "test@example.com",
    };
    User.prototype.save.mockResolvedValue(mockSavedUser);

    // email service
    emailService.sendVerificationEmail.mockResolvedValue();

    await userController.createUser(req, res, next);

    // User constructor called with expected payload
    expect(User).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "testuser",
        email: "test@example.com",
        password: "hashedpw",
        city: "Waterloo",
        province: "ON",
        country: "Canada",
      })
    );

    // Response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "user created Successfully!",
      result: mockSavedUser,
    });

    // Verification email (hex-encoded token)
    const expectedTokenHex = tokenBuffer.toString("hex");
    expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
      "test@example.com",
      expectedTokenHex
    );
  });

  it("should return 400 for duplicate key error (e.g., email already exists)", async () => {
    const req = {
      body: {
        username: "testuser",
        password: "plainpw",
        email: "duplicate@example.com",
      },
    };
    const res = createMockRes();
    const next = jest.fn();

    bcrypt.hash.mockResolvedValue("hashedpw");
    crypto.randomBytes.mockReturnValue(Buffer.from("sometoken"));

    const dupError = {
      code: 11000,
      keyValue: { email: "duplicate@example.com" },
    };
    User.prototype.save.mockRejectedValue(dupError);

    await userController.createUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Email already exists",
      field: "email",
    });

    expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
  });

  it("should return 500 on generic error", async () => {
    const req = {
      body: {
        username: "testuser",
        password: "plainpw",
        email: "test@example.com",
      },
    };
    const res = createMockRes();
    const next = jest.fn();

    bcrypt.hash.mockResolvedValue("hashedpw");
    crypto.randomBytes.mockReturnValue(Buffer.from("sometoken"));

    const genericError = new Error("DB failure");
    User.prototype.save.mockRejectedValue(genericError);

    await userController.createUser(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid Authentication Credentials !!!!",
    });
  });
});

describe("UserController - verifyEmail", () => {
  it("should verify email when token is valid and not yet verified", async () => {
    const req = {
      query: { token: "validtoken" },
    };
    const res = createMockRes();

    const mockUser = {
      _id: "user123",
      email: "test@example.com",
      isEmailVerified: false,
      emailToken: "validtoken",
      save: jest.fn().mockResolvedValue(true),
    };

    User.findOne.mockResolvedValue(mockUser);

    await userController.verifyEmail(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ emailToken: "validtoken" });
    expect(mockUser.isEmailVerified).toBe(true);
    expect(mockUser.emailToken).toBeNull();
    expect(mockUser.save).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith("email verification succesfull");
  });

  it("should return 400 for invalid or expired token", async () => {
    const req = { query: { token: "invalidtoken" } };
    const res = createMockRes();

    User.findOne.mockResolvedValue(null);

    await userController.verifyEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("This link is invalid or has expired.");
  });

  it("should return 400 if email already verified", async () => {
    const req = { query: { token: "validtoken" } };
    const res = createMockRes();

    const mockUser = {
      _id: "user123",
      email: "test@example.com",
      isEmailVerified: true,
    };

    User.findOne.mockResolvedValue(mockUser);

    await userController.verifyEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      "This email has already been verified. You can now login."
    );
  });
});

describe("UserController - getUserDetails", () => {
  it("should return user details when user exists", async () => {
    const req = { params: { id: "user123" } };
    const res = createMockRes();

    const mockUser = {
      _id: "user123",
      username: "testuser",
      email: "test@example.com",
    };

    User.findById.mockResolvedValue(mockUser);

    await userController.getUserDetails(req, res);

    expect(User.findById).toHaveBeenCalledWith("user123", "-password -emailToken");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ user: mockUser });
  });

  it("should return 404 if user not found", async () => {
    const req = { params: { id: "missing" } };
    const res = createMockRes();

    User.findById.mockResolvedValue(null);

    await userController.getUserDetails(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });
});

describe("UserController - updateUser", () => {
  it("should update user profile and return 200", async () => {
    const req = {
      params: { id: "user123" },
      body: {
        firstName: "New",
        lastName: "Name",
        city: "Kitchener",
        address: "456 St",
        zipcode: "N2K",
        province: "ON",
        country: "Canada",
        phone: "9876543210",
      },
    };
    const res = createMockRes();

    const mockUser = {
      _id: "user123",
      save: jest.fn().mockResolvedValue(true),
    };

    User.findById.mockResolvedValue(mockUser);

    await userController.updateUser(req, res);

    expect(User.findById).toHaveBeenCalledWith("user123");
    expect(mockUser.firstName).toBe("New");
    expect(mockUser.lastName).toBe("Name");
    expect(mockUser.city).toBe("Kitchener");
    expect(mockUser.address).toBe("456 St");
    expect(mockUser.zipcode).toBe("N2K");
    expect(mockUser.province).toBe("ON");
    expect(mockUser.country).toBe("Canada");
    expect(mockUser.phone).toBe("9876543210");
    expect(mockUser.save).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "User updated" });
  });

  it("should return 404 if user not found", async () => {
    const req = { params: { id: "missing" }, body: {} };
    const res = createMockRes();

    User.findById.mockResolvedValue(null);

    await userController.updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });
});

describe("UserController - userLogin", () => {
  it("should generate JWT and return token for authenticated user", async () => {
    const req = {
      user: {
        _id: "user123",
        username: "testuser",
        role: "user",
      },
    };
    const res = createMockRes();
    const next = jest.fn();

    jwt.sign.mockReturnValue("jwt-token-123");

    await userController.userLogin(req, res, next);

    expect(jwt.sign).toHaveBeenCalledWith(
      { username: "testuser", userId: "user123", role: "user" },
      process.env.JWT_KEY,
      { expiresIn: "1h" }
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      token: "jwt-token-123",
      expiresIn: 3600,
      userId: "user123",
      role: "user",
    });
  });

  it("should return 401 if req.user is not set", async () => {
    const req = { user: null };
    const res = createMockRes();
    const next = jest.fn();

    await userController.userLogin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid authentication credentials",
    });
  });

  it("should return 401 on error if headers not sent", async () => {
    const req = {
      user: {
        _id: "user123",
        username: "testuser",
        role: "user",
      },
    };
    const res = createMockRes();
    const next = jest.fn();

    // Force jwt.sign to throw
    jwt.sign.mockImplementation(() => {
      throw new Error("sign error");
    });

    await userController.userLogin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid authentication credentials",
    });
  });
});

describe("UserController - changePassword", () => {
  it("should change password when current password is correct", async () => {
    const req = {
      params: { id: "user123" },
      body: {
        currentPassword: "oldpw",
        newPassword: "newpw",
      },
    };
    const res = createMockRes();
    const next = jest.fn();

    const mockUser = {
      _id: "user123",
      password: "hashed-old",
      save: jest.fn().mockResolvedValue(true),
    };

    User.findById.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(true); // current password ok
    bcrypt.hash.mockResolvedValue("hashed-new");

    await userController.changePassword(req, res, next);

    expect(User.findById).toHaveBeenCalledWith("user123");
    expect(bcrypt.compare).toHaveBeenCalledWith("oldpw", "hashed-old");
    expect(bcrypt.hash).toHaveBeenCalledWith("newpw", 12);
    expect(mockUser.password).toBe("hashed-new");
    expect(mockUser.save).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Password updated successfully",
    });
  });

  it("should return 404 if user not found", async () => {
    const req = {
      params: { id: "missing" },
      body: {
        currentPassword: "oldpw",
        newPassword: "newpw",
      },
    };
    const res = createMockRes();
    const next = jest.fn();

    User.findById.mockResolvedValue(null);

    await userController.changePassword(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
  });

  it("should return 401 if current password is incorrect", async () => {
    const req = {
      params: { id: "user123" },
      body: {
        currentPassword: "wrongpw",
        newPassword: "newpw",
      },
    };
    const res = createMockRes();
    const next = jest.fn();

    const mockUser = {
      _id: "user123",
      password: "hashed-old",
      save: jest.fn(),
    };

    User.findById.mockResolvedValue(mockUser);
    bcrypt.compare.mockResolvedValue(false); // wrong current password

    await userController.changePassword(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Current password is incorrect",
    });
    expect(mockUser.save).not.toHaveBeenCalled();
  });
});
