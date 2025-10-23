import React, { useState } from 'react';
import { Box, Button, Typography, CircularProgress } from '@mui/material';
import Header from '../../components/Header';
import axios from '../../api/axios'; // baseURL이 설정된 axios 인스턴스

const AI = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoID, setVideoID] = useState(null); // 서버에서 받은 고유 비디오 ID
  const [isProcessing, setIsProcessing] = useState(false); // 업로드 및 분석 중 상태
  const [error, setError] = useState(''); // 에러 메시지

  // 파일 선택 핸들러
  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setVideoID(null); // 새 파일 선택 시 이전 결과 초기화
    setError('');
  };

  // '분석 시작' 버튼 클릭 핸들러
  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) {
      setError('Please select a video file first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsProcessing(true);
    setError('');

    try {
      // 1. 백엔드 /api/upload_smoking_video API로 파일 업로드
      const response = await axios.post('/user/api/upload_smoking_video', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data && response.data.success) {
        // 2. 업로드 성공 시, 백엔드가 보내준 video_id를 상태에 저장
        setVideoID(response.data.video_id);
      } else {
        setError(response.data.message || 'File upload failed.');
        setVideoID(null); // 실패 시 비디오 ID 초기화
      }
    } catch (err) {
      setError('An error occurred while communicating with the server. Please ensure the backend is running.');
      console.error(err);
      setVideoID(null); // 에러 시 비디오 ID 초기화
    } finally {
      setIsProcessing(false); // 업로드/분석 시도 완료
    }
  };

  // 백엔드 API의 기본 URL (axios 인스턴스에서 가져오거나 직접 지정)
  const API_BASE_URL = axios.defaults.baseURL || 'http://localhost:5000';

  // 화면 렌더링
  return (
    <Box m="20px">
      <Header title="AI Model Test" subtitle="Upload an MP4 file to detect smoking behavior." />

      {/* 파일 업로드 섹션 */}
      <Box mt="40px" display="flex" flexDirection="column" alignItems="center" gap="20px">
        <Typography variant="h6">
          Select MP4 file to test
        </Typography>

        <Button
          variant="contained"
          component="label"
        >
          Select file
          <input
            type="file"
            hidden
            accept="video/mp4"
            onChange={handleFileChange}
          />
        </Button>

        {/* 선택된 파일 이름 표시 */}
        {selectedFile && (
          <Typography>
            Selected: {selectedFile.name}
          </Typography>
        )}

        {/* 분석 시작 버튼 (처리 중일 땐 로딩 아이콘 표시) */}
        <Button
          variant="contained"
          color="secondary"
          onClick={handleUploadAndAnalyze}
          disabled={isProcessing || !selectedFile}
        >
          {isProcessing ? <CircularProgress size={24} /> : 'Start analysis'}
        </Button>

        {/* 에러 메시지 표시 */}
        {error && (
          <Typography color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </Box>
      
      {/* 결과 영상 표시 섹션 */}
      {/* videoID가 있고 처리 중이 아닐 때만 표시 */}
      {videoID && !isProcessing && (
        <Box mt="40px" display="flex" flexDirection="column" alignItems="center" >
          <Typography variant="h5" sx={{mb: 2}}>Analysis Result</Typography>
          <Box sx={{ border: '2px solid #ccc', p: 1, maxWidth: '900px', width: '100%'}}>
            {/* 백엔드의 스트리밍 API 주소를 <img> 태그의 src로 사용합니다.
              브라우저가 이 주소로 GET 요청을 보내고, 서버는 'multipart/x-mixed-replace' 응답으로
              비디오 프레임을 계속해서 보내줍니다.
            */}
            <img
              src={`${API_BASE_URL}/user/api/stream_smoking_result/${videoID}`}
              alt="Real-time analysis result"
              style={{ maxWidth: '100%', height: 'auto' }}
              onError={() => setError('Failed to load the result stream. Please check the video ID.')}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AI;
