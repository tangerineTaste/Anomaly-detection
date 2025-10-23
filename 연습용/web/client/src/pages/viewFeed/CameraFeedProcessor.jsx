 import React, { useRef, useEffect } from 'react';
 import { io } from 'socket.io-client'

const CameraFeedProcessor = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const socketRef = useRef(null); // WebSocket 객체를 위한 ref 추가

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // 1. Socket.IO 연결 설정
    // 백엔드 Socket.IO 서버 주소와 네임스페이스를 지정합니다.
    socketRef.current = io('http://127.0.0.1:5000/ws/video_feed', {
      transports: ['websocket'] // WebSocket 전송 방식만 사용하도록 명시 (선택 사항)
    });

    socketRef.current.on('connect', () => {
      console.log('Socket.IO 연결 성공');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket.IO 연결 종료');
    });

    socketRef.current.on('response', (data) => {
      // 백엔드로부터 AI 분석 결과 수신 (백엔드에서 emit('response', ...)로 보낼 때)
      console.log('백엔드로부터 AI 결과 수신:', data);
      // TODO: 수신된 AI 결과를 파싱하고 비디오 위에 오버레이하는 로직 추가
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket.IO 연결 오류 발생:', error);
    });

    const drawFrame = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // 2. 추출된 이미지 데이터를 Socket.IO를 통해 백엔드로 전송
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('message', imageData); // 'message' 이벤트로 데이터 전송
      }

      animationFrameId = requestAnimationFrame(drawFrame);
    };

    const handlePlay = () => {
      console.log('비디오 시작. 프레임 그리기 시작');
      drawFrame();
    };

    const handlePauseEnd = () => {
      console.log('Video paused or ended, stopping frame extraction.');
      cancelAnimationFrame(animationFrameId);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePauseEnd);
    video.addEventListener('ended', handlePauseEnd);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePauseEnd);
      video.removeEventListener('ended', handlePauseEnd);
      cancelAnimationFrame(animationFrameId);
      // 컴포넌트 언마운트 시 Socket.IO 연결 종료
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

return (
  <>
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      controls
      src={"../../assets/C_3_10_1_BU_DYA_08-04_11-16-33_CC_RGB_DF2_M2.mp4"}
      style={{ width: "100%", marginTop: "10px" }}
    ></video>
    {/* 프레임 추출용 캔버스 (화면에 보이지 않게 설정) */}
    <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
  </>
);
};

export default CameraFeedProcessor;