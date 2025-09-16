# NestJS Server Implementation Plan for Everytime Canvas Demo

## 1. 프로젝트 개요 (Project Overview)

이 문서는 Everytime Canvas 기능 데모를 위한 NestJS 백엔드 서버 구현 계획서입니다. 키워드/스케치 기반 AI 콘텐츠 생성 기능을 제공하며, Amazon Bedrock을 활용한 이미지 생성과 지능형 캐싱 시스템을 포함합니다.

### 1.1 핵심 기능
- 키워드 기반 AI 이미지 생성
- 스케치 기반 AI 이미지 변환
- 지능형 캐싱 시스템 (RAG 패턴)
- 커뮤니티 댓글 및 1:1 채팅 시뮬레이션
- Swagger API 문서화

## 2. 기술 스택 (Technology Stack)

### 2.1 Core Framework
- **NestJS**: TypeScript 기반 백엔드 프레임워크
- **TypeScript**: 타입 안전성 보장
- **Node.js**: 런타임 환경

### 2.2 AI & ML Services
- **Amazon Bedrock**: 이미지 생성 Foundation Model
  - Titan Image Generator G1
  - Stability.ai Stable Diffusion XL
- **Amazon Titan Embeddings G1**: 텍스트/이미지 벡터 임베딩

### 2.3 Database & Storage
- **Amazon OpenSearch Serverless**: Vector DB for intelligent caching
- **Amazon S3**: 이미지 파일 저장
- **PostgreSQL/MongoDB**: 메타데이터 및 세션 관리

### 2.4 Orchestration & Memory
- **LangChain**: AI 모델 체인 구성
- **LangGraph**: 상태 기반 AI 에이전트 워크플로우
- **Redis**: 세션 및 임시 캐시 관리

### 2.5 API Documentation
- **Swagger/OpenAPI**: API 문서 자동화
- **NestJS Swagger**: NestJS 통합 Swagger 모듈

## 3. 프로젝트 구조 (Project Structure)

```
canvas-backend/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── modules/
│   │   ├── ai-canvas/
│   │   │   ├── ai-canvas.module.ts
│   │   │   ├── ai-canvas.controller.ts
│   │   │   ├── ai-canvas.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── generate-image.dto.ts
│   │   │   │   ├── sketch-to-image.dto.ts
│   │   │   │   └── image-response.dto.ts
│   │   │   └── interfaces/
│   │   │       └── ai-canvas.interface.ts
│   │   ├── bedrock/
│   │   │   ├── bedrock.module.ts
│   │   │   ├── bedrock.service.ts
│   │   │   └── interfaces/
│   │   │       └── bedrock.interface.ts
│   │   ├── cache/
│   │   │   ├── cache.module.ts
│   │   │   ├── cache.service.ts
│   │   │   ├── vector-search.service.ts
│   │   │   └── embedding.service.ts
│   │   ├── storage/
│   │   │   ├── storage.module.ts
│   │   │   ├── s3.service.ts
│   │   │   └── interfaces/
│   │   │       └── storage.interface.ts
│   │   ├── langraph/
│   │   │   ├── langraph.module.ts
│   │   │   ├── langraph.service.ts
│   │   │   ├── agents/
│   │   │   │   ├── image-generation.agent.ts
│   │   │   │   └── cache-lookup.agent.ts
│   │   │   └── workflows/
│   │   │       └── ai-canvas.workflow.ts
│   │   ├── demo/
│   │   │   ├── demo.module.ts
│   │   │   ├── demo.controller.ts
│   │   │   ├── demo.service.ts
│   │   │   └── dto/
│   │   │       ├── comment.dto.ts
│   │   │       └── chat.dto.ts
│   │   └── health/
│   │       ├── health.module.ts
│   │       └── health.controller.ts
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── aws.config.ts
│   │   └── database.config.ts
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── utils/
│   └── types/
│       └── global.types.ts
├── test/
├── docs/
├── package.json
├── tsconfig.json
├── nest-cli.json
└── .env.example
```

## 4. API 설계 및 Swagger 통합 (API Design & Swagger Integration)

### 4.1 Swagger 설정

```typescript
// main.ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('Everytime Canvas API')
  .setDescription('AI-powered image generation API for Everytime Canvas demo')
  .setVersion('1.0')
  .addTag('ai-canvas', 'AI Canvas image generation endpoints')
  .addTag('demo', 'Demo simulation endpoints')
  .addTag('health', 'Health check endpoints')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api-docs', app, document);
```

### 4.2 핵심 API 엔드포인트

#### 4.2.1 AI Canvas API

```typescript
// ai-canvas.controller.ts
@ApiTags('ai-canvas')
@Controller('ai-canvas')
export class AiCanvasController {

  @Post('generate/keyword')
  @ApiOperation({ summary: '키워드 기반 이미지 생성' })
  @ApiResponse({ status: 201, description: '이미지 생성 성공', type: ImageResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  @ApiResponse({ status: 500, description: '서버 오류' })
  async generateFromKeyword(
    @Body() generateImageDto: GenerateImageDto
  ): Promise<ImageResponseDto> {
    // 키워드 기반 이미지 생성 로직
  }

  @Post('generate/sketch')
  @ApiOperation({ summary: '스케치 기반 이미지 변환' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: '이미지 변환 성공', type: ImageResponseDto })
  async generateFromSketch(
    @Body() sketchToImageDto: SketchToImageDto,
    @UploadedFile() sketchFile: Express.Multer.File
  ): Promise<ImageResponseDto> {
    // 스케치 기반 이미지 변환 로직
  }

  @Post('refine')
  @ApiOperation({ summary: '이미지 수정 요청' })
  @ApiResponse({ status: 201, description: '이미지 수정 성공', type: ImageResponseDto })
  async refineImage(
    @Body() refineImageDto: RefineImageDto
  ): Promise<ImageResponseDto> {
    // 이미지 수정 로직
  }

  @Get('images/:imageId')
  @ApiOperation({ summary: '생성된 이미지 조회' })
  @ApiParam({ name: 'imageId', description: '이미지 ID' })
  @ApiResponse({ status: 200, description: '이미지 조회 성공' })
  async getImage(@Param('imageId') imageId: string) {
    // 이미지 조회 로직
  }
}
```

#### 4.2.2 Demo Simulation API

```typescript
// demo.controller.ts
@ApiTags('demo')
@Controller('demo')
export class DemoController {

  @Post('community/comment')
  @ApiOperation({ summary: '커뮤니티 댓글 시뮬레이션' })
  @ApiResponse({ status: 201, description: '댓글 등록 성공', type: CommentResponseDto })
  async addComment(
    @Body() commentDto: CommentDto
  ): Promise<CommentResponseDto> {
    // 커뮤니티 댓글 시뮬레이션 로직
  }

  @Post('chat/message')
  @ApiOperation({ summary: '1:1 채팅 시뮬레이션' })
  @ApiResponse({ status: 201, description: '메시지 전송 성공', type: ChatResponseDto })
  async sendChatMessage(
    @Body() chatDto: ChatDto
  ): Promise<ChatResponseDto> {
    // 1:1 채팅 시뮬레이션 로직
  }

  @Get('community/posts')
  @ApiOperation({ summary: '샘플 게시글 조회' })
  @ApiResponse({ status: 200, description: '게시글 조회 성공', type: [PostDto] })
  async getSamplePosts(): Promise<PostDto[]> {
    // 샘플 게시글 반환
  }
}
```

### 4.3 DTO 정의 및 Swagger 문서화

```typescript
// dto/generate-image.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum } from 'class-validator';

export class GenerateImageDto {
  @ApiProperty({
    description: '이미지 생성 키워드',
    example: '시험 해방'
  })
  @IsString()
  @IsNotEmpty()
  keyword: string;

  @ApiProperty({
    description: '생성할 이미지 수',
    example: 4,
    default: 4
  })
  @IsOptional()
  count?: number = 4;

  @ApiProperty({
    description: '이미지 스타일',
    enum: ['cartoon', 'realistic', 'anime', 'meme'],
    example: 'cartoon'
  })
  @IsOptional()
  @IsEnum(['cartoon', 'realistic', 'anime', 'meme'])
  style?: string = 'cartoon';

  @ApiProperty({
    description: '추가 프롬프트',
    example: '밝고 재미있게',
    required: false
  })
  @IsOptional()
  @IsString()
  additionalPrompt?: string;
}

// dto/sketch-to-image.dto.ts
export class SketchToImageDto {
  @ApiProperty({
    description: '스케치 파일',
    type: 'string',
    format: 'binary'
  })
  sketch: any;

  @ApiProperty({
    description: '변환 스타일',
    example: 'cute_emoticon'
  })
  @IsOptional()
  @IsString()
  style?: string = 'cute_emoticon';

  @ApiProperty({
    description: '색상 테마',
    example: 'colorful'
  })
  @IsOptional()
  @IsString()
  colorTheme?: string = 'colorful';
}

// dto/image-response.dto.ts
export class ImageResponseDto {
  @ApiProperty({ description: '생성된 이미지 목록' })
  images: GeneratedImageDto[];

  @ApiProperty({ description: '캐시에서 조회 여부' })
  fromCache: boolean;

  @ApiProperty({ description: '응답 시간 (ms)' })
  responseTime: number;

  @ApiProperty({ description: '사용된 모델명' })
  modelUsed: string;
}

export class GeneratedImageDto {
  @ApiProperty({ description: '이미지 ID' })
  id: string;

  @ApiProperty({ description: '이미지 URL' })
  url: string;

  @ApiProperty({ description: '썸네일 URL' })
  thumbnailUrl: string;

  @ApiProperty({ description: '이미지 설명' })
  description: string;

  @ApiProperty({ description: '신뢰도 점수' })
  confidence: number;
}
```

## 5. 핵심 서비스 구현 (Core Service Implementation)

### 5.1 AI Canvas Service

```typescript
// ai-canvas.service.ts
@Injectable()
export class AiCanvasService {
  constructor(
    private readonly bedrockService: BedrockService,
    private readonly cacheService: CacheService,
    private readonly langGraphService: LangGraphService,
    private readonly storageService: StorageService,
  ) {}

  async generateFromKeyword(dto: GenerateImageDto): Promise<ImageResponseDto> {
    const startTime = Date.now();

    // LangGraph 워크플로우 실행
    const result = await this.langGraphService.executeImageGenerationWorkflow({
      type: 'keyword',
      input: dto.keyword,
      style: dto.style,
      count: dto.count,
      additionalPrompt: dto.additionalPrompt,
    });

    return {
      images: result.images,
      fromCache: result.fromCache,
      responseTime: Date.now() - startTime,
      modelUsed: result.modelUsed,
    };
  }

  async generateFromSketch(
    dto: SketchToImageDto,
    sketchFile: Express.Multer.File
  ): Promise<ImageResponseDto> {
    const startTime = Date.now();

    // 스케치 파일을 S3에 임시 저장
    const sketchUrl = await this.storageService.uploadSketch(sketchFile);

    // LangGraph 워크플로우 실행
    const result = await this.langGraphService.executeImageGenerationWorkflow({
      type: 'sketch',
      input: sketchUrl,
      style: dto.style,
      colorTheme: dto.colorTheme,
    });

    return {
      images: result.images,
      fromCache: result.fromCache,
      responseTime: Date.now() - startTime,
      modelUsed: result.modelUsed,
    };
  }
}
```

### 5.2 LangGraph Workflow Service

```typescript
// langraph.service.ts
@Injectable()
export class LangGraphService {
  private workflow: StateGraph;

  constructor(
    private readonly bedrockService: BedrockService,
    private readonly cacheService: CacheService,
    private readonly embeddingService: EmbeddingService,
  ) {
    this.initializeWorkflow();
  }

  private initializeWorkflow() {
    this.workflow = new StateGraph()
      .addNode('analyze_input', this.analyzeInputNode.bind(this))
      .addNode('cache_lookup', this.cacheLookupNode.bind(this))
      .addNode('generate_image', this.generateImageNode.bind(this))
      .addNode('save_cache', this.saveCacheNode.bind(this))
      .addNode('return_result', this.returnResultNode.bind(this))
      .addEdge('analyze_input', 'cache_lookup')
      .addConditionalEdges(
        'cache_lookup',
        this.shouldGenerateNew.bind(this),
        {
          generate: 'generate_image',
          return: 'return_result',
        }
      )
      .addEdge('generate_image', 'save_cache')
      .addEdge('save_cache', 'return_result')
      .setEntryPoint('analyze_input');
  }

  async executeImageGenerationWorkflow(input: any): Promise<any> {
    const result = await this.workflow.invoke(input);
    return result;
  }

  private async analyzeInputNode(state: any): Promise<any> {
    // 입력 분석 및 정규화
    const normalizedInput = await this.normalizeInput(state);
    return { ...state, normalizedInput };
  }

  private async cacheLookupNode(state: any): Promise<any> {
    // 지능형 캐시 조회
    const embedding = await this.embeddingService.generateEmbedding(
      state.normalizedInput
    );

    const cachedResults = await this.cacheService.searchSimilar(
      embedding,
      0.95 // 95% 유사도 임계값
    );

    return { ...state, cachedResults, embedding };
  }

  private async generateImageNode(state: any): Promise<any> {
    // Bedrock을 통한 이미지 생성
    const images = await this.bedrockService.generateImages(state);
    return { ...state, images, fromCache: false };
  }

  private async saveCacheNode(state: any): Promise<any> {
    // 생성된 이미지를 캐시에 저장
    await this.cacheService.saveToCache(state.embedding, state.images);
    return state;
  }

  private async returnResultNode(state: any): Promise<any> {
    return {
      images: state.images,
      fromCache: state.fromCache || false,
      modelUsed: state.modelUsed || 'bedrock-titan',
    };
  }

  private shouldGenerateNew(state: any): string {
    return state.cachedResults?.length > 0 ? 'return' : 'generate';
  }
}
```

### 5.3 Bedrock Service

```typescript
// bedrock.service.ts
@Injectable()
export class BedrockService {
  private bedrockClient: BedrockRuntimeClient;

  constructor(private configService: ConfigService) {
    this.bedrockClient = new BedrockRuntimeClient({
      region: this.configService.get('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async generateImages(params: any): Promise<GeneratedImageDto[]> {
    const modelId = this.getModelId(params.style);

    const prompt = this.buildPrompt(params);

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        textToImageParams: {
          text: prompt,
          numberOfImages: params.count || 4,
        },
        taskType: 'TEXT_IMAGE',
        imageGenerationConfig: {
          cfgScale: 8,
          seed: Math.floor(Math.random() * 1000000),
          width: 512,
          height: 512,
        },
      }),
    });

    const response = await this.bedrockClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));

    return this.processBedrockResponse(result);
  }

  private getModelId(style: string): string {
    const modelMap = {
      cartoon: 'amazon.titan-image-generator-v1',
      realistic: 'stability.stable-diffusion-xl-v1',
      anime: 'amazon.titan-image-generator-v1',
      meme: 'amazon.titan-image-generator-v1',
    };

    return modelMap[style] || modelMap.cartoon;
  }

  private buildPrompt(params: any): string {
    let prompt = params.input;

    if (params.style) {
      const stylePrompts = {
        cartoon: 'cartoon style, cute, colorful',
        realistic: 'photorealistic, high quality',
        anime: 'anime style, manga',
        meme: 'meme style, funny, expressive',
      };
      prompt += `, ${stylePrompts[params.style]}`;
    }

    if (params.additionalPrompt) {
      prompt += `, ${params.additionalPrompt}`;
    }

    return prompt;
  }

  private async processBedrockResponse(result: any): Promise<GeneratedImageDto[]> {
    const images: GeneratedImageDto[] = [];

    for (const image of result.images) {
      const imageBuffer = Buffer.from(image, 'base64');
      const imageId = uuidv4();

      // S3에 이미지 업로드
      const imageUrl = await this.uploadToS3(imageBuffer, imageId);
      const thumbnailUrl = await this.createThumbnail(imageBuffer, imageId);

      images.push({
        id: imageId,
        url: imageUrl,
        thumbnailUrl,
        description: 'AI generated image',
        confidence: 0.95,
      });
    }

    return images;
  }
}
```

### 5.4 Cache Service (Vector Search)

```typescript
// cache.service.ts
@Injectable()
export class CacheService {
  private openSearchClient: Client;

  constructor(private configService: ConfigService) {
    this.openSearchClient = new Client({
      node: this.configService.get('OPENSEARCH_ENDPOINT'),
      auth: {
        username: this.configService.get('OPENSEARCH_USERNAME'),
        password: this.configService.get('OPENSEARCH_PASSWORD'),
      },
    });
  }

  async searchSimilar(
    embedding: number[],
    threshold: number = 0.95
  ): Promise<any[]> {
    const searchQuery = {
      index: 'image-cache',
      body: {
        query: {
          script_score: {
            query: { match_all: {} },
            script: {
              source: "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
              params: {
                query_vector: embedding,
              },
            },
          },
        },
        min_score: threshold + 1.0, // cosine similarity + 1.0
        size: 10,
      },
    };

    const response = await this.openSearchClient.search(searchQuery);
    return response.body.hits.hits.map(hit => hit._source);
  }

  async saveToCache(embedding: number[], images: GeneratedImageDto[]): Promise<void> {
    const cacheDocument = {
      embedding,
      images,
      createdAt: new Date().toISOString(),
      hitCount: 0,
    };

    await this.openSearchClient.index({
      index: 'image-cache',
      body: cacheDocument,
    });
  }
}
```

## 6. 환경 설정 및 배포 (Configuration & Deployment)

### 6.1 환경 변수 설정

```bash
# .env
# Application
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3001

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=canvas-demo-images
BEDROCK_MODEL_ID=amazon.titan-image-generator-v1

# OpenSearch Configuration
OPENSEARCH_ENDPOINT=https://your-opensearch-domain.region.es.amazonaws.com
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=your_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=canvas_demo
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_db_password
```

### 6.2 Docker 설정

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - redis
      - postgres
    volumes:
      - ./logs:/app/logs

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass ${REDIS_PASSWORD}

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: ${DATABASE_NAME}
      POSTGRES_USER: ${DATABASE_USERNAME}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 7. 테스트 전략 (Testing Strategy)

### 7.1 단위 테스트

```typescript
// ai-canvas.service.spec.ts
describe('AiCanvasService', () => {
  let service: AiCanvasService;
  let bedrockService: jest.Mocked<BedrockService>;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiCanvasService,
        {
          provide: BedrockService,
          useValue: {
            generateImages: jest.fn(),
          },
        },
        {
          provide: CacheService,
          useValue: {
            searchSimilar: jest.fn(),
            saveToCache: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AiCanvasService>(AiCanvasService);
    bedrockService = module.get(BedrockService);
    cacheService = module.get(CacheService);
  });

  describe('generateFromKeyword', () => {
    it('should generate images from keyword', async () => {
      // Test implementation
    });

    it('should return cached images when available', async () => {
      // Test implementation
    });
  });
});
```

### 7.2 통합 테스트

```typescript
// app.e2e-spec.ts
describe('AiCanvasController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ai-canvas/generate/keyword (POST)', () => {
    return request(app.getHttpServer())
      .post('/ai-canvas/generate/keyword')
      .send({
        keyword: '시험 해방',
        count: 4,
        style: 'cartoon',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.images).toBeDefined();
        expect(res.body.images.length).toBe(4);
      });
  });
});
```

## 8. 모니터링 및 로깅 (Monitoring & Logging)

### 8.1 로깅 설정

```typescript
// common/interceptors/logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const timestamp = new Date().toISOString();

    this.logger.log(`Incoming Request: ${method} ${url}`, {
      timestamp,
      body: this.sanitizeBody(body),
    });

    return next.handle().pipe(
      tap((data) => {
        this.logger.log(`Response: ${method} ${url}`, {
          timestamp: new Date().toISOString(),
          data: data ? 'Success' : 'No data',
        });
      }),
      catchError((error) => {
        this.logger.error(`Error: ${method} ${url}`, {
          timestamp: new Date().toISOString(),
          error: error.message,
          stack: error.stack,
        });
        throw error;
      })
    );
  }

  private sanitizeBody(body: any): any {
    // 민감한 정보 제거 로직
    const sanitized = { ...body };
    delete sanitized.password;
    delete sanitized.token;
    return sanitized;
  }
}
```

### 8.2 성능 메트릭

```typescript
// common/interceptors/metrics.interceptor.ts
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        // 메트릭 수집 로직
        this.recordMetric(request.route.path, duration);
      })
    );
  }

  private recordMetric(endpoint: string, duration: number) {
    // CloudWatch 또는 기타 메트릭 서비스로 전송
  }
}
```

## 9. 보안 고려사항 (Security Considerations)

### 9.1 API 보안

```typescript
// common/guards/throttler.guard.ts
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ip; // IP 기반 rate limiting
  }
}

// main.ts에서 전역 적용
app.useGlobalGuards(new CustomThrottlerGuard());
```

### 9.2 입력 검증

```typescript
// common/pipes/validation.pipe.ts
@Injectable()
export class CustomValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true, // DTO에 정의되지 않은 속성 제거
      forbidNonWhitelisted: true, // 허용되지 않은 속성 감지 시 에러
      transform: true, // 자동 타입 변환
      validateCustomDecorators: true,
    });
  }
}
```

## 10. 성능 최적화 (Performance Optimization)

### 10.1 캐싱 전략

```typescript
// common/decorators/cache.decorator.ts
export function CacheResult(ttl: number = 300) {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;

      // 캐시 조회
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // 메서드 실행
      const result = await method.apply(this, args);

      // 캐시 저장
      await this.redisService.setex(cacheKey, ttl, JSON.stringify(result));

      return result;
    };
  };
}
```

### 10.2 이미지 최적화

```typescript
// storage/image-optimization.service.ts
@Injectable()
export class ImageOptimizationService {
  async createThumbnail(
    imageBuffer: Buffer,
    width: number = 150,
    height: number = 150
  ): Promise<Buffer> {
    return sharp(imageBuffer)
      .resize(width, height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toBuffer();
  }

  async optimizeForWeb(imageBuffer: Buffer): Promise<Buffer> {
    return sharp(imageBuffer)
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
  }
}
```

## 11. 배포 및 CI/CD (Deployment & CI/CD)

### 11.1 GitHub Actions 설정

```yaml
# .github/workflows/deploy.yml
name: Deploy Canvas Backend

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Build and push Docker image
        run: |
          docker build -t canvas-backend .
          docker tag canvas-backend:latest $ECR_REGISTRY/canvas-backend:latest
          docker push $ECR_REGISTRY/canvas-backend:latest

      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster canvas-cluster --service canvas-backend --force-new-deployment
```

## 12. 구현 우선순위 (Implementation Priority)

### Phase 1: 기본 구조 구축 (Week 1-2)
1. NestJS 프로젝트 초기화 및 기본 모듈 구성
2. Swagger 설정 및 기본 API 문서화
3. AWS SDK 연동 및 Bedrock 서비스 구현
4. 기본 이미지 생성 API 구현

### Phase 2: 핵심 기능 구현 (Week 3-4)
1. LangGraph 워크플로우 구현
2. Vector Search 및 캐싱 시스템 구현
3. 키워드/스케치 기반 이미지 생성 완성
4. Demo 시뮬레이션 API 구현

### Phase 3: 최적화 및 테스트 (Week 5-6)
1. 성능 최적화 및 캐싱 전략 적용
2. 단위/통합 테스트 작성
3. 보안 강화 및 에러 핸들링
4. 모니터링 및 로깅 시스템 구축

### Phase 4: 배포 및 운영 (Week 7-8)
1. Docker 컨테이너화
2. CI/CD 파이프라인 구축
3. AWS 인프라 배포
4. 성능 테스트 및 최종 검증

## 13. 예상 비용 및 리소스 (Estimated Cost & Resources)

### 13.1 AWS 서비스 비용 (월 예상)
- **Amazon Bedrock**: $50-100 (이미지 생성 기준)
- **Amazon S3**: $5-10 (이미지 저장)
- **Amazon OpenSearch**: $30-50 (검색 서비스)
- **EC2/ECS**: $20-40 (컨테이너 실행)
- **총 예상 비용**: $105-200/월

### 13.2 개발 리소스
- **백엔드 개발자**: 1명 (8주)
- **DevOps 엔지니어**: 0.5명 (2주)
- **QA 엔지니어**: 0.5명 (2주)

## 14. 결론 (Conclusion)

본 구현 계획은 Everytime Canvas 데모의 핵심 요구사항을 충족하면서도 확장 가능한 아키텍처를 제공합니다. NestJS의 모듈식 구조와 AWS Bedrock의 강력한 AI 기능, 그리고 LangGraph의 지능형 워크플로우를 통해 사용자에게 뛰어난 AI 콘텐츠 생성 경험을 제공할 수 있습니다.

특히 Swagger를 통한 API 문서화와 지능형 캐싱 시스템은 개발 효율성과 운영 비용 최적화에 크게 기여할 것으로 예상됩니다.