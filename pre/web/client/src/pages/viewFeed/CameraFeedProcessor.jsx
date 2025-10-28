 import React, { useState, useRef, useEffect } from 'react';
 import { io } from 'socket.io-client';
 
 const CameraFeedProcessor = () => {
   const videoRef = useRef(null);
   const canvasRef = useRef(null);
   const socketRef = useRef(null);
   const [processedFrame, setProcessedFrame] = useState(null);
   const [prediction, setPrediction] = useState('');
 
   useEffect(() => {
     const video = videoRef.current;
     const canvas = canvasRef.current;
     if (!video || !canvas) return;
 
     const ctx = canvas.getContext('2d');
     let animationFrameId;
 
     socketRef.current = io('http://192.168.94.49:5000/ws/video_feed', {
       transports: ['websocket'],
     });
 
     socketRef.current.on('connect', () => {
       console.log('Socket.IO 연결 성공');
     });
 
     socketRef.current.on('disconnect', () => {
       console.log('Socket.IO 연결 종료');
     });
 
     socketRef.current.on('response', (data) => {
       setProcessedFrame(data.image);
       setPrediction(data.prediction);
     });
 
     socketRef.current.on('connect_error', (error) => {
       console.error('Socket.IO 연결 오류 발생:', error);
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
 
       if (socketRef.current && socketRef.current.connected) {
         socketRef.current.emit('message', imageData);
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
 
     video.play().catch(error => {
       console.error("Video play failed:", error);
     });

     return () => {
       video.removeEventListener('play', handlePlay);
       video.removeEventListener('pause', handlePauseEnd);
       video.removeEventListener('ended', handlePauseEnd);
       cancelAnimationFrame(animationFrameId);
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
           loop
           src={"../../assets/C_3_10_1_BU_DYA_08-04_11-16-33_CC_RGB_DF2_M2.mp4"}
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
   
         <h2 style={{ textAlign: 'center', marginTop: '10px' }}>{prediction}</h2>
   
         <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
       </>
     );
   }; 
 export default CameraFeedProcessor;