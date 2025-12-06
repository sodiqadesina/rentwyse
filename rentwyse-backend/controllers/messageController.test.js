/**
 * Message Controller Tests
 *
 * Covers:
 *  - createMessage
 *      - existing conversationId
 *      - new conversation with receiver
 *      - error when neither conversationId nor receiver is provided
 *  - readMessagesInConversation
 *      - marks messages as read (204)
 *      - no messages updated (200)
 *  - getUnreadMessagesCount
 *  - getMessagesForUser (501 stub)
 */

jest.mock("../models/message", () => {
  // Message is a constructor function for new Message(...)
  const MessageMock = jest.fn();
  // Static methods used by the controller
  MessageMock.updateMany = jest.fn();
  MessageMock.countDocuments = jest.fn();
  return MessageMock;
});

jest.mock("../models/conversation", () => {
  // Conversation is also a constructor for new Conversation(...)
  const ConversationMock = jest.fn();
  ConversationMock.findById = jest.fn();
  ConversationMock.findOne = jest.fn();
  return ConversationMock;
});

jest.mock("../models/user", () => ({
  findById: jest.fn(),
}));

jest.mock("../socket", () => ({
  getUserSockets: jest.fn(),
  getIO: jest.fn(),
  addQueuedMessage: jest.fn(),
}));

const messageController = require("./messageController");
const Message = require("../models/message");
const Conversation = require("../models/conversation");
const User = require("../models/user");
const socket = require("../socket");

// Helper: fresh res mock for each test
const createMockRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  send: jest.fn(),
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("MessageController - createMessage", () => {
  it("should send a message in an existing conversation and emit via Socket.io when receiver is online", async () => {
    const senderId = "sender123";
    const receiverId = "receiver456";
    const conversationId = "conv789";

    // Mock existing conversation lookup
    Conversation.findById.mockResolvedValue({ _id: conversationId });

    // Mock Message constructor instance
    const saveMock = jest.fn().mockResolvedValue(undefined);
    Message.mockImplementation(() => ({
      save: saveMock,
      _id: "msg001",
    }));

    // Mock user sockets: receiver is online
    socket.getUserSockets.mockReturnValue({
      [receiverId]: "socket-abc",
    });

    // Mock getIO() behavior
    const emitMock = jest.fn();
    const toMock = jest.fn().mockReturnValue({ emit: emitMock });
    socket.getIO.mockReturnValue({ to: toMock });

    // Mock sender details for username
    User.findById.mockResolvedValue({ _id: senderId, username: "senderUser" });

    const req = {
      body: {
        conversationId,
        receiver: receiverId,
        content: "Hello there",
      },
      userData: { userId: senderId },
    };
    const res = createMockRes();

    await messageController.createMessage(req, res);

    // Conversation looked up
    expect(Conversation.findById).toHaveBeenCalledWith(conversationId);

    // Message created & saved
    expect(Message).toHaveBeenCalledWith({
      conversationId,
      sender: senderId,
      receiver: receiverId,
      content: "Hello there",
    });
    expect(saveMock).toHaveBeenCalled();

    // Socket logic: receiver online → emit "newMessage"
    expect(socket.getUserSockets).toHaveBeenCalled();
    expect(socket.getIO).toHaveBeenCalled();
    expect(toMock).toHaveBeenCalledWith("socket-abc");
    expect(emitMock).toHaveBeenCalledWith(
      "newMessage",
      expect.objectContaining({
        conversationId,
        message: "Hello there",
        sender: senderId,
        receiver: receiverId,
        senderUsername: "senderUser",
      })
    );

    // HTTP response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Message sent successfully",
      messageId: "msg001",
    });
  });

  it("should create a new conversation if none exists and queue message when receiver is offline", async () => {
    const senderId = "sender123";
    const receiverId = "receiver456";

    // No existing conversation between sender and receiver
    Conversation.findOne.mockResolvedValue(null);

    // Mock new Conversation instance
    const convSaveMock = jest.fn().mockResolvedValue(undefined);
    const newConversation = {
      _id: "conv-new",
      participants: [senderId, receiverId],
      save: convSaveMock,
    };
    Conversation.mockImplementation(() => newConversation);

    // Mock Message instance
    const msgSaveMock = jest.fn().mockResolvedValue(undefined);
    Message.mockImplementation(() => ({
      _id: "msg-new",
      save: msgSaveMock,
    }));

    // Receiver offline → no entry in userSockets
    socket.getUserSockets.mockReturnValue({});
    // getIO will not be used, but mock anyway
    socket.getIO.mockReturnValue({
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    });

    // Sender details
    User.findById.mockResolvedValue({ _id: senderId, username: "senderUser" });

    const req = {
      body: {
        receiver: receiverId,
        content: "Hi, I am interested in your listing",
      },
      userData: { userId: senderId },
    };
    const res = createMockRes();

    await messageController.createMessage(req, res);

    // createMessage should:
    // 1) Try to find an existing conversation
    expect(Conversation.findOne).toHaveBeenCalledWith({
      participants: { $all: [senderId, receiverId] },
    });

    // 2) Create & save a new Conversation
    expect(Conversation).toHaveBeenCalledWith({
      participants: [senderId, receiverId],
    });
    expect(convSaveMock).toHaveBeenCalled();

    // 3) Create & save a Message linked to the new conversation
    expect(Message).toHaveBeenCalledWith({
      conversationId: "conv-new",
      sender: senderId,
      receiver: receiverId,
      content: "Hi, I am interested in your listing",
    });
    expect(msgSaveMock).toHaveBeenCalled();

    // 4) Queue the message because receiver is offline
    expect(socket.getUserSockets).toHaveBeenCalled();
    expect(socket.addQueuedMessage).toHaveBeenCalledWith(
      receiverId,
      expect.objectContaining({
        conversationId: "conv-new",
        message: "Hi, I am interested in your listing",
        sender: senderId,
        receiver: receiverId,
        senderUsername: "senderUser",
      })
    );

    // 5) HTTP response
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Message sent successfully",
      messageId: "msg-new",
    });
  });

  it("should return 500 if neither conversationId nor receiver is provided", async () => {
    const req = {
      body: {
        content: "This should fail",
      },
      userData: { userId: "sender123" },
    };
    const res = createMockRes();

    await messageController.createMessage(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Failed to send message",
        error: "A receiver or conversationId must be provided",
      })
    );
  });
});

describe("MessageController - readMessagesInConversation", () => {
  it("should mark unread messages as read and return 204 when updates occur", async () => {
    const conversationId = "conv123";
    const userId = "user123";

    // Mock updateMany result: some documents modified
    Message.updateMany.mockResolvedValue({
      n: 3,
      nModified: 2,
    });

    const req = {
      params: { conversationId },
      userData: { userId },
    };
    const res = createMockRes();

    await messageController.readMessagesInConversation(req, res);

    expect(Message.updateMany).toHaveBeenCalledWith(
      { conversationId, receiver: userId, read: false },
      { $set: { read: true } }
    );

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("should return 200 with a message when there are no messages to update", async () => {
    const conversationId = "conv123";
    const userId = "user123";

    // Mock updateMany result: no docs modified
    Message.updateMany.mockResolvedValue({
      n: 0,
      nModified: 0,
    });

    const req = {
      params: { conversationId },
      userData: { userId },
    };
    const res = createMockRes();

    await messageController.readMessagesInConversation(req, res);

    expect(Message.updateMany).toHaveBeenCalledWith(
      { conversationId, receiver: userId, read: false },
      { $set: { read: true } }
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "No messages to update",
    });
  });
});

describe("MessageController - getUnreadMessagesCount", () => {
  it("should return the count of unread messages for the current user", async () => {
    const userId = "user123";

    Message.countDocuments.mockResolvedValue(5);

    const req = {
      userData: { userId },
    };
    const res = createMockRes();

    await messageController.getUnreadMessagesCount(req, res);

    expect(Message.countDocuments).toHaveBeenCalledWith({
      receiver: userId,
      read: false,
    });

    expect(res.json).toHaveBeenCalledWith({ count: 5 });
  });
});

describe("MessageController - getMessagesForUser", () => {
  it("should return 501 Not Implemented", async () => {
    const req = {
      userData: { userId: "user123" },
    };
    const res = createMockRes();

    await messageController.getMessagesForUser(req, res);

    expect(res.status).toHaveBeenCalledWith(501);
    expect(res.json).toHaveBeenCalledWith({ message: "Not implemented" });
  });
});
