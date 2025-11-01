import json
import time
import os
from flask import Flask, jsonify, render_template, request
from flask_socketio import SocketIO, emit
import base64
import cv2
import numpy as np
from flask_cors import CORS
import logging
import requests
from threading import Thread, Event
from ultralytics import YOLO

#Handel token releated operations
from endpoints.auth.helpers import revoke_token, is_token_revoked

# Importing the rest_api from routes.py
from endpoints import Foresight_API
# Importing the extensions
from extensions import db, jwt
from models import Roles, Incidents
from models.camera import CameraDetails
from flask_migrate import Migrate # Flask-Migrate 임포트

from collections import deque
from smoking_model import load_smoking_model, process_frame_for_smoking
import mediapipe as mp
from abandon import AbandonedItemDetector
from Damage import DamageDetector
from Violence import ViolenceDetector
from Weak import WeakDetector

# --- 모델 전역 로드 ---
yolo_model = YOLO('./yolov8n.pt') # YOLO 모델을 앱 시작 시 한 번만 로드합니다.

# Creating the Flask app instance
app = Flask(__name__)

# Loading configuration from BaseConfig class in the config module
app.config.from_object('config.BaseConfig')
app.config['SECRET_KEY'] = 'key'
socketio = SocketIO(app, cors_allowed_origins="*") 

# Initializing the database with the app instance
db.init_app(app)

# Initializing Flask-Migrate
migrate = Migrate(app, db) # Flask-Migrate 초기화

# Initializing the rest_api with the app instance
Foresight_API.init_app(app)


# Initializing the JWTManager extension with the app instance
jwt.init_app(app)

# Enabling Cross-Origin Resource Sharing (CORS)
CORS(app)

#Initialize boolean
initialized = False

# --- 감지기 인스턴스 및 처리 플래그 저장용 전역 변수 ---
abandoned_detectors = {}
damage_detectors = {}
is_processing = False # 흡연 처리 중인지 확인하는 플래그
is_abandon_processing = False # 유기물 처리 중인지 확인하는 플래그
is_damage_processing = False # 폭행 처리 중인지 확인하는 플래그


# --- 인시던트 저장 헬퍼 함수 ---
def save_incident_if_needed(sid, incident_type, module_name):
    """쿨다운을 확인하고 데이터베이스에 인시던트를 저장합니다."""
    now = time.time()
    last_saved_key = f"{sid}_{incident_type.lower().replace(' ', '_')}"
    last_saved = last_incident_time.get(last_saved_key, 0)
    if now - last_saved > INCIDENT_SAVE_COOLDOWN:
        with app.app_context():
            try:
                incident = Incidents(
                    type=incident_type,
                    module=module_name,
                    camera="Camera 1", # Placeholder
                    status="Active"
                )
                incident.save()
                last_incident_time[last_saved_key] = now
                print(f"Incident saved: {incident_type} detected by {sid}")
            except Exception as db_e:
                print(f"Error saving {incident_type} incident to DB: {db_e}")


import time

video_threads = {} # 백그라운드 비디오 처리 스레드를 관리하기 위한 딕셔너리
last_incident_time = {} # 인시던트 저장 쿨다운을 관리하기 위한 딕셔너리
INCIDENT_SAVE_COOLDOWN = 10 # seconds


@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_data):
    try:
        if is_token_revoked(jwt_data):
            print("hit token already revoked")
            return jsonify({"message": "Authentication failed", "error": "token_revoked"}), 401
        else:
            jti = jwt_data["jti"]
            user_id = jwt_data[app.config.get("JWT_IDENTITY_CLAIM")]
            revoke_token(jti,user_id);
            return jsonify({"message": "Authentication failed", "error": "token_expired"}), 401
    except Exception as e:
        print("hit exception")
        return jsonify({"message": "Authentication failed", "error": "token_expired"}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({"message": "Signature verification has failed", "error": "invalid_token"}), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({"message": "Request doesnt contain valid token", "error": "authorization_header"}), 401

# Setup the database prior to the first request
def initialize_database():
    global initialized
    if not initialized:
        try:
            db.create_all()
            print('> Success: All relevant tables have been created')
            initialized = True
        except Exception as e:
            print('> Error: DBMS Table creation exception: ' + str(e))

@app.teardown_appcontext
def teardown_db(exception):
    db.session.close()

def create_roles():
    roles_data = [
        {'name': 'Administrator', 'slug': 'admin'},
        {'name': 'Normal User', 'slug': 'user'},
        {'name': 'Super Administrator', 'slug': 'super-admin'}
    ]
    for role_data in roles_data:
        role = Roles.query.filter_by(name=role_data['name']).first()
        if not role:
            new_role = Roles(name=role_data['name'], slug=role_data['slug'])
            db.session.add(new_role)
    db.session.commit()
    db.session.close()

# --- 흡연 감지 웹소켓 핸들러 ---
smoking_model, smoking_pose = load_smoking_model()
sequence_data = deque(maxlen=30)
mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

def smoking_video_processing_thread(video_path, sid, stop_event):
    """흡연 감지 비디오 처리를 위한 백그라운드 스레드"""
    print(f"Starting smoking detection thread for {sid} with video {video_path}")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video stream from {video_path}")
        return

    try:
        while not stop_event.is_set():
            ret, frame = cap.read()
            if not ret:
                print(f"End of video stream for {sid}, restarting.")
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0) # 비디오 루프
                continue

            prediction, processed_frame, landmarks = process_frame_for_smoking(frame, sequence_data, smoking_model, smoking_pose)
            if landmarks.pose_landmarks:
                mp_drawing.draw_landmarks(
                    processed_frame, landmarks.pose_landmarks, mp_pose.POSE_CONNECTIONS,
                    landmark_drawing_spec=mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=2),
                    connection_drawing_spec=mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2)
                )
            _, buffer = cv2.imencode('.jpg', processed_frame)
            encoded_image = base64.b64encode(buffer).decode('utf-8')
            
            # Save incident if smoking is detected, with cooldown
            if "SMOKING" in prediction:
                save_incident_if_needed(sid, "Smoking", "SmokingDetector")

            socketio.emit('response', {'image': 'data:image/jpeg;base64,' + encoded_image, 'prediction': prediction}, namespace='/ws/video_feed', room=sid)
            socketio.sleep(0.03) # ~33 FPS
    except Exception as e:
        print(f'Exiting smoking detection thread for {sid} due to error: {e}')
    finally:
        cap.release()
        print(f"Released video capture for {sid}")


@socketio.on('connect', namespace='/ws/video_feed' )
def test_connect():
    sid = request.sid
    print(f'Client connected to smoking feed: {sid}')
    # Stop any existing thread for this session, just in case
    if sid in video_threads:
        video_threads[sid].set()

    stop_event = Event()
    video_threads[sid] = stop_event
    
    video_path = './uploads/C_3_10_1_BU_DYA_08-04_11-16-33_CC_RGB_DF2_M2.mp4'
    socketio.start_background_task(target=smoking_video_processing_thread, video_path=video_path, sid=sid, stop_event=stop_event)
    
@socketio.on('disconnect', namespace='/ws/video_feed')
def test_disconnect():
    sid = request.sid
    print(f'Client disconnected from smoking feed: {sid}')
    if sid in video_threads:
        video_threads[sid].set() # Signal the thread to stop
        del video_threads[sid]
        print(f"Stopped video thread for {sid}")

# --- 유기물 감지 웹소켓 핸들러 ---
def abandoned_video_processing_thread(video_path, sid, stop_event):
    """유기물 감지 비디오 처리를 위한 백그라운드 스레드"""
    print(f"Starting abandoned item detection thread for {sid} with video {video_path}")
    detector = AbandonedItemDetector(yolo_model=yolo_model)
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video stream from {video_path}")
        return

    try:
        while not stop_event.is_set():
            ret, frame = cap.read()
            if not ret:
                print(f"End of video stream for {sid}, restarting.")
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0) # 비디오 루프
                continue

            processed_frame, detection_results = detector.process_frame(frame)
            _, buffer = cv2.imencode('.jpg', processed_frame)
            encoded_image = base64.b64encode(buffer).decode('utf-8')
            
            # Save incident if abandoned item is detected, with cooldown
            if detection_results and detection_results.get('abandoned_items'):
                save_incident_if_needed(sid, "Abandoned Item", "AbandonedItemDetector")

            socketio.emit('response', {
                'image': 'data:image/jpeg;base64,' + encoded_image,
                'detections': detection_results
            }, namespace='/ws/abandoned_feed', room=sid)
            socketio.sleep(0.03) # ~33 FPS
    except Exception as e:
        print(f'Exiting abandoned item detection thread for {sid} due to error: {e}')
    finally:
        cap.release()
        print(f"Released video capture for {sid}")

@socketio.on('connect', namespace='/ws/abandoned_feed')
def connect_abandoned_feed():
    sid = request.sid
    print(f'Client connected to abandoned feed: {sid}')
    if sid in video_threads:
        video_threads[sid].set()

    stop_event = Event()
    video_threads[sid] = stop_event

    video_path = './uploads/C_3_11_29_BU_SMC_08-07_16-19-38_CD_RGB_DF2_F1.mp4'
    socketio.start_background_task(target=abandoned_video_processing_thread, video_path=video_path, sid=sid, stop_event=stop_event)

@socketio.on('disconnect', namespace='/ws/abandoned_feed')
def disconnect_abandoned_feed():
    sid = request.sid
    print(f'Client disconnected from abandoned feed: {sid}')
    if sid in video_threads:
        video_threads[sid].set()
        del video_threads[sid]
        print(f"Stopped video thread for {sid}")

# --- 파손 감지 웹소켓 핸들러 ---
def breakage_video_processing_thread(video_path, sid, stop_event):
    """파손 감지 비디오 처리를 위한 백그라운드 스레드"""
    print(f"Starting breakage detection thread for {sid} with video {video_path}")
    detector = DamageDetector(yolo_model_path='./yolov8n.pt')
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video stream from {video_path}")
        return

    try:
        while not stop_event.is_set():
            ret, frame = cap.read()
            if not ret:
                print(f"End of video stream for {sid}, restarting.")
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0) # 비디오 루프
                continue

            processed_frame, detection_results = detector.process_frame(frame)
            _, buffer = cv2.imencode('.jpg', processed_frame)
            encoded_image = base64.b64encode(buffer).decode('utf-8')
            
            # Save incident if damage is detected, with cooldown
            if detection_results.get('is_danger'):
                save_incident_if_needed(sid, "Damage", "DamageDetector")

            socketio.emit('response', {
                'image': 'data:image/jpeg;base64,' + encoded_image,
                'detections': detection_results
            }, namespace='/ws/damage_feed', room=sid)
            socketio.sleep(0.03) # ~33 FPS
    except Exception as e:
        print(f'Exiting breakage detection thread for {sid} due to error: {e}')
    finally:
        cap.release()
        print(f"Released video capture for {sid}")

@socketio.on('connect', namespace='/ws/damage_feed')
def connect_breakage_feed():
    sid = request.sid
    print(f'Client connected to breakage feed: {sid}')
    if sid in video_threads:
        video_threads[sid].set()

    stop_event = Event()
    video_threads[sid] = stop_event

    video_path = './uploads/C_3_8_1_BU_SMA_09-17_13-38-51_CA_RGB_DF2_M1.mp4'
    socketio.start_background_task(target=breakage_video_processing_thread, video_path=video_path, sid=sid, stop_event=stop_event)

@socketio.on('disconnect', namespace='/ws/damage_feed')
def disconnect_breakage_feed():
    sid = request.sid
    print(f'Client disconnected from breakage feed: {sid}')
    if sid in video_threads:
        video_threads[sid].set()
        del video_threads[sid]
        print(f"Stopped video thread for {sid}")

# --- 폭행 감지 웹소켓 핸들러 ---
def violence_video_processing_thread(video_path, sid, stop_event):
    """폭행 감지 비디오 처리를 위한 백그라운드 스레드"""
    print(f"Starting violence detection thread for {sid} with video {video_path}")
    detector = ViolenceDetector(yolo_model_path='./yolov8n.pt')
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video stream from {video_path}")
        return

    try:
        while not stop_event.is_set():
            ret, frame = cap.read()
            if not ret:
                print(f"End of video stream for {sid}, restarting.")
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0) # 비디오 루프
                continue

            processed_frame, detection_results = detector.process_frame(frame)
            _, buffer = cv2.imencode('.jpg', processed_frame)
            encoded_image = base64.b64encode(buffer).decode('utf-8')
            
            # Save incident if violence is detected, with cooldown
            if detection_results.get('is_violence'):
                save_incident_if_needed(sid, "Violence", "ViolenceDetector")

            socketio.emit('response', {
                'image': 'data:image/jpeg;base64,' + encoded_image,
                'detections': detection_results
            }, namespace='/ws/violence_feed', room=sid)
            socketio.sleep(0.03) # ~33 FPS
    except Exception as e:
        print(f'Exiting violence detection thread for {sid} due to error: {e}')
    finally:
        cap.release()
        print(f"Released video capture for {sid}")

@socketio.on('connect', namespace='/ws/violence_feed')
def connect_violence_feed():
    sid = request.sid
    print(f'Client connected to violence feed: {sid}')
    if sid in video_threads:
        video_threads[sid].set()

    stop_event = Event()
    video_threads[sid] = stop_event

    video_path = './uploads/C_3_13_1_BU_SMA_08-28_14-30-29_CA_RGB_DF2_F1.mp4'
    socketio.start_background_task(target=violence_video_processing_thread, video_path=video_path, sid=sid, stop_event=stop_event)

@socketio.on('disconnect', namespace='/ws/violence_feed')
def disconnect_violence_feed():
    sid = request.sid
    print(f'Client disconnected from violence feed: {sid}')
    if sid in video_threads:
        video_threads[sid].set()
        del video_threads[sid]
        print(f"Stopped video thread for {sid}")

# --- 교통약자 감지 웹소켓 핸들러 ---
def weak_video_processing_thread(video_path, sid, stop_event):
    """교통약자 감지 비디오 처리를 위한 백그라운드 스레드"""
    print(f"Starting weak detection thread for {sid} with video {video_path}")
    detector = WeakDetector(yolo_model_path='./yolov8n.pt')
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: Could not open video stream from {video_path}")
        return

    try:
        while not stop_event.is_set():
            ret, frame = cap.read()
            if not ret:
                print(f"End of video stream for {sid}, restarting.")
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0) # 비디오 루프
                continue

            processed_frame, detection_results = detector.process_frame(frame)
            _, buffer = cv2.imencode('.jpg', processed_frame)
            encoded_image = base64.b64encode(buffer).decode('utf-8')
            
            # Save incident if weak user is detected, with cooldown
            if detection_results.get('is_weak'):
                save_incident_if_needed(sid, "Weak User", "WeakDetector")

            socketio.emit('response', {
                'image': 'data:image/jpeg;base64,' + encoded_image,
                'detections': detection_results
            }, namespace='/ws/weak_feed', room=sid)
            socketio.sleep(0.03) # ~33 FPS
    except Exception as e:
        print(f'Exiting weak detection thread for {sid} due to error: {e}')
    finally:
        cap.release()
        print(f"Released video capture for {sid}")

@socketio.on('connect', namespace='/ws/weak_feed')
def connect_weak_feed():
    sid = request.sid
    print(f'Client connected to weak feed: {sid}')
    if sid in video_threads:
        video_threads[sid].set()

    stop_event = Event()
    video_threads[sid] = stop_event

    video_path = './uploads/C_3_14_1_BU_DYB_10-11_14-46-58_CB_DF2_M2.mp4'
    socketio.start_background_task(target=weak_video_processing_thread, video_path=video_path, sid=sid, stop_event=stop_event)

@socketio.on('disconnect', namespace='/ws/weak_feed')
def disconnect_weak_feed():
    sid = request.sid
    print(f'Client disconnected from weak feed: {sid}')
    if sid in video_threads:
        video_threads[sid].set()
        del video_threads[sid]
        print(f"Stopped video thread for {sid}")


with app.app_context():
   initialize_database()
   create_roles()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, async_mode='eventlet')
