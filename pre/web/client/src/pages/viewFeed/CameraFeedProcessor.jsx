import React, { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';

const CameraFeedProcessor = () => {
  const socketRef = useRef(null);
  const [processedFrame, setProcessedFrame] = useState(null);
  const [prediction, setPrediction] = useState('');
  const [abandonedDetectionResults, setAbandonedDetectionResults] = useState(null);
  const [damageDetectionResults, setDamageDetectionResults] = useState(null);
  const [violenceDetectionResults, setViolenceDetectionResults] = useState(null);
  const [weakDetectionResults, setWeakDetectionResults] = useState(null);
  const [fireDetectionResults, setFireDetectionResults] = useState(null); 
  const [detectionMode, setDetectionMode] = useState('smoking'); 
  const [isConnected, setIsConnected] = useState(false);
  const [alertHistory, setAlertHistory] = useState([]);

  const detectionEndpoints = {
    smoking: 'http://localhost:5000/ws/video_feed',
    abandoned: 'http://localhost:5000/ws/abandoned_feed',
    damage: 'http://localhost:5000/ws/damage_feed',
    violence: 'http://localhost:5000/ws/violence_feed',
    weak: 'http://localhost:5000/ws/weak_feed', 
    fire: 'http://localhost:5000/ws/fire_feed'
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
    setFireDetectionResults(null);
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
      } else if (detectionMode === 'fire'){
        setFireDetectionResults(data.detections);
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

  useEffect(() => {
    if (isDetected() && processedFrame) {
      const status = getStatusText();
      
      // NORMAL 상태나 정상 상태, waiting 상태는 제외
      if (status.includes('NORMAL') || status.includes('없음') || status.includes('정상') || status.includes('waiting')) {
        return;
      }
      
      // 중복 방지: 마지막 알림과 비교 (3초 이내 같은 모드 제외)
      if (alertHistory.length > 0) {
        const lastAlert = alertHistory[0];
        if (lastAlert.detectionMode === detectionMode && 
            Math.abs(Date.now() - lastAlert.id) < 30000) {
          return;
        }
      }
      
      const newAlert = {
        id: Date.now(),
        mode: getButtonText(),
        detectionMode: detectionMode,
        status: status,
        timestamp: new Date().toLocaleString('ko-KR'),
        image: processedFrame
      };
      setAlertHistory(prev => [newAlert, ...prev]);
    }
  }, [prediction, abandonedDetectionResults, damageDetectionResults, violenceDetectionResults, weakDetectionResults, fireDetectionResults]);

  const getStatusText = () => {
    if (detectionMode === 'smoking' && prediction) return prediction;
    if (detectionMode === 'abandoned' && abandonedDetectionResults?.status_message) 
      return abandonedDetectionResults.status_message;
    if (detectionMode === 'damage' && damageDetectionResults?.status_message) 
      return damageDetectionResults.status_message;
    if (detectionMode === 'violence' && violenceDetectionResults?.status_message) 
      return violenceDetectionResults.status_message;
    if (detectionMode === 'weak' && weakDetectionResults?.status_message) 
      return weakDetectionResults.status_message;
    if (detectionMode === 'fire' && fireDetectionResults?.status_message) 
      return fireDetectionResults.status_message;
    return '이상행동 감지됨';
  };

  const handleDisconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  const handleModeChange = (mode) => {
    setDetectionMode(mode);
  };

  const handleConfirmAlert = (alert) => {
    if (socketRef.current) {
      console.log("DEBUG: Alert object before sending:", alert); // Add this for debugging
      const dataToSend = {
        mode: alert.mode,
        detectionMode: alert.detectionMode,
        timestamp: alert.timestamp,
        status: alert.status,
        image: alert.image
      };
      socketRef.current.emit('confirm_incident', dataToSend);
      console.log('Confirmation sent to server:', dataToSend);
      // Remove the alert from the history after confirmation
      setAlertHistory(prev => prev.filter(a => a.id !== alert.id));
    }
  };

  const handleAlertNo = (alertId) => {
    // 해당 알림만 제거
    setAlertHistory(prev => prev.filter(a => a.id !== alertId));
  };

  const getButtonText = () => {
    switch(detectionMode) {
      case 'smoking': return '흡연 감지';
      case 'abandoned': return '유기물 감지';
      case 'damage': return '파손 감지';
      case 'violence': return '폭행 감지';
      case 'weak': return '교통약자 감지';
      case 'fire' : return '화재 감지';
      default: return '모드 전환';
    }
  };

  const isDetected = () => {
    if (detectionMode === 'smoking' && prediction) return true;
    if (detectionMode === 'abandoned' && abandonedDetectionResults?.abandoned_items?.length > 0) return true;
    if (detectionMode === 'damage' && damageDetectionResults?.is_danger) return true;
    if (detectionMode === 'violence' && violenceDetectionResults?.is_violence) return true;
    if (detectionMode === 'weak' && weakDetectionResults?.is_weak) return true;
    if (detectionMode === 'fire' && fireDetectionResults?.is_fire) return true;
    return false;
  };

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      padding: '8px',
      maxWidth: '1600px',
      margin: '0 auto'
    }}>
      {/* 하단: CCTV 화면 + 알림 리스트 */}
      <div style={{ 
        display: 'flex',
        gap: '20px',
        height: 'calc(100vh - 180px)'
      }}>
      {/* 왼쪽: CCTV 화면 */}
      <div style={{ flex: '0.7' }}>
        {/* 감지 모드와 상태 표시 헤더 */}
        <div style={{
          padding: '15px 20px',
          backgroundColor: 'white',
          borderRadius: '20px 20px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          gap: '15px'
        }}>
          {/* 왼쪽: 감지 모드 버튼들 */}
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flex: 1
          }}>
            {/* 흡연 감지 */}
            <button
              onClick={() => handleModeChange('smoking')}
              style={{
                padding: '10px',
                fontSize: '18px',
                backgroundColor: detectionMode === 'smoking' ? '#f56214' : '#ecf0f1',
                color: detectionMode === 'smoking' ? 'white' : '#f8f9f9',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '48px',
                minHeight: '48px'
              }}
            >
              <img src="./assets/smoking.png" alt="smoking" 
              style={{ 
                width: '24px', height: '24px', 
                filter: detectionMode === 'smoking' ? 'invert(1)' : 'invert(0)', 
                transition: 'filter 0.3s ease', }} />
            </button>

            {/* 유기물 감지 */}
            <button
              onClick={() => handleModeChange('abandoned')}
              style={{
                padding: '10px',
                fontSize: '18px',
                backgroundColor: detectionMode === 'abandoned' ? '#f56214' : '#ecf0f1',
                color: detectionMode === 'abandoned' ? 'white' : '#f8f9f9',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '48px',
                minHeight: '48px'
              }}
            >
              <img src="./assets/paper-bin.png" alt="bin" 
              style={{ 
                width: '24px', height: '24px', 
                filter: detectionMode === 'abandoned' ? 'invert(1)' : 'invert(0)', 
                transition: 'filter 0.3s ease', }} />
            </button>

            {/* 파손 감지 */}
            <button
              onClick={() => handleModeChange('damage')}
              style={{
                padding: '10px',
                fontSize: '18px',
                backgroundColor: detectionMode === 'damage' ? '#f56214' : '#ecf0f1',
                color: detectionMode === 'damage' ? 'white' : '#f8f9f9',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '48px',
                minHeight: '48px'
              }}
            >
              <img src="./assets/hammer.png" alt="hammer"
              style={{ 
                width: '24px', height: '24px', 
                filter: detectionMode === 'damage' ? 'invert(1)' : 'invert(0)', 
                transition: 'filter 0.3s ease', }} />
            </button>

            {/* 폭행 감지 */}
            <button
              onClick={() => handleModeChange('violence')}
              style={{
                padding: '10px',
                fontSize: '18px',
                backgroundColor: detectionMode === 'violence' ? '#f56214' : '#ecf0f1',
                color: detectionMode === 'violence' ? 'white' : '#f8f9f9',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '48px',
                minHeight: '48px'
              }}
            >
              <img src="./assets/raise-hand.png" alt="violence"
              style={{ 
                width: '24px', height: '24px', 
                filter: detectionMode === 'violence' ? 'invert(1)' : 'invert(0)', 
                transition: 'filter 0.3s ease', }} />
            </button>

            {/* 교통약자 감지 */}
            <button
              onClick={() => handleModeChange('weak')}
              style={{
                padding: '10px',
                fontSize: '18px',
                backgroundColor: detectionMode === 'weak' ? '#f56214' : '#ecf0f1',
                color: detectionMode === 'weak' ? 'white' : '#f8f9f9',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '48px',
                minHeight: '48px'
              }}
            >
              <img src="./assets/wheelchair.png" alt="wheelchair"
              style={{ 
                width: '24px', height: '24px', 
                filter: detectionMode === 'weak' ? 'invert(1)' : 'invert(0)', 
                transition: 'filter 0.3s ease', }} />
            </button>

            {/* 화재 감지 */}
            <button
              onClick={() => handleModeChange('fire')}
              style={{
                padding: '10px',
                fontSize: '18px',
                backgroundColor: detectionMode === 'fire' ? '#f56214' : '#ecf0f1',
                color: detectionMode === 'fire' ? 'white' : '#f8f9f9',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '48px',
                minHeight: '48px'
              }}
            >
              <img src="./assets/fire.png" alt="fire"
              style={{ 
                width: '24px', height: '24px', 
                filter: detectionMode === 'fire' ? 'invert(1)' : 'invert(0)', 
                transition: 'filter 0.3s ease', }} />
            </button>
          </div>

          {/* 오른쪽: 상태 표시 */}
          <div style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: isDetected() ? '#e74c3c' : '#27ae60',
            whiteSpace: 'nowrap'
          }}>
            {detectionMode === 'smoking' && (prediction || '정상')}
            {detectionMode === 'abandoned' && abandonedDetectionResults && (
              abandonedDetectionResults.status_message ||
              (abandonedDetectionResults.abandoned_items?.length > 0 ? '유기물 감지됨!' : '유기물 없음')
            )}
            {detectionMode === 'damage' && damageDetectionResults && (
              damageDetectionResults.status_message ||
              (damageDetectionResults.is_danger ? '파손 감지됨!' : '파손 없음')
            )}
            {detectionMode === 'violence' && violenceDetectionResults && (
              violenceDetectionResults.status_message ||
              (violenceDetectionResults.is_violence ? '폭행 감지됨!' : '폭행 없음')
            )}
            {detectionMode === 'weak' && weakDetectionResults && (
              weakDetectionResults.status_message ||
              (weakDetectionResults.is_weak ? '교통약자 감지됨!' : '교통약자 없음')
            )}
            {detectionMode === 'fire' && fireDetectionResults && (
              fireDetectionResults.status_message ||
              (fireDetectionResults.is_fire ? '화재 감지됨!' : '화재 없음')
            )}
          </div>
        </div>

        {/* 비디오 피드 */}
        <div style={{
          backgroundColor: "#000",
          borderRadius: '0 0 20px 20px',
          overflow: 'hidden'
        }}>
          {processedFrame ? (
            <img
              src={processedFrame}
              alt="Processed Feed"
              style={{ width: "100%", display: "block" }}
            />
          ) : (
            <div style={{
              textAlign: 'center',
              color: 'white',
              padding: '100px 20px',
              fontSize: '18px'
            }}>
              {isConnected ? 'Waiting for video stream...' : 'Connecting...'}
            </div>
          )}
        </div>
      </div>

      {/* 오른쪽: 알림 리스트 */}
      <div style={{
        flex: '0.3',
        minWidth: '300px'
      }}>
        {/* 알림 리스트 */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '15px',
          padding: '15px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          height: '88.4%',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {alertHistory.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#999',
              fontSize: '14px'
            }}>
              이상행동 감지 대기 중...
            </div>
          ) : (
            alertHistory.map((alert, index) => (
              <div key={alert.id}>
                <div style={{
                  padding: '15px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}>
                    <div style={{ width: '22px', height: '22px', marginTop: '2px', color: '#f56214' }}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        style={{ width: '22px', height: '22px' }}
                      >
                        <path d="M20 17H22V19H2V17H4V10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10V17ZM9 21H15V23H9V21Z" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '16px',
                        color: '#1c1c1c',
                        fontWeight: '500',
                      }}>
                        이상행동이 감지되었습니다.
                      </div>
                    </div>
                  </div>
                  
                  <img src={alert.image} alt="Detected Frame" style={{ width: '100%', borderRadius: '8px', marginTop: '8px' }} />

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingLeft: '33px'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      color: '#999'
                    }}>
                      {alert.timestamp}
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      gap: '0'
                    }}>
                      <button
                        onClick={() => handleConfirmAlert(alert)}
                        style={{
                          padding: '6px 16px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: '#f56214',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px 0 0 4px',
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                      >
                        예
                      </button>
                      <button
                        onClick={() => handleAlertNo(alert.id)}
                        style={{
                          padding: '6px 16px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          backgroundColor: '#f56214',
                          color: '#fff',
                          border: 'none',
                          borderLeft: '1px solid #fff',
                          borderRadius: '0 4px 4px 0',
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                      >
                        아니오
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* 구분선 (마지막 항목 제외) */}
                {index < alertHistory.length - 1 && (
                  <div style={{
                    height: '1px',
                    backgroundColor: '#ddd',
                    margin: '0'
                  }} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default CameraFeedProcessor;