# Canvas AI Companion Platform

학교 생활을 돕는 AI 컴패니언 플랫폼 - 이미지 생성, 대화형 AI, 학교 정보 검색 통합 서비스

## 🚀 Quick Start

```bash
# 설치
npm install

# 개발 서버 실행
npm run start:dev

# 프로덕션 빌드
npm run build
npm run start:prod
```

## 📋 환경 설정

```env
# .env
DATABASE_URL=mongodb://localhost:27017/canvas_ai
REDIS_URL=redis://localhost:6379
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-northeast-2
OPENAI_API_KEY=your_openai_key
```

## 🏗️ 기술 스택

- **Backend**: NestJS, TypeScript
- **Database**: MongoDB, Redis
- **AI**: AWS Bedrock, OpenAI, LangChain
- **Image**: Sharp, AWS S3
- **Real-time**: WebSocket

---

# 🔗 API Documentation

## Base URL
```
Development: http://localhost:3000
Production: https://your-domain.com
```

## Authentication
모든 API 요청에는 Authorization 헤더가 필요합니다.
```
Authorization: Bearer <jwt_token>
```

## 📱 Core APIs

### 1. AI Chat API

#### POST /api/chat/send
AI와 대화하기

**Request:**
```json
{
  "message": "안녕하세요! 오늘 기분이 우울해요",
  "sessionId": "uuid-session-id",
  "type": "general" // "general" | "image_creation" | "school_info"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "안녕하세요! 우울한 기분이시군요. 무엇 때문에 그런지 얘기해 주시겠어요?",
    "sessionId": "uuid-session-id",
    "suggestions": [
      "스트레스 해소법 알려줘",
      "재미있는 이모티콘 만들어줘",
      "공부 동기부여 해줘"
    ],
    "agentType": "conversation"
  }
}
```

#### GET /api/chat/sessions
채팅 세션 목록 조회

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "sessionId": "uuid-session-id",
      "type": "general",
      "lastMessage": "안녕하세요!",
      "createdAt": "2024-01-15T10:30:00Z",
      "lastActiveAt": "2024-01-15T11:45:00Z"
    }
  ]
}
```

### 2. Image Generation API

#### POST /api/image/generate
AI 이미지 생성

**Request:**
```json
{
  "prompt": "귀여운 고양이 이모티콘, 웃고 있는 표정",
  "style": "cartoon", // "cartoon" | "realistic" | "anime" | "meme"
  "category": "emoticon", // "emoticon" | "meme" | "sticker"
  "isPublic": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "contentId": "uuid-content-id",
    "imageUrl": "https://cdn.example.com/images/cat-emoji.png",
    "thumbnailUrl": "https://cdn.example.com/thumbnails/cat-emoji.png",
    "prompt": "귀여운 고양이 이모티콘, 웃고 있는 표정",
    "style": "cartoon",
    "generatedAt": "2024-01-15T10:30:00Z",
    "variations": [
      "다른 표정으로 만들기",
      "색상 바꾸기"
    ]
  }
}
```

#### GET /api/image/gallery
이미지 갤러리 조회

**Query Parameters:**
- `page`: number (default: 1)
- `limit`: number (default: 20)
- `category`: "emoticon" | "meme" | "sticker"
- `style`: "cartoon" | "realistic" | "anime" | "meme"
- `search`: string

**Response:**
```json
{
  "success": true,
  "data": {
    "images": [
      {
        "contentId": "uuid-content-id",
        "imageUrl": "https://cdn.example.com/images/image.png",
        "thumbnailUrl": "https://cdn.example.com/thumbnails/image.png",
        "title": "귀여운 고양이",
        "category": "emoticon",
        "style": "cartoon",
        "likes": 15,
        "uses": 42,
        "tags": ["고양이", "귀여움", "이모티콘"],
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### 3. Content Interaction API

#### POST /api/content/{contentId}/like
콘텐츠 좋아요

**Response:**
```json
{
  "success": true,
  "data": {
    "liked": true,
    "totalLikes": 16
  }
}
```

#### POST /api/content/{contentId}/use
콘텐츠 사용 (채팅/게시판에서 사용)

**Request:**
```json
{
  "context": "chatroom", // "chatroom" | "board" | "comment"
  "targetId": "chatroom-id-or-post-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "used": true,
    "totalUses": 43
  }
}
```

### 4. School Info API (RAG)

#### POST /api/school/ask
학교 정보 질의응답

**Request:**
```json
{
  "question": "컴퓨터공학과 졸업 요건이 뭐예요?",
  "context": "graduation_requirements"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "컴퓨터공학과 졸업 요건은 다음과 같습니다:\n1. 총 130학점 이상\n2. 전공 필수 45학점\n3. 전공 선택 36학점...",
    "sources": [
      {
        "title": "2024학년도 학사요람",
        "url": "https://school.ac.kr/handbook",
        "relevance": 0.95
      }
    ],
    "confidence": 0.92,
    "relatedQuestions": [
      "전공 필수 과목은 무엇인가요?",
      "복수전공 요건은?",
      "졸업논문이 필요한가요?"
    ],
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

### 5. Document Generation API

#### POST /api/document/generate
문서 생성 (PPT, 레포트 등)

**Request:**
```json
{
  "type": "presentation", // "presentation" | "report" | "proposal"
  "topic": "인공지능의 미래",
  "audience": "대학생",
  "requirements": {
    "slides": 10,
    "includeImages": true,
    "style": "academic"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "uuid-doc-id",
    "outline": [
      "1. 서론 - 인공지능의 정의",
      "2. 현재 AI 기술 동향",
      "3. 미래 전망",
      "4. 결론"
    ],
    "content": {
      "slide1": {
        "title": "인공지능의 미래",
        "content": "...",
        "notes": "발표자 노트..."
      }
    },
    "downloadUrl": "https://api.example.com/documents/download/uuid-doc-id",
    "format": "pptx"
  }
}
```

### 6. User Profile API

#### GET /api/user/profile
사용자 프로필 조회

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid-user-id",
    "email": "user@university.ac.kr",
    "university": "서울대학교",
    "major": "컴퓨터공학과",
    "year": 3,
    "preferences": {
      "favoriteStyles": ["cartoon", "anime"],
      "notifications": true
    },
    "statistics": {
      "contentCreated": 25,
      "contentLiked": 120,
      "totalViews": 1500
    }
  }
}
```

## 📡 WebSocket Events

### Connection
```javascript
const socket = io('ws://localhost:3000', {
  auth: {
    token: 'jwt_token_here'
  }
});
```

### Chat Events
```javascript
// 메시지 전송
socket.emit('send_message', {
  sessionId: 'uuid-session-id',
  message: 'Hello AI!',
  type: 'general'
});

// AI 응답 수신
socket.on('ai_response', (data) => {
  console.log('AI Response:', data.message);
});

// 타이핑 상태
socket.on('ai_typing', (data) => {
  console.log('AI is typing...');
});
```

## ❌ Error Responses

모든 API는 다음 형식의 에러 응답을 반환합니다:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "요청 데이터가 올바르지 않습니다",
    "details": {
      "field": "message",
      "reason": "메시지는 필수 항목입니다"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Codes
- `VALIDATION_ERROR`: 요청 데이터 검증 실패
- `UNAUTHORIZED`: 인증 실패
- `FORBIDDEN`: 권한 부족
- `NOT_FOUND`: 리소스를 찾을 수 없음
- `RATE_LIMIT_EXCEEDED`: 요청 제한 초과
- `AI_SERVICE_ERROR`: AI 서비스 오류
- `INTERNAL_ERROR`: 서버 내부 오류

## 📊 Rate Limiting

- **일반 API**: 분당 60회
- **AI 생성 API**: 분당 10회
- **업로드 API**: 분당 20회

## 🔐 보안 고려사항

- 모든 API는 HTTPS 필수
- JWT 토큰은 1시간 유효
- 파일 업로드는 10MB 제한
- SQL Injection, XSS 방지 적용

---

이 API 문서를 참고하여 프론트엔드 연동을 진행하세요. 추가 질문이나 상세한 스키마가 필요하면 언제든 문의해 주세요!