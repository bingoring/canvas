# 🚀 Canvas AI Companion - 개발 가이드

## 📁 프로젝트 구조

```
canvas/
├── be/                 # 백엔드 (NestJS) - 현재 BE 코드들
├── fe/                 # 프론트엔드 (React + Vite) - 새로 생성됨
├── docs/              # 프로젝트 문서
├── docker-compose.yml # 전체 서비스 개발 환경
└── README.md         # API 문서 및 프로젝트 가이드
```

## 🔧 개발 환경 설정

### 1. 전체 환경 실행 (권장)
```bash
# Docker Compose로 BE + FE + DB 모두 실행
docker-compose up --build

# 접속 URL
Frontend: http://localhost:3001
Backend API: http://localhost:3000
```

### 2. 개별 실행
```bash
# 백엔드만 실행
cd be
npm install
npm run start:dev

# 프론트엔드만 실행 (별도 터미널)
cd fe
npm install
npm run dev
```

## 🔗 BE/FE 연동 설정

### FE → BE API 연동
- **Base URL**: `http://localhost:3000`
- **WebSocket**: `ws://localhost:3000`
- **인증**: JWT Bearer Token

### 환경변수 설정
```bash
# be/.env
DATABASE_URL=mongodb://localhost:27017/canvas_ai
REDIS_URL=redis://localhost:6379
AWS_ACCESS_KEY_ID=your_key
OPENAI_API_KEY=your_key

# fe/.env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## 👥 개발 워크플로우

### FE 개발자
```bash
cd fe
npm run dev    # 개발 서버 실행 (HMR 지원)
npm run build  # 프로덕션 빌드
npm run lint   # 코드 검사
```

### BE 개발자
```bash
cd be
npm run start:dev  # 개발 서버 실행 (Hot Reload)
npm run build      # 프로덕션 빌드
npm run test       # 테스트 실행
```

## 🌊 데이터 플로우

```
FE (React) → API Service → BE (NestJS) → DB (MongoDB)
           ↘ WebSocket ↗
```

## 📱 FE 기술 스택

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite (빠른 HMR)
- **State**: Zustand + React Query
- **UI**: Material-UI + Emotion
- **Routing**: React Router v6
- **WebSocket**: Socket.io-client

## 🛠️ BE 기술 스택

- **Framework**: NestJS + TypeScript
- **Database**: MongoDB + Mongoose
- **Cache**: Redis
- **AI**: AWS Bedrock + OpenAI
- **WebSocket**: Socket.io
- **Authentication**: JWT

## 🔄 실시간 기능

### WebSocket 이벤트
```typescript
// FE에서 메시지 전송
wsService.sendMessage({
  message: "안녕하세요!",
  sessionId: "uuid",
  type: "general"
});

// AI 응답 수신
wsService.on('ai_response', (data) => {
  console.log('AI 응답:', data.response);
});
```

## 🧪 테스트 방법

### BE API 테스트
```bash
# Postman/Thunder Client 사용
POST http://localhost:3000/api/chat/send
Authorization: Bearer <jwt_token>
{
  "message": "테스트 메시지"
}
```

### FE 개발 시 Mock 데이터
```typescript
// fe/src/services/api.ts 수정해서 Mock 응답 사용 가능
const MOCK_MODE = true; // 개발 시 true로 설정
```

## 🚀 배포 가이드

### 개발 환경
```bash
docker-compose up --build
```

### 프로덕션 환경
```bash
docker-compose -f docker-compose.prod.yml up --build
```

## 📚 주요 문서

- [API 문서](./README.md) - FE 개발자를 위한 API 가이드
- [시스템 아키텍처](./docs/SYSTEM_ARCHITECTURE.md)
- [개발 로드맵](./docs/PROJECT_ROADMAP.md)
- [AI 에이전트 설계](./docs/AI_AGENTS_DESIGN.md)

## 🐛 트러블슈팅

### CORS 문제
BE에서 FE 도메인을 허용하도록 설정되어 있습니다.

### WebSocket 연결 실패
1. BE 서버가 실행 중인지 확인
2. JWT 토큰이 유효한지 확인
3. 방화벽 설정 확인

### 환경변수 인식 안됨
1. `.env` 파일이 올바른 위치에 있는지 확인
2. Vite는 `VITE_` 프리픽스 필요
3. 서버 재시작 필요

---

이 구조로 BE/FE 개발자가 독립적으로 작업할 수 있으며, API를 통해 깔끔하게 연동됩니다!