/**
 * Admin Controller Tests
 *
 * These tests validate core admin endpoints:
 *  - getUsers
 *  - updateUserStatus
 *  - updateUserRole
 *  - getPosts
 *  - getSettings
 *  - updateSettings
 *  - getAuditLogs
 *
 * All model interactions are mocked so tests are fast and isolated.
 */

const mongoose = require("mongoose");

// --- Jest Mocks for Mongoose Models ---------------------------------------

// We mock the models BEFORE requiring the controller so that the controller
// picks up the mocked versions.

jest.mock("../models/user", () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../models/post", () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  aggregate: jest.fn(),
}));

jest.mock("../models/conversation", () => ({
  aggregate: jest.fn(),
}));

jest.mock("../models/message", () => ({}));

jest.mock("../models/kyc", () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../models/settings", () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../models/auditLog", () => ({
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

// --- Require Controller & Mocked Models -----------------------------------

const adminController = require("./adminController");
const User = require("../models/user");
const Post = require("../models/post");
const Settings = require("../models/settings");
const AuditLog = require("../models/auditLog");

// --- Helper: Fresh req/res for each test ----------------------------------

const createMockRes = () => {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AdminController - getUsers", () => {
  it("should return paginated users and total count", async () => {
    const mockUsers = [
      {
        _id: "user1",
        username: "testuser1",
        email: "user1@example.com",
      },
      {
        _id: "user2",
        username: "testuser2",
        email: "user2@example.com",
      },
    ];

    // Mock the chained query: find().sort().skip().limit().select()
    const mockUserQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue(mockUsers),
    };
    User.find.mockReturnValue(mockUserQuery);
    User.countDocuments.mockResolvedValue(2);

    const req = {
      query: {
        page: "1",
        pageSize: "10",
        status: "active",
      },
      user: { _id: "admin123" },
    };
    const res = createMockRes();

    await adminController.getUsers(req, res);

    expect(User.find).toHaveBeenCalledWith({ status: "active" });
    expect(User.countDocuments).toHaveBeenCalledWith({ status: "active" });

    expect(res.json).toHaveBeenCalledWith({
      users: mockUsers,
      total: 2,
      page: 1,
      pageSize: 10,
    });
  });
});

describe("AdminController - updateUserStatus", () => {
  it("should update user status when valid and return updated user", async () => {
    const updatedUser = {
      _id: "user123",
      username: "john",
      status: "banned",
    };

    // Mock chained call: User.findByIdAndUpdate(...).select(...)
    const mockSelect = jest.fn().mockResolvedValue(updatedUser);
    User.findByIdAndUpdate.mockReturnValue({ select: mockSelect });

    const req = {
      params: { id: "user123" },
      body: { status: "banned" },
      user: { _id: "admin123" },
    };
    const res = createMockRes();

    await adminController.updateUserStatus(req, res);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "user123",
      { status: "banned" },
      { new: true }
    );
    expect(mockSelect).toHaveBeenCalledWith("-password -emailToken");

    // Audit log should be created
    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        admin: "admin123",
        action: "UPDATE_USER_STATUS",
        targetType: "user",
        targetId: "user123",
        details: { status: "banned" },
      })
    );

    // Controller doesn't explicitly set res.status on success → 200 by default
    expect(res.json).toHaveBeenCalledWith({
      message: "User status updated.",
      user: updatedUser,
    });
  });

  it("should return 400 for invalid status value", async () => {
    const req = {
      params: { id: "user123" },
      body: { status: "invalid-status" },
      user: { _id: "admin123" },
    };
    const res = createMockRes();

    await adminController.updateUserStatus(req, res);

    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid status." });
  });

  it("should return 404 if user is not found", async () => {
    // select() resolves to null → not found
    const mockSelect = jest.fn().mockResolvedValue(null);
    User.findByIdAndUpdate.mockReturnValue({ select: mockSelect });

    const req = {
      params: { id: "missing-user" },
      body: { status: "active" },
      user: { _id: "admin123" },
    };
    const res = createMockRes();

    await adminController.updateUserStatus(req, res);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "missing-user",
      { status: "active" },
      { new: true }
    );
    expect(mockSelect).toHaveBeenCalledWith("-password -emailToken");

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found." });
  });
});

describe("AdminController - updateUserRole", () => {
  it("should update user role when valid and log audit", async () => {
    const updatedUser = {
      _id: "user123",
      username: "john",
      role: "admin",
    };

    const mockSelect = jest.fn().mockResolvedValue(updatedUser);
    User.findByIdAndUpdate.mockReturnValue({ select: mockSelect });

    const req = {
      params: { id: "user123" },
      body: { role: "admin" },
      user: { _id: "admin123" },
    };
    const res = createMockRes();

    await adminController.updateUserRole(req, res);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "user123",
      { role: "admin" },
      { new: true }
    );
    expect(mockSelect).toHaveBeenCalledWith("-password -emailToken");

    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        admin: "admin123",
        action: "UPDATE_USER_ROLE",
        targetType: "user",
        targetId: "user123",
        details: { role: "admin" },
      })
    );

    expect(res.json).toHaveBeenCalledWith({
      message: "User role updated.",
      user: updatedUser,
    });
  });

  it("should return 400 for invalid role", async () => {
    const req = {
      params: { id: "user123" },
      body: { role: "super-admin" },
      user: { _id: "admin123" },
    };
    const res = createMockRes();

    await adminController.updateUserRole(req, res);

    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid role." });
  });

  it("should return 404 if user is not found", async () => {
    const mockSelect = jest.fn().mockResolvedValue(null);
    User.findByIdAndUpdate.mockReturnValue({ select: mockSelect });

    const req = {
      params: { id: "missing-user" },
      body: { role: "user" },
      user: { _id: "admin123" },
    };
    const res = createMockRes();

    await adminController.updateUserRole(req, res);

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      "missing-user",
      { role: "user" },
      { new: true }
    );
    expect(mockSelect).toHaveBeenCalledWith("-password -emailToken");

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "User not found." });
  });
});

describe("AdminController - getPosts", () => {
  it("should return paginated posts and total count", async () => {
    const mockPosts = [
      {
        _id: "post1",
        title: "Listing 1",
        city: "Waterloo",
        status: "active",
      },
      {
        _id: "post2",
        title: "Listing 2",
        city: "Kitchener",
        status: "active",
      },
    ];

    const mockPostQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue(mockPosts),
    };
    Post.find.mockReturnValue(mockPostQuery);
    Post.countDocuments.mockResolvedValue(2);

    const req = {
      query: { page: "1", pageSize: "10", status: "active" },
      user: { _id: "admin123" },
    };
    const res = createMockRes();

    await adminController.getPosts(req, res);

    expect(Post.find).toHaveBeenCalledWith({ status: "active" });
    expect(Post.countDocuments).toHaveBeenCalledWith({ status: "active" });

    expect(res.json).toHaveBeenCalledWith({
      posts: mockPosts,
      total: 2,
      page: 1,
      pageSize: 10,
    });
  });
});

describe("AdminController - getSettings", () => {
  it("should create default settings if none exist", async () => {
    const createdSettings = {
      _id: "settings1",
      serviceCharge: 0,
      salesTax: 0,
      currency: "CAD",
    };

    Settings.findOne.mockResolvedValue(null);
    Settings.create.mockResolvedValue(createdSettings);

    const req = {
      user: { _id: "admin123" },
    };
    const res = createMockRes();

    await adminController.getSettings(req, res);

    expect(Settings.findOne).toHaveBeenCalledWith({});
    expect(Settings.create).toHaveBeenCalledWith({
      serviceCharge: 0,
      salesTax: 0,
      currency: "CAD",
    });

    expect(res.json).toHaveBeenCalledWith(createdSettings);
  });

  it("should return existing settings if they exist", async () => {
    const existingSettings = {
      _id: "settings1",
      serviceCharge: 10,
      salesTax: 13,
      currency: "CAD",
    };

    Settings.findOne.mockResolvedValue(existingSettings);

    const req = {
      user: { _id: "admin123" },
    };
    const res = createMockRes();

    await adminController.getSettings(req, res);

    expect(Settings.findOne).toHaveBeenCalledWith({});
    expect(Settings.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(existingSettings);
  });
});

describe("AdminController - updateSettings", () => {
  it("should update existing settings and log audit", async () => {
    const settingsDoc = {
      _id: "settings1",
      serviceCharge: 5,
      salesTax: 5,
      currency: "CAD",
      save: jest.fn().mockResolvedValue(true),
    };

    Settings.findOne.mockResolvedValue(settingsDoc);

    const req = {
      user: { _id: "admin123" },
      body: {
        serviceCharge: 10,
        salesTax: 13,
        currency: "CAD",
      },
    };
    const res = createMockRes();

    await adminController.updateSettings(req, res);

    expect(Settings.findOne).toHaveBeenCalledWith({});
    // After Object.assign, the doc should have new values:
    expect(settingsDoc.serviceCharge).toBe(10);
    expect(settingsDoc.salesTax).toBe(13);
    expect(settingsDoc.currency).toBe("CAD");
    expect(settingsDoc.save).toHaveBeenCalled();

    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        admin: "admin123",
        action: "UPDATE_SETTINGS",
        targetType: "settings",
        targetId: "settings1",
        details: {
          serviceCharge: 10,
          salesTax: 13,
          currency: "CAD",
        },
      })
    );

    expect(res.json).toHaveBeenCalledWith({
      message: "Settings updated.",
      settings: settingsDoc,
    });
  });

  it("should create settings if none exist and log audit", async () => {
    const createdSettings = {
      _id: "settings1",
      serviceCharge: 10,
      salesTax: 13,
      currency: "CAD",
    };

    Settings.findOne.mockResolvedValue(null);
    Settings.create.mockResolvedValue(createdSettings);

    const req = {
      user: { _id: "admin123" },
      body: {
        serviceCharge: 10,
        salesTax: 13,
        currency: "CAD",
      },
    };
    const res = createMockRes();

    await adminController.updateSettings(req, res);

    expect(Settings.findOne).toHaveBeenCalledWith({});
    expect(Settings.create).toHaveBeenCalledWith({
      serviceCharge: 10,
      salesTax: 13,
      currency: "CAD",
    });

    expect(AuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        admin: "admin123",
        action: "UPDATE_SETTINGS",
        targetType: "settings",
        targetId: "settings1",
        details: {
          serviceCharge: 10,
          salesTax: 13,
          currency: "CAD",
        },
      })
    );

    expect(res.json).toHaveBeenCalledWith({
      message: "Settings updated.",
      settings: createdSettings,
    });
  });
});

describe("AdminController - getAuditLogs", () => {
  it("should return paginated audit logs and total count", async () => {
    const mockLogs = [
      {
        _id: "log1",
        action: "UPDATE_USER_STATUS",
        admin: { _id: "admin123", username: "admin" },
      },
    ];

    const mockAuditQuery = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockResolvedValue(mockLogs),
    };

    AuditLog.find.mockReturnValue(mockAuditQuery);
    AuditLog.countDocuments.mockResolvedValue(1);

    const req = {
      query: {
        page: "1",
        pageSize: "10",
        action: "UPDATE_USER_STATUS",
      },
      user: { _id: "admin123" },
    };
    const res = createMockRes();

    await adminController.getAuditLogs(req, res);

    expect(AuditLog.find).toHaveBeenCalledWith({
      action: "UPDATE_USER_STATUS",
    });
    expect(AuditLog.countDocuments).toHaveBeenCalledWith({
      action: "UPDATE_USER_STATUS",
    });

    expect(res.json).toHaveBeenCalledWith({
      logs: mockLogs,
      total: 1,
      page: 1,
      pageSize: 10,
    });
  });
});
