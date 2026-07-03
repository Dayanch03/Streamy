export interface User {
  id: string;
  username: string;
  avatar: string;
  deviceType: 'mobile' | 'desktop';
  joinedAt?: number;
}

export type TransferStatus = 
  | 'pending'       // Waiting for receiver to accept
  | 'connecting'    // WebRTC connection in progress
  | 'transferring'  // Data is being transferred
  | 'completed'     // Transfer finished successfully
  | 'cancelled'     // Transfer was cancelled by either party
  | 'failed';       // Transfer failed due to error

export type TransferType = 'send' | 'receive';

export interface FileTransfer {
  id: string;
  peerId: string;
  peerName: string;
  peerAvatar: string;
  type: TransferType;
  fileName: string;
  fileSize: number;
  fileType: string;
  progress: number; // 0 to 100
  speed: number;    // bytes per second
  eta: number;      // seconds remaining
  status: TransferStatus;
  error?: string;
  method: 'webrtc' | 'fallback';
  fileData?: Blob;  // Accumulated received file blob
}

export interface ServerInfo {
  ips: string[];
  port: number;
  url: string;
}

export interface SignalingMessage {
  type: string;
  payload: any;
}
