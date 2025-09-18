# 학교 생활 AI Companion 플랫폼 개발 계획서

## 📋 프로젝트 개요

현재 Canvas 백엔드를 기반으로 한 종합적인 학교 생활 AI 도우미 플랫폼으로 발전시키는 계획입니다.

### 핵심 기능
- **AI 채팅 컴패니언**: 학교 생활 전반 지원
- **이모티콘/밈 제작소**: AI 기반 이미지 생성 및 공유
- **학교 정보 RAG**: 에브리타임 데이터 기반 질의응답
- **문서 생성**: PPT, 레포트 등 학업 자료 제작
- **소셜 기능**: 이모티콘 추천, 사용, 공유

## 🚀 개발 계획

### Phase 1: 인프라 확장 (4-6주)
- [ ] RAG 시스템 구축 (벡터 DB + 임베딩)
- [ ] 실시간 채팅 시스템 (WebSocket)
- [ ] 이미지 저장소 및 CDN 설정
- [ ] 사용자 인증 및 권한 시스템
- [ ] Redis 캐싱 레이어

### Phase 2: AI 에이전트 개발 (6-8주)
- [ ] 대화형 AI 컴패니언 에이전트
- [ ] 이미지 생성 전문 에이전트
- [ ] 문서 생성 에이전트 (PPT, 레포트)
- [ ] 학교 정보 검색 에이전트
- [ ] 멀티모달 콘텐츠 처리 에이전트

### Phase 3: 소셜 기능 구현 (4-6주)
- [ ] 이모티콘 갤러리 및 추천 시스템
- [ ] 사용자 프로필 및 팔로우 기능
- [ ] 콘텐츠 조회수, 좋아요 통계
- [ ] 인기 이모티콘 랭킹 시스템
- [ ] 태그 기반 검색 및 분류

### Phase 4: 통합 및 최적화 (3-4주)
- [ ] 성능 최적화 및 로드 밸런싱
- [ ] 모니터링 및 알림 시스템
- [ ] 사용자 경험 개선
- [ ] 보안 강화 및 스팸 방지

## 🏗️ 시스템 아키텍처

### 서버 구성도 생성 프롬프트

```
Create a system architecture diagram with the following components:

**Frontend Layer:**
- Web App (React/Next.js)
- Mobile App (React Native)
- Admin Dashboard

**API Gateway:**
- Load Balancer (Nginx)
- Rate Limiting
- Authentication Middleware

**Core Services:**
- AI Companion API (Node.js/NestJS)
- Image Generation Service
- Document Generation Service
- Real-time Chat Service (WebSocket)
- User Management Service
- Content Management Service

**AI Layer:**
- Conversation Agent (GPT-4/Claude)
- Image Generation Agent (DALL-E/Stable Diffusion)
- Document Agent (GPT-4 + Templates)
- RAG Search Agent (Vector Search + LLM)
- Content Moderation Agent

**Data Layer:**
- PostgreSQL (User, Content, Metadata)
- Vector Database (Embeddings, RAG)
- Redis (Cache, Sessions, Real-time)
- S3/MinIO (Images, Documents, Files)
- Elasticsearch (Search Index)

**External APIs:**
- OpenAI/Anthropic
- AWS Bedrock
- Everytime Data Source
- School Information APIs

**Infrastructure:**
- Docker Containers
- Kubernetes Cluster
- CI/CD Pipeline
- Monitoring (Prometheus/Grafana)

Draw this as a layered architecture diagram showing data flow between components.
```

## 📊 데이터베이스 설계

### 추가 필요 스키마

```typescript
// 사용자 프로필 확장
interface UserProfile {
  id: string;
  university: string;
  major: string;
  year: number;
  preferences: {
    favoriteStyles: string[];
    privacySettings: object;
  };
  statistics: {
    contentCreated: number;
    contentLiked: number;
    totalViews: number;
  };
}

// 이모티콘/밈 콘텐츠
interface EmoticonContent {
  id: string;
  creatorId: string;
  title: string;
  tags: string[];
  imageUrl: string;
  thumbnailUrl: string;
  category: 'emoticon' | 'meme' | 'sticker';
  isPublic: boolean;
  likes: number;
  uses: number;
  downloads: number;
  moderationStatus: 'pending' | 'approved' | 'rejected';
}

// 대화 세션
interface ChatSession {
  id: string;
  userId: string;
  type: 'general' | 'image_creation' | 'document_help' | 'school_info';
  messages: ChatMessage[];
  context: object;
  createdAt: Date;
  lastActiveAt: Date;
}

// RAG 문서
interface RAGDocument {
  id: string;
  source: 'everytime' | 'school_site' | 'manual';
  title: string;
  content: string;
  embeddings: number[];
  metadata: {
    category: string;
    timestamp: Date;
    relevanceScore: number;
  };
}
```

## 🤖 AI 에이전트 아키텍처

### 에이전트 구성
1. **Master Coordinator**: 사용자 의도 파악 및 적절한 에이전트 라우팅
2. **Conversation Agent**: 일반 대화 및 학교 생활 상담
3. **Image Creator Agent**: 이모티콘/밈 생성 전문
4. **Document Assistant**: PPT, 레포트 작성 도움
5. **School Info Agent**: RAG 기반 학교 정보 제공
6. **Content Moderator**: 생성 콘텐츠 자동 검수

### 에이전트 워크플로우
```
사용자 입력 → Master Coordinator → 의도 분석 → 전문 에이전트 호출 → 결과 통합 → 사용자 응답
```

## 🔧 기술 스택 확장

### 추가 필요 기술
- **Vector Database**: Pinecone/Weaviate (RAG)
- **Real-time**: Socket.io/WebSocket
- **Message Queue**: Redis/RabbitMQ
- **Search**: Elasticsearch
- **Monitoring**: Grafana/Prometheus
- **CDN**: CloudFlare/AWS CloudFront

## 📈 성능 및 확장성 고려사항

### 예상 부하
- 동시 사용자: 1,000-10,000명
- 일일 이미지 생성: 10,000-50,000개
- 실시간 채팅 세션: 500-2,000개
- RAG 쿼리: 50,000-200,000개/일

### 최적화 전략
- Redis 캐싱으로 응답 속도 개선
- CDN으로 이미지 배포 최적화
- 벡터 검색 인덱스 최적화
- 비동기 이미지 생성 큐 처리

## 📝 개발 우선순위

### 1단계 (현재 → 4주)
1. RAG 시스템 기본 구축
2. 실시간 채팅 인프라
3. 사용자 인증 시스템 강화

### 2단계 (4주 → 8주)
1. AI 에이전트 개발 시작
2. 이미지 생성 파이프라인
3. 기본 소셜 기능

### 3단계 (8주 → 12주)
1. 고급 AI 기능 추가
2. 성능 최적화
3. 사용자 경험 개선

---

이 계획서를 바탕으로 단계별 개발을 진행하면 종합적인 학교 생활 AI 플랫폼을 구축할 수 있습니다.