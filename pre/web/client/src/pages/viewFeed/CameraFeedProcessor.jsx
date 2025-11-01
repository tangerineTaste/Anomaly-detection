import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';

const CameraFeedProcessor = () => {
  const socketRef = useRef(null);
  const [processedFrame, setProcessedFrame] = useState(null);
  const [prediction, setPrediction] = useState('');
  const [abandonedDetectionResults, setAbandonedDetectionResults] = useState(null);
  const [damageDetectionResults, setDamageDetectionResults] = useState(null);
  const [detectionMode, setDetectionMode] = useState('smoking'); // 'smoking', 'abandoned', or 'damage'
  const [isConnected, setIsConnected] = useState(false);

  const detectionEndpoints = {
    smoking: 'http://192.168.94.49:5000/ws/video_feed',
    abandoned: 'http://192.168.94.49:5000/ws/abandoned_feed',
    damage: 'http://192.168.94.49:5000/ws/damage_feed',
  };

  useEffect(() => {
    // Clean up previous socket connection
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    // Reset states when mode changes
    setProcessedFrame(null);
    setPrediction('');
    setAbandonedDetectionResults(null);
    setDamageDetectionResults(null);
    setIsConnected(false);

    // Establish new socket connection based on the detection mode
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
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error(`Socket.IO connection error for ${detectionMode}:`, error);
      setIsConnected(false);
    });

    // Cleanup on component unmount or when detectionMode changes
    return () => {
      newSocket.disconnect();
    };
  }, [detectionMode]); // Re-run effect when detectionMode changes

  const toggleDetectionMode = () => {
    setDetectionMode(prevMode => {
      if (prevMode === 'smoking') return 'abandoned';
      if (prevMode === 'abandoned') return 'damage';
      return 'smoking';
    });
  };

  const handleDisconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
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
          (damageDetectionResults.is_danger ? '폭행 감지됨!' : '폭행 없음')
        )}
      </h2>
    </>
  );
};

export default CameraFeedProcessor;