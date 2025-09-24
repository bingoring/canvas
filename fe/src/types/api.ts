// BE API 타입 정의 (README.md 기반)

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

// Chat API Types
export interface ChatRequest {
  message: string;
  sessionId?: string;
  type?: 'general' | 'image_creation' | 'school_info';
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  suggestions: string[];
  agentType: string;
}

export interface ChatSession {
  sessionId: string;
  type: 'general' | 'image_creation' | 'school_info';
  lastMessage: string;
  createdAt: string;
  lastActiveAt: string;
}

// Image API Types
export interface ImageGenerateRequest {
  prompt: string;
  style?: 'cartoon' | 'realistic' | 'anime' | 'meme';
  category?: 'emoticon' | 'meme' | 'sticker';
  isPublic?: boolean;
}

export interface ImageResponse {
  contentId: string;
  imageUrl: string;
  thumbnailUrl: string;
  prompt: string;
  style: string;
  generatedAt: string;
  variations: string[];
}

export interface ImageItem {
  contentId: string;
  imageUrl: string;
  thumbnailUrl: string;
  title: string;
  category: string;
  style: string;
  likes: number;
  uses: number;
  tags: string[];
  createdAt: string;
}

export interface GalleryResponse {
  images: ImageItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// School Info API Types
export interface SchoolInfoRequest {
  question: string;
  context?: string;
}

export interface SchoolInfoResponse {
  answer: string;
  sources: Array<{
    title: string;
    url: string;
    relevance: number;
  }>;
  confidence: number;
  relatedQuestions: string[];
  lastUpdated: string;
}

// User Profile Types
export interface UserProfile {
  userId: string;
  email: string;
  university: string;
  major: string;
  year: number;
  preferences: {
    favoriteStyles: string[];
    notifications: boolean;
  };
  statistics: {
    contentCreated: number;
    contentLiked: number;
    totalViews: number;
  };
}

// Content Interaction Types
export interface ContentInteraction {
  liked?: boolean;
  totalLikes?: number;
  used?: boolean;
  totalUses?: number;
}

// WebSocket Event Types
export interface WebSocketEvents {
  send_message: ChatRequest;
  ai_response: ChatResponse;
  ai_typing: { agentId: string };
  message_chunk: { chunk: string };
}