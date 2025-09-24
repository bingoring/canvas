import { io, Socket } from 'socket.io-client';
import type { WebSocketEvents, ChatRequest, ChatResponse } from '@types/api';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('auth_token');

      if (!token) {
        reject(new Error('No auth token found'));
        return;
      }

      this.socket = io(import.meta.env.VITE_WS_URL || 'ws://localhost:3000', {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.handleReconnect();
      });

      this.setupEventListeners();
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(() => {
        this.connect().catch(console.error);
      }, 1000 * this.reconnectAttempts);
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // AI 응답 수신
    this.socket.on('ai_response', (data: ChatResponse) => {
      this.emit('ai_response', data);
    });

    // AI 타이핑 상태
    this.socket.on('ai_typing', (data: { agentId: string }) => {
      this.emit('ai_typing', data);
    });

    // 스트리밍 메시지 청크
    this.socket.on('message_chunk', (data: { chunk: string }) => {
      this.emit('message_chunk', data);
    });
  }

  // 메시지 전송
  sendMessage(message: ChatRequest) {
    if (this.socket) {
      this.socket.emit('send_message', message);
    }
  }

  // 이벤트 리스너 추가
  on<K extends keyof WebSocketEvents>(event: K, callback: (data: WebSocketEvents[K]) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // 이벤트 리스너 제거
  off<K extends keyof WebSocketEvents>(event: K, callback?: (data: WebSocketEvents[K]) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  // 이벤트 발생
  private emit(event: string, data: any) {
    // 커스텀 이벤트 발생 (React 컴포넌트에서 구독 가능)
    window.dispatchEvent(new CustomEvent(`ws_${event}`, { detail: data }));
  }

  // 연결 상태 확인
  get isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const wsService = new WebSocketService();
export default wsService;