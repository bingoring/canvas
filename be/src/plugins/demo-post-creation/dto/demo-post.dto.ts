import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsIn } from 'class-validator';

/**
 * DTO for creating social media post
 */
export class CreateSocialPostDto {
  @ApiProperty({
    description: 'Topic or theme for the social media post',
    example: 'University life tips',
  })
  @IsString()
  topic: string;

  @ApiProperty({
    description: 'Target social media platform',
    enum: ['everytime', 'instagram', 'twitter'],
    example: 'everytime',
  })
  @IsIn(['everytime', 'instagram', 'twitter'])
  platform: 'everytime' | 'instagram' | 'twitter';

  @ApiPropertyOptional({
    description: 'Image style for the generated content',
    example: 'modern minimalist',
  })
  @IsOptional()
  @IsString()
  imageStyle?: string;

  @ApiPropertyOptional({
    description: 'User ID creating the post',
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
    description: 'Whether the post should be public',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to include hashtags in the post',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeHashtags?: boolean;
}

/**
 * DTO for generating trending posts
 */
export class GenerateTrendingPostsDto {
  @ApiProperty({
    description: 'Target platform for trending posts',
    enum: ['everytime', 'instagram', 'twitter'],
    example: 'everytime',
  })
  @IsIn(['everytime', 'instagram', 'twitter'])
  platform: 'everytime' | 'instagram' | 'twitter';

  @ApiPropertyOptional({
    description: 'Number of trending posts to generate',
    example: 5,
  })
  @IsOptional()
  @IsNumber()
  count?: number;

  @ApiPropertyOptional({
    description: 'User ID requesting the trending posts',
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
}