/**
 * Conversation Controller Tests
 *
 * These tests validate core conversation endpoints:
 *  - startOrGetConversation
 *  - getConversationMessages
 *  - getAllConversationsForUser
 *  - setViewingDate
 *  - uploadAgreementDocument
 *  - viewDocument
 *  - deleteDocument
 *
 * All I/O (Mongo, FS, sockets) is mocked so tests are fast and deterministic.
 */

// --- Jest Mocks for Dependencies ------------------------------------------

jest.mock("../models/conversation", () => {
  // Mongoose model used as both constructor (new Conversation()) and static methods
  const Model = jest.fn(); // constructor
  Model.findOne = jest.fn();
  Model.find = jest.fn();
  Model.findById = jest.fn();
  return Model;
});

jest.mock("../models/message", () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  count: jest.fn(),
}));

jest.mock("../models/post", () => ({
  findById: jest.fn(),
}));

jest.mock("../models/user", () => ({
  findById: jest.fn(),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

jest.mock("../socket", () => ({
  getUserSockets: jest.fn(),
  getIO: jest.fn(),
}));

const path = require("path");
const Conversation = require("../models/conversation");
const Message = require("../models/message");
const Post = require("../models/post");
const User = require("../models/user");
const fs = require("fs");
const socket = require("../socket");

// Require the controller AFTER mocks so it picks them up
const conversationController = require("./conversationController");

// --- Helper: fresh mock res object ----------------------------------------

const createMockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  sendFile: jest.fn(),
  send: jest.fn(),
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ConversationController - startOrGetConversation", () => {
  it("should return existing conversation if one already exists", async () => {
    const existingConversation = { _id: "conv123" };

    Conversation.findOne.mockResolvedValue(existingConversation);

    const req = {
      userData: { userId: "user1" },
      body: { recipientId: "user2", postId: "post1" },
    };
    const res = createMockRes();

    await conversationController.startOrGetConversation(req, res);

    expect(Conversation.findOne).toHaveBeenCalledWith({
      participants: { $all: ["user1", "user2"] },
      postId: "post1",
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Conversation fetched successfully",
      conversationId: "conv123",
      postId: "post1",
    });
  });

  it("should create a new conversation if none exists", async () => {
    Conversation.findOne.mockResolvedValue(null);

    const saveMock = jest.fn().mockResolvedValue(true);
    // When controller does: new Conversation({...})
    Conversation.mockImplementation(() => ({
      _id: "newConv123",
      save: saveMock,
    }));

    const req = {
      userData: { userId: "user1" },
      body: { recipientId: "user2", postId: "post1" },
    };
    const res = createMockRes();

    await conversationController.startOrGetConversation(req, res);

    expect(Conversation.findOne).toHaveBeenCalledWith({
      participants: { $all: ["user1", "user2"] },
      postId: "post1",
    });
    expect(Conversation).toHaveBeenCalledWith({
      participants: ["user1", "user2"],
      postId: "post1",
    });
    expect(saveMock).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Conversation fetched successfully",
      conversationId: "newConv123",
      postId: "post1",
    });
  });
});

describe("ConversationController - getConversationMessages", () => {
  it("should return messages for a conversation", async () => {
    const mockMessages = [
      {
        _id: "msg1",
        text: "Hello",
        sender: { _id: "user1", username: "User1" },
        receiver: { _id: "user2", username: "User2" },
      },
    ];

    const mockQuery = {
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockMessages),
    };
    Message.find.mockReturnValue(mockQuery);

    const req = {
      params: { conversationId: "conv123" },
    };
    const res = createMockRes();

    await conversationController.getConversationMessages(req, res);

    expect(Message.find).toHaveBeenCalledWith({ conversationId: "conv123" });
    expect(mockQuery.populate).toHaveBeenCalledTimes(2); // sender + receiver
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ messages: mockMessages });
  });
});

describe("ConversationController - getAllConversationsForUser", () => {
  it("should return conversations with lastMessage and unreadCount", async () => {
    const userId = "user1";

    // Mock conversations query: find().populate().populate().exec()
    const mockConversationDocs = [
      {
        _id: "conv1",
        participants: [userId, "user2"],
        postId: { _id: "post1", title: "Test Post" },
        viewingDate: null,
        toObject() {
          return {
            _id: this._id,
            participants: this.participants,
            postId: this.postId,
            viewingDate: this.viewingDate,
          };
        },
      },
    ];

    const mockConvQuery = {
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockConversationDocs),
    };
    Conversation.find.mockReturnValue(mockConvQuery);

    // Mock lastMessage: findOne().sort().populate().populate().exec()
    const mockLastMessage = {
      _id: "msg1",
      text: "Last message",
    };
    const mockLastMsgQuery = {
      sort: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(mockLastMessage),
    };
    Message.findOne.mockReturnValue(mockLastMsgQuery);

    // Mock unread count
    Message.count.mockResolvedValue(2);

    const req = {
      params: { userId },
    };
    const res = createMockRes();

    await conversationController.getAllConversationsForUser(req, res);

    expect(Conversation.find).toHaveBeenCalledWith({ participants: userId });
    expect(Message.findOne).toHaveBeenCalledWith({ conversationId: "conv1" });
    expect(Message.count).toHaveBeenCalledWith({
      conversationId: "conv1",
      receiver: userId,
      read: false,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: "conv1",
        lastMessage: mockLastMessage,
        unreadCount: 2,
        viewingDate: null,
      }),
    ]);
  });
});

describe("ConversationController - setViewingDate", () => {
  it("should set viewingDate when requester is post creator", async () => {
    const conversationId = "conv1";
    const userId = "creator1";
    const otherUserId = "user2";
    const viewingDate = "2025-12-31T10:00:00.000Z";

    const saveMock = jest.fn().mockResolvedValue(true);

    // Conversation.findById
    Conversation.findById.mockResolvedValue({
      _id: conversationId,
      postId: "post1",
      participants: [userId, otherUserId],
      save: saveMock,
    });

    // Post.findById
    Post.findById.mockResolvedValue({
      _id: "post1",
      creator: userId,
    });

    // emitNotificationToUser internals: User + socket
    User.findById.mockResolvedValue({ _id: userId, username: "Creator" });
    socket.getUserSockets.mockReturnValue({
      [otherUserId]: "socket123",
    });
    const emitMock = jest.fn();
    socket.getIO.mockReturnValue({
      to: jest.fn().mockReturnThis(),
      emit: emitMock,
    });

    const req = {
      params: { conversationId },
      body: { viewingDate },
      userData: { userId },
    };
    const res = createMockRes();

    await conversationController.setViewingDate(req, res);

    expect(Conversation.findById).toHaveBeenCalledWith(conversationId);
    expect(Post.findById).toHaveBeenCalledWith("post1");
    expect(saveMock).toHaveBeenCalled();

    // Ensure notification was attempted
    expect(socket.getUserSockets).toHaveBeenCalled();
    expect(socket.getIO).toHaveBeenCalled();
    expect(emitMock).toHaveBeenCalledWith("newMessage", expect.objectContaining({
      conversationId,
      message: `Viewing date set for ${viewingDate}`,
      sender: userId,
      receiver: otherUserId,
    }));

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Viewing date set successfully",
        viewingDate,
      })
    );
  });

  it("should return 400 for invalid viewing date", async () => {
    const conversationId = "conv1";

    Conversation.findById.mockResolvedValue({
      _id: conversationId,
      postId: "post1",
      participants: ["creator1", "user2"],
      save: jest.fn(),
    });

    Post.findById.mockResolvedValue({
      _id: "post1",
      creator: "creator1",
    });

    const req = {
      params: { conversationId },
      body: { viewingDate: "not-a-date" },
      userData: { userId: "creator1" },
    };
    const res = createMockRes();

    await conversationController.setViewingDate(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid viewing date",
    });
  });
});

describe("ConversationController - uploadAgreementDocument", () => {
  it("should add document to agreementDocuments when uploader is post creator", async () => {
    const conversationId = "conv1";
    const userId = "creator1";
    const file = { filename: "agreement.pdf" };

    const saveMock = jest.fn().mockResolvedValue(true);

    const conversationDoc = {
      _id: conversationId,
      participants: [userId, "user2"],
      postId: { _id: "post1", creator: userId },
      agreementDocuments: [],
      signedAgreementDocuments: [],
      agreementSigned: false,
      save: saveMock,
    };

    const mockConvQuery = {
      populate: jest.fn().mockResolvedValue(conversationDoc),
    };
    Conversation.findById.mockReturnValue(mockConvQuery);

    // socket + user for emitNotificationToUser
    User.findById.mockResolvedValue({ _id: userId, username: "Creator" });
    socket.getUserSockets.mockReturnValue({ user2: "socket123" });
    socket.getIO.mockReturnValue({
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    });

    const req = {
      params: { conversationId },
      files: [file],
      userData: { userId },
    };
    const res = createMockRes();

    await conversationController.uploadAgreementDocument(req, res);

    // Conversation should be looked up and populated
    expect(Conversation.findById).toHaveBeenCalledWith(conversationId);
    expect(conversationDoc.agreementDocuments).toContain("agreement.pdf");
    expect(conversationDoc.signedAgreementDocuments).toHaveLength(0);
    expect(saveMock).toHaveBeenCalled();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Document uploaded successfully",
        documentPaths: ["agreement.pdf"],
        agreementSigned: false,
      })
    );
  });
});

describe("ConversationController - viewDocument", () => {
  it("should send file when it exists", () => {
    const filename = "test.pdf";
    fs.existsSync.mockReturnValue(true);

    const req = {
      params: { filename },
    };
    const res = createMockRes();

    conversationController.viewDocument(req, res);

    const expectedPath = path.join(
      __dirname,
      "..",
      "documents",
      filename
    );

    expect(fs.existsSync).toHaveBeenCalledWith(expectedPath);
    expect(res.sendFile).toHaveBeenCalledWith(expectedPath);
  });

  it("should return 404 when file does not exist", () => {
    const filename = "missing.pdf";
    fs.existsSync.mockReturnValue(false);

    const req = {
      params: { filename },
    };
    const res = createMockRes();

    conversationController.viewDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith("File not found");
  });
});

describe("ConversationController - deleteDocument", () => {
  it("should remove document from conversation and disk", async () => {
    const conversationId = "conv1";
    const filename = "doc.pdf";

    const saveMock = jest.fn().mockResolvedValue(true);

    const conversationDoc = {
      _id: conversationId,
      agreementDocuments: [filename],
      signedAgreementDocuments: [],
      save: saveMock,
    };

    Conversation.findById.mockResolvedValue(conversationDoc);
    fs.existsSync.mockReturnValue(true);
    fs.unlinkSync.mockImplementation(() => {});

    const req = {
      params: { conversationId, filename },
      userData: { userId: "user1" },
    };
    const res = createMockRes();

    await conversationController.deleteDocument(req, res);

    expect(Conversation.findById).toHaveBeenCalledWith(conversationId);
    expect(conversationDoc.agreementDocuments).not.toContain(filename);
    expect(saveMock).toHaveBeenCalled();

    const expectedPath = path.join(
      __dirname,
      "..",
      "documents",
      filename
    );
    expect(fs.existsSync).toHaveBeenCalledWith(expectedPath);
    expect(fs.unlinkSync).toHaveBeenCalledWith(expectedPath);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Document deleted successfully",
    });
  });

  it("should return 404 if conversation is not found", async () => {
    Conversation.findById.mockResolvedValue(null);

    const req = {
      params: { conversationId: "missing", filename: "doc.pdf" },
      userData: { userId: "user1" },
    };
    const res = createMockRes();

    await conversationController.deleteDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Conversation not found",
    });
  });
});
