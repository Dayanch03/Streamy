import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, FileTransfer, ServerInfo, TransferStatus } from '../types';
import { playSuccessSound, playSendSound, playRequestSound, playCancelSound } from '../utils/audio';
import { Language, getTranslation } from '../utils/i18n';

interface StreamyContextProps {
  currentUser: User | null;
  onlineUsers: User[];
  transfers: FileTransfer[];
  serverInfo: ServerInfo | null;
  theme: 'light' | 'dark';
  language: Language;
  isConnected: boolean;
  registerUser: (username: string, avatar: string) => void;
  updateProfile: (username: string, avatar: string) => void;
  sendRequest: (targetId: string, file: File) => void;
  acceptRequest: (transferId: string) => void;
  declineRequest: (transferId: string) => void;
  cancelTransfer: (transferId: string) => void;
  toggleTheme: () => void;
  clearCompletedTransfers: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: string, variables?: Record<string, any>) => string;
}

const StreamyContext = createContext<StreamyContextProps | undefined>(undefined);

// In-memory store for files that are waiting/active to be sent
const filesToSendStore = new Map<string, File>();

// In-memory store for active WebRTC connections
const peerConnectionsStore = new Map<string, RTCPeerConnection>();
const dataChannelsStore = new Map<string, RTCDataChannel>();

// Set of completed transfer IDs to prevent race conditions & duplicate downloads
const completedTransfersStore = new Set<string>();

// Chunk size for WebRTC transfer (64KB)
const CHUNK_SIZE = 65536;
// Timeout for WebRTC connection to establish before falling back to HTTP (4 seconds)
const WEBRTC_CONN_TIMEOUT = 4000;

export const StreamyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedProfile = localStorage.getItem('streamy-profile');
    if (savedProfile) {
      try {
        return JSON.parse(savedProfile);
      } catch (e) {
        console.error('Failed to parse saved profile', e);
        return null;
      }
    }
    return null;
  });

  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);

  const onlineUsersRef = useRef<User[]>([]);
  useEffect(() => {
    onlineUsersRef.current = onlineUsers;
  }, [onlineUsers]);

  const [transfers, setTransfers] = useState<FileTransfer[]>(() => {
    const saved = localStorage.getItem('streamy-transfers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as FileTransfer[];
        // Sanitize transfer states so active ones don't hang as 'transferring' or 'pending' forever
        return parsed.map((t) => {
          if (t.status === 'pending' || t.status === 'connecting' || t.status === 'transferring') {
            return { ...t, status: 'failed', error: 'Interrupted by page reload' };
          }
          return t;
        });
      } catch (e) {
        console.error('Failed to parse saved transfers', e);
        return [];
      }
    }
    return [];
  });

  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLang = localStorage.getItem('streamy-lang') as Language | null;
    if (savedLang === 'en' || savedLang === 'ru' || savedLang === 'tk') {
      return savedLang;
    }
    const browserLang = navigator.language?.toLowerCase() || '';
    if (browserLang.startsWith('ru') || browserLang.startsWith('be') || browserLang.startsWith('uk')) {
      return 'ru';
    } else if (browserLang.startsWith('tk')) {
      return 'tk';
    }
    return 'ru'; // Default to Russian as per user request
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<any>(null);

  // Save transfers to local storage on change
  useEffect(() => {
    const sanitized = transfers.map(({ fileData, ...rest }) => rest);
    localStorage.setItem('streamy-transfers', JSON.stringify(sanitized));
  }, [transfers]);
  
  // Load initial settings
  useEffect(() => {
    // Theme
    const savedTheme = localStorage.getItem('streamy-theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Fetch server information with retry
    let isMounted = true;
    const fetchServerInfo = (retries = 6, delay = 2000) => {
      fetch('/api/server-info')
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.json();
        })
        .then((data) => {
          if (isMounted) {
            setServerInfo(data);
          }
        })
        .catch((err) => {
          console.warn(`Failed to fetch server info: ${err.message}. Retries remaining: ${retries}`);
          if (isMounted && retries > 0) {
            setTimeout(() => fetchServerInfo(retries - 1, delay * 1.5), delay);
          }
        });
    };

    fetchServerInfo();

    return () => {
      isMounted = false;
      stopHeartbeat();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Connect / Reconnect WebSocket whenever currentUser changes or on mount if registered
  useEffect(() => {
    if (!currentUser) {
      setOnlineUsers([]);
      setIsConnected(false);
      return;
    }

    connectWebSocket();

    return () => {
      stopHeartbeat();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [currentUser?.id]);

  const startHeartbeat = (ws: WebSocket) => {
    stopHeartbeat();
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 15000);
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  };

  const connectWebSocket = () => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`[Streamy] Connecting WebSocket to ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Streamy] WebSocket connected');
      setIsConnected(true);
      startHeartbeat(ws);

      // Register with the server immediately on connection
      if (currentUser) {
        ws.send(JSON.stringify({
          type: 'register',
          payload: currentUser
        }));
      }
    };

    ws.onclose = () => {
      console.log('[Streamy] WebSocket disconnected. Retrying in 3s...');
      setIsConnected(false);
      stopHeartbeat();
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (err) => {
      console.warn('[Streamy] WebSocket connection encountered an issue:', err);
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        const { type, payload } = message;

        switch (type) {
          case 'registered': {
            console.log('[Streamy] Successfully registered on server:', payload.user);
            break;
          }

          case 'users:list': {
            // Filter out our own user from the active online list
            const others = payload.users.filter((u: User) => u.id !== currentUser?.id);
            setOnlineUsers(others);
            break;
          }

          case 'signal': {
            const { senderId, signal } = payload;
            handleSignalingMessage(senderId, signal);
            break;
          }

          case 'transfer-request': {
            const { senderId, transferId, fileName, fileSize, fileType, senderName: payloadSenderName, senderAvatar: payloadSenderAvatar } = payload;
            
            // Find sender details from list as fallback
            const sender = onlineUsersRef.current.find((u) => u.id === senderId);
            const senderName = payloadSenderName || sender?.username || 'Unknown Device';
            const senderAvatar = payloadSenderAvatar || sender?.avatar || '❓';

            // Add incoming transfer
            const newTransfer: FileTransfer = {
              id: transferId,
              peerId: senderId,
              peerName: senderName,
              peerAvatar: senderAvatar,
              type: 'receive',
              fileName,
              fileSize,
              fileType,
              progress: 0,
              speed: 0,
              eta: 0,
              status: 'pending',
              method: 'webrtc'
            };

            setTransfers((prev) => {
              // Avoid duplicates
              if (prev.some((t) => t.id === transferId)) return prev;
              return [newTransfer, ...prev];
            });

            playRequestSound();
            break;
          }

          case 'transfer-response': {
            const { senderId, transferId, accepted } = payload;
            
            setTransfers((prev) => 
              prev.map((t) => {
                if (t.id === transferId) {
                  return { ...t, status: accepted ? 'connecting' : 'cancelled' };
                }
                return t;
              })
            );

            if (accepted) {
              // We are the sender, initiate WebRTC connection
              initiateWebRTCConnection(transferId, senderId);
            } else {
              playCancelSound();
            }
            break;
          }

          case 'transfer-cancel': {
            const { transferId, reason } = payload;
            closeConnections(transferId);
            setTransfers((prev) => 
              prev.map((t) => {
                if (t.id === transferId) {
                  return { ...t, status: 'cancelled', error: reason || 'Cancelled by peer' };
                }
                return t;
              })
            );
            playCancelSound();
            break;
          }

          case 'transfer-progress': {
            const { transferId, progress } = payload;
            setTransfers((prev) => 
              prev.map((t) => {
                if (t.id === transferId) {
                  return { ...t, progress };
                }
                return t;
              })
            );
            break;
          }

          case 'fallback-file-ready': {
            const { fileId, senderId, name, size, type } = payload;
            
            // The fallback file is fully uploaded to the server and ready for us to download
            setTransfers((prev) => 
              prev.map((t) => {
                if (t.id === fileId) {
                  // Trigger automatic browser download
                  triggerFallbackDownload(fileId, name);
                  playSuccessSound();
                  return {
                    ...t,
                    status: 'completed',
                    progress: 100,
                    method: 'fallback',
                    speed: size // set artificial high speed
                  };
                }
                return t;
              })
            );
            break;
          }
        }
      } catch (err) {
        console.error('[Streamy] Error parsing WebSocket message:', err);
      }
    };
  };

  // Helper to trigger direct browser download from the server fallback
  const triggerFallbackDownload = (fileId: string, name: string) => {
    const downloadUrl = `/api/fallback/download/${fileId}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Setup / Update registration
  const registerUser = (username: string, avatar: string) => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const newProfile: User = {
      id: 'usr_' + Math.random().toString(36).substring(2, 11),
      username,
      avatar,
      deviceType: isMobile ? 'mobile' : 'desktop'
    };

    setCurrentUser(newProfile);
    localStorage.setItem('streamy-profile', JSON.stringify(newProfile));
  };

  const updateProfile = (username: string, avatar: string) => {
    if (!currentUser) return;
    const updated = { ...currentUser, username, avatar };
    setCurrentUser(updated);
    localStorage.setItem('streamy-profile', JSON.stringify(updated));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'update-profile',
        payload: { username, avatar }
      }));
    }
  };

  // Theme management
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('streamy-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const clearCompletedTransfers = () => {
    setTransfers((prev) => prev.filter((t) => t.status !== 'completed' && t.status !== 'cancelled' && t.status !== 'failed'));
  };

  // Initiate sending a file request
  const sendRequest = (targetId: string, file: File) => {
    if (!currentUser || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert('You are not connected to the local network server yet.');
      return;
    }

    const transferId = 'tx_' + Math.random().toString(36).substring(2, 11);
    
    // Save file in our local in-memory map
    filesToSendStore.set(transferId, file);

    const targetUser = onlineUsers.find((u) => u.id === targetId);
    const peerName = targetUser?.username || 'Unknown Device';
    const peerAvatar = targetUser?.avatar || '❓';

    const newTransfer: FileTransfer = {
      id: transferId,
      peerId: targetId,
      peerName,
      peerAvatar,
      type: 'send',
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      progress: 0,
      speed: 0,
      eta: 0,
      status: 'pending',
      method: 'webrtc'
    };

    setTransfers((prev) => [newTransfer, ...prev]);

    // Send transfer request via WS
    wsRef.current.send(JSON.stringify({
      type: 'transfer-request',
      payload: {
        targetId,
        transferId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        senderName: currentUser.username,
        senderAvatar: currentUser.avatar
      }
    }));
  };

  // Accept incoming transfer request
  const acceptRequest = (transferId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const transfer = transfers.find((t) => t.id === transferId);
    if (!transfer) return;

    setTransfers((prev) => 
      prev.map((t) => {
        if (t.id === transferId) {
          return { ...t, status: 'connecting' };
        }
        return t;
      })
    );

    // Reply accept via WS
    wsRef.current.send(JSON.stringify({
      type: 'transfer-response',
      payload: {
        targetId: transfer.peerId,
        transferId,
        accepted: true
      }
    }));

    // Start a timeout. If WebRTC doesn't connect in 4 seconds, we change state to HTTP fallback
    setupConnectionTimeout(transferId, transfer.peerId, 'receive');
  };

  // Decline incoming request
  const declineRequest = (transferId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const transfer = transfers.find((t) => t.id === transferId);
    if (!transfer) return;

    // Remove or cancel locally
    setTransfers((prev) => prev.filter((t) => t.id !== transferId));

    // Send decline via WS
    wsRef.current.send(JSON.stringify({
      type: 'transfer-response',
      payload: {
        targetId: transfer.peerId,
        transferId,
        accepted: false
      }
    }));
  };

  // Cancel ongoing transfer
  const cancelTransfer = (transferId: string) => {
    const transfer = transfers.find((t) => t.id === transferId);
    if (!transfer) return;

    closeConnections(transferId);
    
    setTransfers((prev) => 
      prev.map((t) => {
        if (t.id === transferId) {
          return { ...t, status: 'cancelled', error: 'Cancelled by you' };
        }
        return t;
      })
    );

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'transfer-cancel',
        payload: {
          targetId: transfer.peerId,
          transferId,
          reason: 'Cancelled by peer'
        }
      }));
    }

    playCancelSound();
  };

  // Clean WebRTC states
  const closeConnections = (transferId: string) => {
    const pc = peerConnectionsStore.get(transferId);
    if (pc) {
      pc.close();
      peerConnectionsStore.delete(transferId);
    }
    const dc = dataChannelsStore.get(transferId);
    if (dc) {
      dc.close();
      dataChannelsStore.delete(transferId);
    }
    filesToSendStore.delete(transferId);
  };

  // WEBRTC CONNECTION SETUP FOR THE SENDER
  const initiateWebRTCConnection = (transferId: string, receiverId: string) => {
    console.log(`[Streamy] Initializing RTCPeerConnection for transfer ${transferId}`);
    
    // WebRTC with NO STUN servers because we are strictly in an offline LAN environment
    const pc = new RTCPeerConnection({ iceServers: [] });
    peerConnectionsStore.set(transferId, pc);

    // Create a WebRTC DataChannel
    const dc = pc.createDataChannel('file-transfer', { ordered: true });
    dataChannelsStore.set(transferId, dc);

    setupDataChannelListeners(transferId, dc, 'send');

    // Exchange ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'signal',
          payload: {
            targetId: receiverId,
            signal: {
              type: 'candidate',
              candidate: event.candidate,
              transferId
            }
          }
        }));
      }
    };

    // Create SDP Offer
    pc.createOffer()
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'signal',
            payload: {
              targetId: receiverId,
              signal: {
                type: 'offer',
                offer: pc.localDescription,
                transferId
              }
            }
          }));
        }
      })
      .catch((err) => {
        console.error('WebRTC offer creation error:', err);
        handleTransferFailure(transferId, 'WebRTC init failed');
      });

    // Start a safety timeout to fall back to server upload
    setupConnectionTimeout(transferId, receiverId, 'send');
  };

  // SETUP TIMEOUT FOR WEBRTC FALLBACK
  const setupConnectionTimeout = (transferId: string, peerId: string, role: 'send' | 'receive') => {
    setTimeout(() => {
      const transfer = transfers.find((t) => t.id === transferId);
      // If the transfer is still 'connecting', switch to fallback HTTP mode!
      setTransfers((currentTransfers) => {
        const tr = currentTransfers.find((t) => t.id === transferId);
        if (tr && tr.status === 'connecting') {
          console.log(`[Streamy] WebRTC connection timed out for ${transferId}. Switching to HTTP Fallback...`);
          
          if (role === 'send') {
            // Trigger server upload fallback
            startFallbackUpload(transferId, peerId);
          }
          
          return currentTransfers.map((t) => {
            if (t.id === transferId) {
              return { 
                ...t, 
                status: 'transferring', 
                method: 'fallback',
                error: 'Connecting via LAN Server fallback...'
              };
            }
            return t;
          });
        }
        return currentTransfers;
      });
    }, WEBRTC_CONN_TIMEOUT);
  };

  // SERVER-ASSISTED HTTP FALLBACK UPLOAD
  const startFallbackUpload = async (transferId: string, receiverId: string) => {
    const file = filesToSendStore.get(transferId);
    if (!file) return;

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;

        // POST to fallback upload route
        const response = await fetch('/api/fallback/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileId: transferId,
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl,
            senderId: currentUser?.id,
            receiverId
          })
        });

        if (response.ok) {
          console.log(`[Streamy] Fallback file ${file.name} uploaded successfully!`);
          
          setTransfers((prev) => 
            prev.map((t) => {
              if (t.id === transferId) {
                playSuccessSound();
                return {
                  ...t,
                  status: 'completed',
                  progress: 100,
                  method: 'fallback',
                  speed: file.size // artificial high speed
                };
              }
              return t;
            })
          );
        } else {
          throw new Error('Upload request failed');
        }
      };
      
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error('[Streamy] Fallback upload error:', err);
      handleTransferFailure(transferId, 'Fallback transfer failed');
    }
  };

  // HANDLE SIGNALLING MESSAGES FOR WEBRTC
  const handleSignalingMessage = async (senderId: string, signal: any) => {
    const { type, offer, answer, candidate, transferId } = signal;
    
    let pc = peerConnectionsStore.get(transferId);
    
    // If we are receiving an offer and don't have a peer connection yet, make one
    if (type === 'offer' && !pc) {
      console.log(`[Streamy] Receiving offer for transfer ${transferId}`);
      pc = new RTCPeerConnection({ iceServers: [] });
      peerConnectionsStore.set(transferId, pc);

      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'signal',
            payload: {
              targetId: senderId,
              signal: {
                type: 'candidate',
                candidate: event.candidate,
                transferId
              }
            }
          }));
        }
      };

      pc.ondatachannel = (event) => {
        console.log(`[Streamy] Data channel received for ${transferId}`);
        const dc = event.channel;
        dataChannelsStore.set(transferId, dc);
        setupDataChannelListeners(transferId, dc, 'receive');
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const ans = await pc.createAnswer();
        await pc.setLocalDescription(ans);
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'signal',
            payload: {
              targetId: senderId,
              signal: {
                type: 'answer',
                answer: pc.localDescription,
                transferId
              }
            }
          }));
        }
      } catch (err) {
        console.error('Error handling remote offer:', err);
        handleTransferFailure(transferId, 'Signaling failed');
      }
    } else if (type === 'answer' && pc) {
      console.log(`[Streamy] Receiving answer for transfer ${transferId}`);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error('Error setting remote answer:', err);
        handleTransferFailure(transferId, 'Signaling failed');
      }
    } else if (type === 'candidate' && pc) {
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('Error adding ICE candidate:', err);
        }
      }
    }
  };

  // SETUP DATA CHANNEL EVENT LISTENERS (BINARY FILE CHUNKING)
  const setupDataChannelListeners = (transferId: string, dc: RTCDataChannel, role: 'send' | 'receive') => {
    dc.binaryType = 'arraybuffer';

    let fileBuffer: ArrayBuffer[] = [];
    let receivedBytes = 0;
    let lastTime = Date.now();
    let lastBytes = 0;
    
    // Reset completed status for this transferId
    completedTransfersStore.delete(transferId);

    dc.onopen = () => {
      console.log(`[Streamy] DataChannel open for ${transferId} as ${role}`);
      
      let isAlreadyFallbackOrDone = false;
      setTransfers((prev) => {
        const tr = prev.find((t) => t.id === transferId);
        if (tr && (tr.method === 'fallback' || tr.status === 'completed' || tr.status === 'failed' || tr.status === 'cancelled')) {
          isAlreadyFallbackOrDone = true;
          return prev;
        }
        return prev.map((t) => {
          if (t.id === transferId) {
            return { ...t, status: 'transferring', method: 'webrtc', error: undefined };
          }
          return t;
        });
      });

      if (isAlreadyFallbackOrDone) {
        console.log(`[Streamy] Transfer ${transferId} already handled via fallback or completed. Closing data channel.`);
        try {
          dc.close();
        } catch (e) {}
        return;
      }

      if (role === 'send') {
        playSendSound();
        startSendingFileChunks(transferId, dc);
      }
    };

    dc.onclose = () => {
      console.log(`[Streamy] DataChannel closed for ${transferId}`);
      if (completedTransfersStore.has(transferId)) {
        console.log(`[Streamy] DataChannel close event ignored for completed transfer ${transferId}`);
        return;
      }
      // If it closed before reaching 100%, check if completed, if not trigger failed
      setTransfers((currentTransfers) => {
        const tr = currentTransfers.find((t) => t.id === transferId);
        if (tr && tr.status !== 'completed' && tr.status !== 'cancelled' && tr.status !== 'failed') {
          return currentTransfers.map((t) => {
            if (t.id === transferId) {
              return { ...t, status: 'failed', error: 'Connection lost' };
            }
            return t;
          });
        }
        return currentTransfers;
      });
    };

    dc.onerror = (err) => {
      console.error(`[Streamy] DataChannel error for ${transferId}:`, err);
      if (completedTransfersStore.has(transferId)) {
        console.log(`[Streamy] DataChannel error event ignored for completed transfer ${transferId}`);
        return;
      }
      handleTransferFailure(transferId, 'DataChannel error');
    };

    if (role === 'receive') {
      dc.onmessage = (event) => {
        if (completedTransfersStore.has(transferId)) {
          return;
        }

        // Check if fallback took over
        let isAlreadyFallbackOrDone = false;
        setTransfers((currentTransfers) => {
          const tr = currentTransfers.find((t) => t.id === transferId);
          if (tr && (tr.method === 'fallback' || tr.status === 'completed')) {
            isAlreadyFallbackOrDone = true;
          }
          return currentTransfers;
        });

        if (isAlreadyFallbackOrDone) {
          return;
        }

        const chunk = event.data as ArrayBuffer;
        fileBuffer.push(chunk);
        receivedBytes += chunk.byteLength;

        // Calculate Speed & ETA every 500ms
        const now = Date.now();
        const timeDiff = now - lastTime;
        
        // Find transfer details
        let totalSize = 0;
        let fileName = '';
        let fileType = '';
        
        setTransfers((currentTransfers) => {
          const tr = currentTransfers.find((t) => t.id === transferId);
          if (tr) {
            totalSize = tr.fileSize;
            fileName = tr.fileName;
            fileType = tr.fileType;
          }

          let speed = tr?.speed || 0;
          let eta = tr?.eta || 0;

          if (timeDiff >= 500) {
            const bytesDiff = receivedBytes - lastBytes;
            const currentSpeed = (bytesDiff / timeDiff) * 1000; // bytes/sec
            speed = Math.round(speed * 0.7 + currentSpeed * 0.3); // smoothed
            lastBytes = receivedBytes;
            lastTime = now;
            
            const remainingBytes = totalSize - receivedBytes;
            eta = speed > 0 ? Math.ceil(remainingBytes / speed) : 0;
          }

          const progress = totalSize > 0 ? Math.min(100, Math.round((receivedBytes / totalSize) * 100)) : 0;

          // Check if file is fully received
          if (receivedBytes >= totalSize && totalSize > 0) {
            if (completedTransfersStore.has(transferId)) {
              return currentTransfers;
            }
            completedTransfersStore.add(transferId);

            // Trigger compile of blob and download
            setTimeout(() => {
              try {
                const fileBlob = new Blob(fileBuffer, { type: fileType });
                const downloadUrl = URL.createObjectURL(fileBlob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);
              } catch (e) {
                console.error('Failed to create download blob', e);
              }
            }, 50);

            // Gracefully close connections after 2 seconds to allow full buffer settlement
            setTimeout(() => {
              closeConnections(transferId);
            }, 2000);

            playSuccessSound();

            return currentTransfers.map((t) => {
              if (t.id === transferId) {
                return {
                  ...t,
                  status: 'completed',
                  progress: 100,
                  speed: 0,
                  eta: 0
                };
              }
              return t;
            });
          }

          return currentTransfers.map((t) => {
            if (t.id === transferId) {
              return {
                ...t,
                progress,
                speed,
                eta
              };
            }
            return t;
          });
        });
      };
    }
  };

  // SEND CHUNKS CONTINUOUSLY WITH TRAFFIC THROTTLING (HIGH PERFORMANCE BUFFERED SENDING)
  const startSendingFileChunks = (transferId: string, dc: RTCDataChannel) => {
    const file = filesToSendStore.get(transferId);
    if (!file) {
      handleTransferFailure(transferId, 'File missing');
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      if (!(e.target?.result instanceof ArrayBuffer)) {
        handleTransferFailure(transferId, 'Failed to read file buffer');
        return;
      }

      const arrayBuffer = e.target.result;
      let offset = 0;
      let lastTime = Date.now();
      let lastBytes = 0;

      dc.bufferedAmountLowThreshold = 65536; // 64KB threshold

      const sendNextChunks = () => {
        if (dc.readyState !== 'open') return;

        // Pack the SCTP socket buffer as fast as possible up to 1MB
        while (offset < arrayBuffer.byteLength && dc.bufferedAmount < 1048576) {
          const size = Math.min(CHUNK_SIZE, arrayBuffer.byteLength - offset);
          const chunk = arrayBuffer.slice(offset, offset + size);
          
          try {
            dc.send(chunk);
            offset += size;
          } catch (err) {
            console.error('Failed to send chunk over data channel:', err);
            handleTransferFailure(transferId, 'DataChannel send failed');
            return;
          }
        }

        // Calculate progress, speed and ETA
        const now = Date.now();
        const timeDiff = now - lastTime;
        if (timeDiff >= 500) {
          const bytesDiff = offset - lastBytes;
          const currentSpeed = (bytesDiff / timeDiff) * 1000; // bytes/sec
          
          setTransfers((currentTransfers) => {
            const tr = currentTransfers.find((t) => t.id === transferId);
            let speed = tr?.speed || 0;
            speed = Math.round(speed * 0.7 + currentSpeed * 0.3); // smoothed
            const remainingBytes = arrayBuffer.byteLength - offset;
            const eta = speed > 0 ? Math.ceil(remainingBytes / speed) : 0;
            const progress = Math.min(100, Math.round((offset / arrayBuffer.byteLength) * 100));

            return currentTransfers.map((t) => {
              if (t.id === transferId) {
                return { ...t, progress, speed, eta };
              }
              return t;
            });
          });

          lastBytes = offset;
          lastTime = now;
        } else {
          // Keep progress visually responsive
          setTransfers((currentTransfers) => {
            const progress = Math.min(100, Math.round((offset / arrayBuffer.byteLength) * 100));
            return currentTransfers.map((t) => {
              if (t.id === transferId && t.progress !== progress) {
                return { ...t, progress };
              }
              return t;
            });
          });
        }

        if (offset >= arrayBuffer.byteLength) {
          console.log(`[Streamy] All file chunks sent for transfer ${transferId}`);
          completedTransfersStore.add(transferId);
          
          // Set status to completed and trigger sound
          setTransfers((prev) => 
            prev.map((t) => {
              if (t.id === transferId) {
                playSuccessSound();
                return {
                  ...t,
                  status: 'completed',
                  progress: 100,
                  speed: 0,
                  eta: 0
                };
              }
              return t;
            })
          );

          // Gracefully close connections after 2 seconds to allow socket to fully flush
          setTimeout(() => {
            closeConnections(transferId);
          }, 2000);
        }
      };

      dc.onbufferedamountlow = () => {
        sendNextChunks();
      };

      // Start initial chunks delivery
      sendNextChunks();
    };

    fileReader.onerror = () => {
      handleTransferFailure(transferId, 'File read error');
    };

    fileReader.readAsArrayBuffer(file);
  };

  const handleTransferFailure = (transferId: string, errorMsg: string) => {
    if (completedTransfersStore.has(transferId)) {
      console.log(`[Streamy] handleTransferFailure ignored for completed transfer ${transferId}`);
      return;
    }
    closeConnections(transferId);
    setTransfers((prev) => 
      prev.map((t) => {
        if (t.id === transferId) {
          return { ...t, status: 'failed', error: errorMsg };
        }
        return t;
      })
    );
    playCancelSound();
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('streamy-lang', lang);
  };

  const t = (key: string, variables?: Record<string, any>) => {
    return getTranslation(language, key, variables);
  };

  return (
    <StreamyContext.Provider value={{
      currentUser,
      onlineUsers,
      transfers,
      serverInfo,
      theme,
      language,
      isConnected,
      registerUser,
      updateProfile,
      sendRequest,
      acceptRequest,
      declineRequest,
      cancelTransfer,
      toggleTheme,
      clearCompletedTransfers,
      setLanguage,
      t
    }}>
      {children}
    </StreamyContext.Provider>
  );
};

export const useStreamy = () => {
  const context = useContext(StreamyContext);
  if (context === undefined) {
    throw new Error('useStreamy must be used within a StreamyProvider');
  }
  return context;
};
