import express from 'express';
import http from 'http';
import path from 'path';
import os from 'os';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

interface User {
  id: string;
  username: string;
  avatar: string;
  deviceType: 'mobile' | 'desktop';
  joinedAt: number;
}

interface ClientConnection {
  ws: WebSocket;
  user: User | null;
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Store active client connections
  const clients = new Map<string, ClientConnection>();

  // In-memory file storage for server-assisted fallback transfers
  const fallbackFiles = new Map<string, {
    name: string;
    size: number;
    type: string;
    buffer: Buffer;
    senderId: string;
    receiverId: string;
  }>();

  app.use(express.json({ limit: '100mb' }));

  // API Route: Server local IPs to display for easy local network connection
  app.get('/api/server-info', (req, res) => {
    const interfaces = os.networkInterfaces();
    const ips: string[] = [];
    
    for (const name of Object.keys(interfaces)) {
      const ifaceList = interfaces[name];
      if (ifaceList) {
        for (const iface of ifaceList) {
          if (iface.family === 'IPv4' && !iface.internal) {
            ips.push(iface.address);
          }
        }
      }
    }
    
    res.json({
      ips,
      port: PORT,
      url: ips.length > 0 ? `http://${ips[0]}:${PORT}` : `http://localhost:${PORT}`
    });
  });

  // API Route: Fallback upload (when WebRTC fails or isn't supported)
  app.post('/api/fallback/upload', (req, res) => {
    try {
      const { fileId, name, size, type, dataUrl, senderId, receiverId } = req.body;
      if (!fileId || !dataUrl) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }

      // Convert data URL base64 back to buffer
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data) {
        res.status(400).json({ error: 'Invalid data URL format' });
        return;
      }
      const buffer = Buffer.from(base64Data, 'base64');

      fallbackFiles.set(fileId, {
        name,
        size,
        type,
        buffer,
        senderId,
        receiverId
      });

      // Notify the receiver via WS that the file is ready for download
      const receiverClient = clients.get(receiverId);
      if (receiverClient && receiverClient.ws.readyState === WebSocket.OPEN) {
        receiverClient.ws.send(JSON.stringify({
          type: 'fallback-file-ready',
          payload: {
            fileId,
            senderId,
            name,
            size,
            type
          }
        }));
      }

      res.json({ success: true, fileId });
    } catch (err: any) {
      console.error('Upload fallback error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route: Fallback download
  app.get('/api/fallback/download/:fileId', (req, res) => {
    const { fileId } = req.params;
    const file = fallbackFiles.get(fileId);
    
    if (!file) {
      res.status(404).send('File not found');
      return;
    }

    res.setHeader('Content-Type', file.type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.setHeader('Content-Length', file.buffer.length);
    res.send(file.buffer);

    // Clean up file from memory after some time or immediate download
    setTimeout(() => {
      fallbackFiles.delete(fileId);
    }, 60000); // 1 minute cleanup
  });

  // Setup Web Socket Server
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const { pathname } = new URL(request.url || '', 'http://localhost');
      
      if (pathname === '/ws') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (err) {
      console.error('[Streamy] Upgrade URL parsing error:', err);
      socket.destroy();
    }
  });

  // Helper to broadcast active users list to everyone
  const broadcastUsersList = () => {
    const userList: User[] = [];
    clients.forEach((client) => {
      if (client.user) {
        userList.push(client.user);
      }
    });

    const message = JSON.stringify({
      type: 'users:list',
      payload: { users: userList }
    });

    clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    });
  };

  wss.on('connection', (ws: WebSocket) => {
    let clientId: string | null = null;

    ws.on('message', (messageBuffer) => {
      try {
        const message = JSON.parse(messageBuffer.toString());
        const { type, payload } = message;

        switch (type) {
          case 'register': {
            clientId = payload.id;
            const newUser: User = {
              id: payload.id,
              username: payload.username,
              avatar: payload.avatar,
              deviceType: payload.deviceType,
              joinedAt: Date.now()
            };

            clients.set(payload.id, { ws, user: newUser });
            
            // Send back confirmation with server-side time
            ws.send(JSON.stringify({
              type: 'registered',
              payload: { user: newUser }
            }));

            // Broadcast the updated users list
            broadcastUsersList();
            break;
          }

          case 'update-profile': {
            if (clientId && clients.has(clientId)) {
              const client = clients.get(clientId)!;
              if (client.user) {
                client.user.username = payload.username || client.user.username;
                client.user.avatar = payload.avatar || client.user.avatar;
                broadcastUsersList();
              }
            }
            break;
          }

          case 'signal': {
            const { targetId, signal } = payload;
            if (clientId) {
              const recipient = clients.get(targetId);
              if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
                recipient.ws.send(JSON.stringify({
                  type: 'signal',
                  payload: {
                    senderId: clientId,
                    signal
                  }
                }));
              }
            }
            break;
          }

          case 'transfer-request': {
            const { targetId, transferId, fileName, fileSize, fileType, senderName, senderAvatar } = payload;
            if (clientId) {
              const recipient = clients.get(targetId);
              if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
                recipient.ws.send(JSON.stringify({
                  type: 'transfer-request',
                  payload: {
                    senderId: clientId,
                    transferId,
                    fileName,
                    fileSize,
                    fileType,
                    senderName,
                    senderAvatar
                  }
                }));
              }
            }
            break;
          }

          case 'transfer-response': {
            const { targetId, transferId, accepted } = payload;
            if (clientId) {
              const recipient = clients.get(targetId);
              if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
                recipient.ws.send(JSON.stringify({
                  type: 'transfer-response',
                  payload: {
                    senderId: clientId,
                    transferId,
                    accepted
                  }
                }));
              }
            }
            break;
          }

          case 'transfer-cancel': {
            const { targetId, transferId, reason } = payload;
            if (clientId) {
              const recipient = clients.get(targetId);
              if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
                recipient.ws.send(JSON.stringify({
                  type: 'transfer-cancel',
                  payload: {
                    senderId: clientId,
                    transferId,
                    reason
                  }
                }));
              }
            }
            break;
          }

          case 'transfer-progress': {
            const { targetId, transferId, progress } = payload;
            if (clientId) {
              const recipient = clients.get(targetId);
              if (recipient && recipient.ws.readyState === WebSocket.OPEN) {
                recipient.ws.send(JSON.stringify({
                  type: 'transfer-progress',
                  payload: {
                    senderId: clientId,
                    transferId,
                    progress
                  }
                }));
              }
            }
            break;
          }

          case 'heartbeat': {
            ws.send(JSON.stringify({ type: 'heartbeat-ack' }));
            break;
          }
        }
      } catch (err) {
        console.error('Error handling ws message:', err);
      }
    });

    ws.on('close', () => {
      if (clientId) {
        clients.delete(clientId);
        broadcastUsersList();
      }
    });

    ws.on('error', (err) => {
      console.error(`WebSocket error for client ${clientId}:`, err);
      if (clientId) {
        clients.delete(clientId);
        broadcastUsersList();
      }
    });
  });

  // Vite Integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Streamy] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Streamy] Failed to start server:', err);
});
