import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';

const CameraFeedProcessor = () => {
  const socketRef = useRef(null);
  const [processedFrame, setProcessedFrame] = useState(null);
  const [prediction, setPrediction] = useState('');
  const [abandonedDetectionResults, setAbandonedDetectionResults] = useState(null);
  const [damageDetectionResults, setDamageDetectionResults] = useState(null);
  const [violenceDetectionResults, setViolenceDetectionResults] = useState(null);
  const [weakDetectionResults, setWeakDetectionResults] = useState(null); // New state
  const [detectionMode, setDetectionMode] = useState('smoking'); // 'smoking', 'abandoned', 'damage', 'violence', 'weak'
  const [isConnected, setIsConnected] = useState(false);

  const detectionEndpoints = {
    smoking: 'http://localhost:5000/ws/video_feed',
    abandoned: 'http://localhost:5000/ws/abandoned_feed',
    damage: 'http://localhost:5000/ws/damage_feed',
    violence: 'http://localhost:5000/ws/violence_feed',
    weak: 'http://localhost:5000/ws/weak_feed', // New endpoint
  };

  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    setProcessedFrame(null);
    setPrediction('');
    setAbandonedDetectionResults(null);
    setDamageDetectionResults(null);
    setViolenceDetectionResults(null);
    setWeakDetectionResults(null); // Reset new state
    setIsConnected(false);

    const newSocket = io(detectionEndpoints[detectionMode], {
      transports: ['websocket'],
    });

    socketRef.current = newSocket;

    newSocket.on('connect', () => {
      console.log(`Socket.IO connected for ${detectionMode} detection`);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log(`Socket.IO disconnected for ${detectionMode} detection`);
      setIsConnected(false);
    });

    newSocket.on('response', (data) => {
      setProcessedFrame(data.image);
      if (detectionMode === 'smoking') {
        setPrediction(data.prediction);
      } else if (detectionMode === 'abandoned') {
        setAbandonedDetectionResults(data.detections);
      } else if (detectionMode === 'damage') {
        setDamageDetectionResults(data.detections);
      } else if (detectionMode === 'violence') {
        setViolenceDetectionResults(data.detections);
      } else if (detectionMode === 'weak') { // New handler case
        setWeakDetectionResults(data.detections);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error(`Socket.IO connection error for ${detectionMode}:`, error);
      setIsConnected(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [detectionMode]);

  const toggleDetectionMode = () => {
    setDetectionMode(prevMode => { // Updated logic for 5 modes
      if (prevMode === 'smoking') return 'abandoned';
      if (prevMode === 'abandoned') return 'damage';
      if (prevMode === 'damage') return 'violence';
      if (prevMode === 'violence') return 'weak';
      return 'smoking';
    });
  };

  const handleDisconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  const getButtonText = () => {
      switch(detectionMode) {
          case 'smoking': return '흡연 감지';
          case 'abandoned': return '유기물 감지';
          case 'damage': return '파손 감지';
          case 'violence': return '폭행 감지';
          case 'weak': return '교통약자 감지';
          default: return '모드 전환';
      }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '10px 0' }}>
        <button onClick={toggleDetectionMode} style={{ padding: '10px 20px', fontSize: '16px' }}>
          모드 전환: {getButtonText()}
        </button>
        <button onClick={handleDisconnect} style={{ padding: '10px 20px', fontSize: '16px', backgroundColor: 'red', color: 'white' }}>
          Disconnect
        </button>
      </div>

      <div style={{ width: "640px", margin: "10px auto 0", backgroundColor: "#000" }}>
        {processedFrame ? (
          <img
            src={processedFrame}
            alt="Processed Feed"
            style={{ width: "100%", display: "block" }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: 'white', padding: '20px' }}>
            {isConnected ? 'Waiting for video stream...' : 'Connecting...'}
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
          (damageDetectionResults.is_danger ? '파손 감지됨!' : '파손 없음')
        )}
        {detectionMode === 'violence' && violenceDetectionResults && (
          violenceDetectionResults.status_message ||
          (violenceDetectionResults.is_violence ? '폭행 감지됨!' : '폭행 없음')
        )}
        {detectionMode === 'weak' && weakDetectionResults && ( // New display logic
          weakDetectionResults.status_message ||
          (weakDetectionResults.is_weak ? '교통약자 감지됨!' : '교통약자 없음')
        )}
      </h2>
    </>
  );
};

export default CameraFeedProcessor;