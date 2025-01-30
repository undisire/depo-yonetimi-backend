const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const debug = require('debug')('app:socket');
const { logger } = require('./loggerService');

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
  }

  // Socket.IO sunucusunu başlat
  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST']
      }
    });

    // JWT doğrulama middleware'i
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          throw new Error('Authentication error');
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
      } catch (error) {
        debug('Socket authentication error:', error);
        next(new Error('Authentication error'));
      }
    });

    // Bağlantı olaylarını dinle
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    debug('Socket.IO server initialized');
  }

  // Yeni bağlantıyı işle
  handleConnection(socket) {
    const userId = socket.user.id;
    
    // Kullanıcıyı bağlı kullanıcılar listesine ekle
    this.connectedUsers.set(userId, socket.id);
    
    debug(`User connected: ${userId}`);
    logger.info('Socket connection established', { userId });

    // Kullanıcıya hoş geldin mesajı gönder
    this.sendToUser(userId, 'welcome', {
      message: 'Bağlantı başarıyla kuruldu'
    });

    // Bağlantı kesme olayını dinle
    socket.on('disconnect', () => {
      this.connectedUsers.delete(userId);
      debug(`User disconnected: ${userId}`);
      logger.info('Socket connection closed', { userId });
    });

    // Hata olayını dinle
    socket.on('error', (error) => {
      debug(`Socket error for user ${userId}:`, error);
      logger.error('Socket error', { userId, error });
    });
  }

  // Belirli bir kullanıcıya mesaj gönder
  sendToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
      debug(`Event ${event} sent to user ${userId}`);
    }
  }

  // Belirli bir role sahip tüm kullanıcılara mesaj gönder
  sendToRole(role, event, data) {
    this.io.sockets.sockets.forEach((socket) => {
      if (socket.user && socket.user.role === role) {
        socket.emit(event, data);
      }
    });
    debug(`Event ${event} sent to role ${role}`);
  }

  // Tüm bağlı kullanıcılara mesaj gönder
  broadcast(event, data, excludeUserId = null) {
    if (excludeUserId) {
      const socketId = this.connectedUsers.get(excludeUserId);
      if (socketId) {
        this.io.sockets.sockets.forEach((socket) => {
          if (socket.id !== socketId) {
            socket.emit(event, data);
          }
        });
      }
    } else {
      this.io.emit(event, data);
    }
    debug(`Event ${event} broadcasted`);
  }

  // Stok güncellemesi bildir
  notifyStockUpdate(materialId, newStock, updatedBy) {
    const data = {
      materialId,
      newStock,
      updatedBy,
      timestamp: new Date()
    };
    this.broadcast('stock_update', data);
    debug(`Stock update notification sent for material ${materialId}`);
  }

  // Talep durumu değişikliği bildir
  notifyRequestStatusChange(requestId, newStatus, updatedBy) {
    const data = {
      requestId,
      newStatus,
      updatedBy,
      timestamp: new Date()
    };
    this.broadcast('request_status_change', data);
    debug(`Request status change notification sent for request ${requestId}`);
  }

  // Teslimat durumu değişikliği bildir
  notifyDeliveryStatusChange(deliveryId, newStatus, updatedBy) {
    const data = {
      deliveryId,
      newStatus,
      updatedBy,
      timestamp: new Date()
    };
    this.broadcast('delivery_status_change', data);
    debug(`Delivery status change notification sent for delivery ${deliveryId}`);
  }

  // Düşük stok uyarısı gönder
  notifyLowStock(materialId, currentStock, threshold) {
    const data = {
      materialId,
      currentStock,
      threshold,
      timestamp: new Date()
    };
    this.sendToRole('admin', 'low_stock_alert', data);
    debug(`Low stock alert sent for material ${materialId}`);
  }

  // Yeni bildirim gönder
  sendNotification(userId, notification) {
    this.sendToUser(userId, 'notification', {
      ...notification,
      timestamp: new Date()
    });
    debug(`Notification sent to user ${userId}`);
  }

  // Aktif kullanıcı sayısını al
  getActiveUserCount() {
    return this.connectedUsers.size;
  }

  // Kullanıcının bağlı olup olmadığını kontrol et
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }
}

// Singleton instance
const socketService = new SocketService();

module.exports = socketService;
