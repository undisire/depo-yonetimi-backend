const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { logger } = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const setupSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket.io middleware - token doğrulama
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  // Bağlantı olaylarını dinle
  io.on('connection', (socket) => {
    logger.info('Socket bağlantısı kuruldu', {
      userId: socket.userId,
      socketId: socket.id
    });

    // Kullanıcıya özel oda oluştur
    socket.join(`user_${socket.userId}`);

    // Role göre oda oluştur
    socket.join(`role_${socket.userRole}`);

    // Bağlantı koptuğunda
    socket.on('disconnect', () => {
      logger.info('Socket bağlantısı koptu', {
        userId: socket.userId,
        socketId: socket.id
      });
    });
  });

  return io;
};

module.exports = setupSocket;
