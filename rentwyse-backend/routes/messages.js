const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/messageController');
const checkAuth = require('../middleware/check-auth');

router.post('/', checkAuth, MessageController.createMessage);
router.get('/:userId', checkAuth, MessageController.getMessagesForUser);
// router.post('/reply', checkAuth, MessageController.replyToMessage);
router.patch('/markAsRead/:conversationId', checkAuth, MessageController.readMessagesInConversation);
router.get('/unreadCount/:userId', checkAuth, MessageController.getUnreadMessagesCount);

module.exports = router;
