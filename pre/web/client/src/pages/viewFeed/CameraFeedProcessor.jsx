import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';

const CameraFeedProcessor = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const smokingSocketRef = useRef(null); // 흡연 감지용 웹소켓
  const abandonedSocketRef = useRef(null); // 유기물 감지용 웹소켓
  const damageSocketRef = useRef(null); // 폭행 감지용 웹소켓
  const [processedFrame, setProcessedFrame] = useState(null); // 처리된 프레임
  const [prediction, setPrediction] = useState(''); // 흡연 감지 결과
  const [abandonedDetectionResults, setAbandonedDetectionResults] = useState(null); // 유기물 감지 결과
  const [damageDetectionResults, setDamageDetectionResults] = useState(null); // 폭행 감지 결과
  const [detectionMode, setDetectionMode] = useState('smoking'); // 'smoking', 'abandoned', 또는 'damage'
  const [videoSource, setVideoSource] = useState("../../assets/C_3_10_1_BU_DYA_08-04_11-16-33_CC_RGB_DF2_M2.mp4"); // 비디오 소스 상태

  const detectionModeRef = useRef(detectionMode);
  useEffect(() => {
    detectionModeRef.current = detectionMode;
  }, [detectionMode]);

  // 예시 비디오 경로
  const SMOKING_VIDEO = "../../assets/C_3_10_1_BU_DYA_08-04_11-16-33_CC_RGB_DF2_M2.mp4";
  const ABANDONED_VIDEO = "../../assets/C_3_11_29_BU_SMC_08-07_16-19-38_CD_RGB_DF2_F1.mp4"; // 유기물 감지용 비디오 경로 (예시)
  const DAMAGE_VIDEO = "../../assets/C_3_8_1_BU_SMA_09-17_13-38-51_CA_RGB_DF2_M1.mp4"; // 폭행 감지용 비디오 경로

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // 흡연 감지 웹소켓 연결
    smokingSocketRef.current = io('http://192.168.94.49:5000/ws/video_feed', {
      transports: ['websocket'],
    });

    smokingSocketRef.current.on('connect', () => {
      console.log('흡연 감지 Socket.IO 연결 성공');
    });
    smokingSocketRef.current.on('disconnect', () => {
      console.log('흡연 감지 Socket.IO 연결 종료');
    });
    smokingSocketRef.current.on('response', (data) => {
      if (detectionModeRef.current === 'smoking') {
        setProcessedFrame(data.image);
        setPrediction(data.prediction);
        setAbandonedDetectionResults(null); // 다른 모드 결과 초기화
        setDamageDetectionResults(null); // 다른 모드 결과 초기화
      }
    });
    smokingSocketRef.current.on('connect_error', (error) => {
      console.error('흡연 감지 Socket.IO 연결 오류 발생:', error);
    });

    // 유기물 감지 웹소켓 연결
    abandonedSocketRef.current = io('http://192.168.94.49:5000/ws/abandoned_feed');

    abandonedSocketRef.current.on('connect', () => {
      console.log('유기물 감지 Socket.IO 연결 성공');
    });
    abandonedSocketRef.current.on('disconnect', () => {
      console.log('유기물 감지 Socket.IO 연결 종료');
    });
    abandonedSocketRef.current.on('response', (data) => {
      if (detectionModeRef.current === 'abandoned') {
        setProcessedFrame(data.image);
        setAbandonedDetectionResults(data.detections);
        setPrediction(''); // 다른 모드 결과 초기화
        setDamageDetectionResults(null); // 다른 모드 결과 초기화
      }
    });
    abandonedSocketRef.current.on('connect_error', (error) => {
      console.error('유기물 감지 Socket.IO 연결 오류 발생:', error);
    });

    // 폭행 감지 웹소켓 연결
    damageSocketRef.current = io('http://192.168.94.49:5000/ws/damage_feed');

    damageSocketRef.current.on('connect', () => {
      console.log('폭행 감지 Socket.IO 연결 성공');
    });
    damageSocketRef.current.on('disconnect', () => {
      console.log('폭행 감지 Socket.IO 연결 종료');
    });
    damageSocketRef.current.on('response', (data) => {
      if (detectionModeRef.current === 'damage') {
        setProcessedFrame(data.image);
        setDamageDetectionResults(data.detections);
        setPrediction(''); // 다른 모드 결과 초기화
        setAbandonedDetectionResults(null); // 다른 모드 결과 초기화
      }
    });
    damageSocketRef.current.on('connect_error', (error) => {
      console.error('폭행 감지 Socket.IO 연결 오류 발생:', error);
    });

    const drawFrame = () => {
      if (video.paused || video.ended) {
        cancelAnimationFrame(animationFrameId);
        return;
      }

      const maxWidth = 640;
      const scale = maxWidth / video.videoWidth;
      const scaledHeight = video.videoHeight * scale;

      canvas.width = maxWidth;
      canvas.height = scaledHeight;

      ctx.drawImage(video, 0, 0, maxWidth, scaledHeight);

      const imageData = canvas.toDataURL('image/jpeg', 0.5);

      // 현재 감지 모드에 따라 프레임을 해당 웹소켓으로 전송
      if (detectionModeRef.current === 'smoking' && smokingSocketRef.current && smokingSocketRef.current.connected) {
        smokingSocketRef.current.emit('message', imageData);
      } else if (detectionModeRef.current === 'abandoned' && abandonedSocketRef.current && abandonedSocketRef.current.connected) {
        abandonedSocketRef.current.emit('message', imageData);
      } else if (detectionModeRef.current === 'damage' && damageSocketRef.current && damageSocketRef.current.connected) {
        damageSocketRef.current.emit('message', imageData);
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

    video.load();
    video.play().catch(error => {
      console.error("Video play failed:", error);
    });

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePauseEnd);
      video.removeEventListener('ended', handlePauseEnd);
      cancelAnimationFrame(animationFrameId);
      if (smokingSocketRef.current) {
        smokingSocketRef.current.disconnect();
      }
      if (abandonedSocketRef.current) {
        abandonedSocketRef.current.disconnect();
      }
      if (damageSocketRef.current) {
        damageSocketRef.current.disconnect();
      }
    };
  }, [videoSource]); // videoSource가 변경될 때 useEffect 재실행

  const toggleDetectionMode = () => {
    setDetectionMode(prevMode => {
      let newMode;
      let newVideoSource;
      if (prevMode === 'smoking') {
        newMode = 'abandoned';
        newVideoSource = ABANDONED_VIDEO;
      } else if (prevMode === 'abandoned') {
        newMode = 'damage';
        newVideoSource = DAMAGE_VIDEO;
      } else { // current mode is 'damage'
        newMode = 'smoking';
        newVideoSource = SMOKING_VIDEO;
      }
      setVideoSource(newVideoSource);
      return newMode;
    });
    setPrediction(''); // 모드 변경 시 이전 예측 결과 초기화
    setAbandonedDetectionResults(null); // 모드 변경 시 이전 유기물 감지 결과 초기화
    setDamageDetectionResults(null); // 모드 변경 시 이전 폭행 감지 결과 초기화
    setProcessedFrame(null); // 모드 변경 시 처리된 프레임 초기화
  };

  const handleDisconnect = () => {
    if (smokingSocketRef.current) {
      smokingSocketRef.current.disconnect();
      console.log('Manually disconnected smoking socket');
    }
    if (abandonedSocketRef.current) {
      abandonedSocketRef.current.disconnect();
      console.log('Manually disconnected abandoned socket');
    }
    if (damageSocketRef.current) {
      damageSocketRef.current.disconnect();
      console.log('Manually disconnected damage socket');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '10px 0' }}>
        <button onClick={toggleDetectionMode} style={{ padding: '10px 20px', fontSize: '16px' }}>
          모드 전환: {detectionMode === 'smoking' ? '흡연 감지' : detectionMode === 'abandoned' ? '유기물 감지' : '폭행 감지'}
        </button>
        <button onClick={handleDisconnect} style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: 'red', color: 'white' }}>
          Disconnect
        </button>
      </div>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        controls
        // loop
        src={videoSource} // 동적으로 비디오 소스 설정
        style={{ display: 'none' }}
      ></video>

      <div style={{ width: "640px", margin: "10px auto 0", backgroundColor: "#000" }}>
        {processedFrame ? (
          <img
            src={processedFrame}
            alt="Processed Feed"
            style={{ width: "100%", display: "block" }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: 'white', padding: '20px' }}>
            Loading video feed...
          </div>
        )}
      </div>

      <h2 style={{ textAlign: 'center', marginTop: '10px' }}>
        {detectionMode === 'smoking' && prediction}
        {detectionMode === 'abandoned' && abandonedDetectionResults && (
          abandonedDetectionResults.status_message || 
          (abandonedDetectionResults.abandoned_items && abandonedDetectionResults.abandoned_items.length > 0 ? '유기물 감지됨!' : '유기물 없음')
        )}
        {detectionMode === 'damage' && damageDetectionResults && (
          damageDetectionResults.status_message ||
          (damageDetectionResults.is_danger ? '폭행 감지됨!' : '폭행 없음')
        )}
      </h2>

      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </>
  );
};
export default CameraFeedProcessor;