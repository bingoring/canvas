import React, { useState, useRef, useEffect } from 'react';
import { Box, Container, TextField, Button, Typography, Paper, Card, CardContent, Grid, IconButton } from '@mui/material';
import { Send, Clear, Brush, Download } from '@mui/icons-material';
import toast from 'react-hot-toast';

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

const TestInterface: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  
  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(5);
  
  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = brushSize;
        
        // Set white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = brushSize;
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Convert canvas to base64
  const getCanvasImage = (): string | null => {
    const canvas = canvasRef.current;
    if (canvas) {
      return canvas.toDataURL('image/png');
    }
    return null;
  };

  // Send text prompt request
  const handlePromptSubmit = async () => {
    if (!prompt.trim()) {
      toast.error('프롬프트를 입력해주세요');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/canvas/generate/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          userId: 'test-user',
          sessionId: `session-${Date.now()}`
        }),
      });

      const result = await response.json();
      setResponse(result);

      if (result.success) {
        toast.success('텍스트 생성이 완료되었습니다');
      } else {
        toast.error(result.error || '텍스트 생성 중 오류가 발생했습니다');
      }
    } catch (error) {
      console.error('API 요청 실패:', error);
      toast.error('서버 연결에 실패했습니다');
      setResponse({
        success: false,
        error: '서버 연결에 실패했습니다. 백엔드 서버가 실행 중인지 확인해주세요.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Send image request
  const handleImageSubmit = async () => {
    const imageData = getCanvasImage();
    if (!imageData) {
      toast.error('그림을 그려주세요');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/canvas/generate/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim() || '이모티콘 생성',
          image: imageData,
          style: 'meme',
          userId: 'test-user',
          sessionId: `session-${Date.now()}`,
          width: 1024,
          height: 1024,
          quality: 'standard'
        }),
      });

      const result = await response.json();
      setResponse(result);

      if (result.success) {
        toast.success('이미지 생성이 완료되었습니다');
      } else {
        toast.error(result.error || '이미지 생성 중 오류가 발생했습니다');
      }
    } catch (error) {
      console.error('API 요청 실패:', error);
      toast.error('서버 연결에 실패했습니다');
      setResponse({
        success: false,
        error: '서버 연결에 실패했습니다. 백엔드 서버가 실행 중인지 확인해주세요.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        🧪 API 테스트 인터페이스
      </Typography>
      
      <Grid container spacing={4}>
        {/* Prompt Input Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                💬 텍스트 프롬프트 테스트
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={4}
                variant="outlined"
                placeholder="여기에 프롬프트를 입력하세요..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <Button
                fullWidth
                variant="contained"
                startIcon={<Send />}
                onClick={handlePromptSubmit}
                disabled={isLoading}
                sx={{ mb: 1 }}
              >
                {isLoading ? '처리 중...' : '프롬프트 전송'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Drawing Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🎨 그림 그리기 테스트
              </Typography>
              
              <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="body2">브러시 크기:</Typography>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <Typography variant="body2">{brushSize}px</Typography>
              </Box>
              
              <Box sx={{ 
                border: '2px solid #ddd', 
                borderRadius: 1, 
                mb: 2,
                display: 'inline-block'
              }}>
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={300}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  style={{ 
                    cursor: 'crosshair',
                    display: 'block',
                    maxWidth: '100%'
                  }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <IconButton onClick={clearCanvas} color="secondary">
                  <Clear />
                </IconButton>
                <Button
                  variant="outlined"
                  startIcon={<Download />}
                  onClick={() => {
                    const canvas = canvasRef.current;
                    if (canvas) {
                      const link = document.createElement('a');
                      link.download = 'drawing.png';
                      link.href = canvas.toDataURL();
                      link.click();
                    }
                  }}
                >
                  다운로드
                </Button>
              </Box>
              
              <Button
                fullWidth
                variant="contained"
                color="secondary"
                startIcon={<Brush />}
                onClick={handleImageSubmit}
                disabled={isLoading}
              >
                {isLoading ? '처리 중...' : '이미지 전송'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Response Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 서버 응답
              </Typography>
              
              {response ? (
                <Paper 
                  elevation={1} 
                  sx={{ 
                    p: 2, 
                    backgroundColor: response.success ? '#f0f8f0' : '#fff0f0',
                    border: response.success ? '1px solid #4caf50' : '1px solid #f44336'
                  }}
                >
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(response, null, 2)}
                  </Typography>
                </Paper>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  아직 응답이 없습니다. 위에서 프롬프트나 이미지를 전송해보세요.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TestInterface;
