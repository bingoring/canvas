import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  ApiResponse,
  ChatRequest,
  ChatResponse,
  ChatSession,
  ImageGenerateRequest,
  ImageResponse,
  GalleryResponse,
  SchoolInfoRequest,
  SchoolInfoResponse,
  UserProfile,
  ContentInteraction
} from '@types/api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
      timeout: 30000, // AI 응답 시간 고려하여 30초
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 요청 인터셉터 - JWT 토큰 자동 추가
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 응답 인터셉터 - 에러 처리
    this.client.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // 토큰 만료 시 로그아웃 처리
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error.response?.data || error.message);
      }
    );
  }

  // 인증
  setAuthToken(token: string) {
    localStorage.setItem('auth_token', token);
  }

  removeAuthToken() {
    localStorage.removeItem('auth_token');
  }

  // Chat API
  async sendMessage(request: ChatRequest): Promise<ApiResponse<ChatResponse>> {
    return this.client.post('/api/chat/send', request);
  }

  async getChatSessions(): Promise<ApiResponse<ChatSession[]>> {
    return this.client.get('/api/chat/sessions');
  }

  // Image API
  async generateImage(request: ImageGenerateRequest): Promise<ApiResponse<ImageResponse>> {
    return this.client.post('/api/image/generate', request);
  }

  async getGallery(params?: {
    page?: number;
    limit?: number;
    category?: string;
    style?: string;
    search?: string;
  }): Promise<ApiResponse<GalleryResponse>> {
    return this.client.get('/api/image/gallery', { params });
  }

  // Content Interaction
  async likeContent(contentId: string): Promise<ApiResponse<ContentInteraction>> {
    return this.client.post(`/api/content/${contentId}/like`);
  }

  async useContent(contentId: string, context: {
    context: 'chatroom' | 'board' | 'comment';
    targetId: string;
  }): Promise<ApiResponse<ContentInteraction>> {
    return this.client.post(`/api/content/${contentId}/use`, context);
  }

  // School Info API
  async askSchoolInfo(request: SchoolInfoRequest): Promise<ApiResponse<SchoolInfoResponse>> {
    return this.client.post('/api/school/ask', request);
  }

  // User Profile
  async getUserProfile(): Promise<ApiResponse<UserProfile>> {
    return this.client.get('/api/user/profile');
  }

  async updateUserProfile(profile: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    return this.client.put('/api/user/profile', profile);
  }

  // Document Generation (추가 구현 예정)
  async generateDocument(request: {
    type: 'presentation' | 'report' | 'proposal';
    topic: string;
    audience: string;
    requirements: any;
  }): Promise<ApiResponse<any>> {
    return this.client.post('/api/document/generate', request);
  }
}

export const apiService = new ApiService();
export default apiService;