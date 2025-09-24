import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsIn, IsNotEmpty } from 'class-validator';

/**
 * DTO for creating new image content
 */
export class CreateImageDto {
  @ApiProperty({
    description: 'Text prompt for image generation',
    example: 'A beautiful sunset over the mountains',
  })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    description: 'Negative prompt to avoid certain elements',
    example: 'blurry, low quality',
  })
  @IsOptional()
  @IsString()
  negativePrompt?: string;

  @ApiPropertyOptional({
    description: 'Artistic style for the image',
    example: 'anime',
  })
  @IsOptional()
  @IsString()
  style?: string;

  @ApiPropertyOptional({
    description: 'Image width in pixels',
    example: 1024,
  })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({
    description: 'Image height in pixels',
    example: 1024,
  })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({
    description: 'Image quality setting',
    enum: ['standard', 'premium'],
    example: 'standard',
  })
  @IsOptional()
  @IsIn(['standard', 'premium'])
  quality?: 'standard' | 'premium';

  @ApiPropertyOptional({
    description: 'User ID creating the content',
    example: 'user_12345',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Session ID for grouping related content',
    example: 'session_67890',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Whether the content should be public',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to generate embeddings for similarity search',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  generateEmbeddings?: boolean;
}

/**
 * DTO for creating image variations
 */
export class CreateVariationsDto {
  @ApiPropertyOptional({
    description: 'Optional prompt modification for variations',
    example: 'with different colors',
  })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional({
    description: 'Style modification for variations',
    example: 'watercolor',
  })
  @IsOptional()
  @IsString()
  style?: string;

  @ApiPropertyOptional({
    description: 'Width for variations',
    example: 1024,
  })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({
    description: 'Height for variations',
    example: 1024,
  })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({
    description: 'Number of variations to generate',
    example: 3,
  })
  @IsOptional()
  @IsNumber()
  variationCount?: number;
}

/**
 * DTO for similarity search requests
 */
export class SimilaritySearchDto {
  @ApiProperty({
    description: 'Search query for finding similar content',
    example: 'sunset landscape',
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  limit?: number;
}

/**
 * DTO for text generation requests
 */
export class GenerateTextDto {
  @ApiProperty({
    description: 'Text prompt for content generation',
    example: '안녕하세요! 오늘 날씨가 어떤가요?',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiPropertyOptional({
    description: 'User ID creating the content',
    example: 'user_12345',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Session ID for grouping related content',
    example: 'session_67890',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Maximum length of generated text',
    example: 500,
  })
  @IsOptional()
  @IsNumber()
  maxLength?: number;

  @ApiPropertyOptional({
    description: 'Temperature for text generation (0.0-1.0)',
    example: 0.7,
  })
  @IsOptional()
  @IsNumber()
  temperature?: number;
}

/**
 * DTO for image analysis requests
 */
export class GenerateImageDto {
  @ApiProperty({
    description: 'Text prompt for image generation',
    example: '귀여운 고양이 이모티콘',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiPropertyOptional({
    description: 'Base64 encoded image data for image-to-image generation',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({
    description: 'Artistic style for the image',
    example: '이모티콘',
    default: '이모티콘',
  })
  @IsOptional()
  @IsString()
  style?: string = '이모티콘';

  @ApiPropertyOptional({
    description: 'Negative prompt to avoid certain elements',
    example: 'blurry, low quality',
  })
  @IsOptional()
  @IsString()
  negativePrompt?: string;

  @ApiPropertyOptional({
    description: 'Image width in pixels',
    example: 1024,
    default: 1024,
  })
  @IsOptional()
  @IsNumber()
  width?: number = 1024;

  @ApiPropertyOptional({
    description: 'Image height in pixels',
    example: 1024,
    default: 1024,
  })
  @IsOptional()
  @IsNumber()
  height?: number = 1024;

  @ApiPropertyOptional({
    description: 'Image quality setting',
    enum: ['standard', 'premium'],
    example: 'standard',
    default: 'standard',
  })
  @IsOptional()
  @IsIn(['standard', 'premium'])
  quality?: 'standard' | 'premium' = 'standard';

  @ApiPropertyOptional({
    description: 'User ID creating the content',
    example: 'user_12345',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Session ID for grouping related content',
    example: 'session_67890',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Whether the content should be public',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether to generate embeddings for similarity search',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  generateEmbeddings?: boolean = true;
}

/**
 * Response DTO for successful operations
 */
export class SuccessResponseDto<T = any> {
  @ApiProperty({ description: 'Operation success status', example: true })
  success: boolean = true;

  @ApiProperty({ description: 'Response data' })
  data?: T;

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-15T10:30:00.000Z' })
  timestamp?: string;
}

/**
 * Response DTO for error operations
 */
export class ErrorResponseDto {
  @ApiProperty({ description: 'Operation success status', example: false })
  success: boolean = false;

  @ApiProperty({ description: 'Error message', example: 'Invalid request parameters' })
  message: string;

  @ApiProperty({ description: 'Error code', example: 'VALIDATION_ERROR' })
  error: string;

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-15T10:30:00.000Z' })
  timestamp?: string;
}