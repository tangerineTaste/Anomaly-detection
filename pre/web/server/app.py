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
from threading import Thread
from ultralytics import YOLO

#Handel token releated operations
from endpoints.auth.helpers import revoke_token, is_token_revoked

# Importing the rest_api from routes.py
from endpoints import Foresight_API
# Importing the extensions
from extensions import db, jwt
from models import Roles
from models.camera import CameraDetails
from flask_migrate import Migrate # Flask-Migrate 임포트

from collections import deque
from smoking_model import load_smoking_model, process_frame_for_smoking
import mediapipe as mp
from abandon import AbandonedItemDetector
from Damage import DamageDetector

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

@socketio.on('connect', namespace='/ws/video_feed' )
def test_connect():
    print('Client connected to smoking feed')
    
@socketio.on('disconnect', namespace='/ws/video_feed')
def test_disconnect():
    print('Client disconnected from smoking feed')
    
@socketio.on('message', namespace='/ws/video_feed')
def handle_message(data):
    global is_processing
    if is_processing:
        return
    is_processing = True
    try:
        if data.startswith('data:image/jpeg;base64,'):
            base64_image = data.split(',')[1]
            image_bytes = base64.b64decode(base64_image)
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is not None:
                prediction, processed_frame, landmarks = process_frame_for_smoking(frame, sequence_data, smoking_model, smoking_pose)
                if landmarks.pose_landmarks:
                    mp_drawing.draw_landmarks(
                        processed_frame, landmarks.pose_landmarks, mp_pose.POSE_CONNECTIONS,
                        landmark_drawing_spec=mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=2),
                        connection_drawing_spec=mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2)
                    )
                _, buffer = cv2.imencode('.jpg', processed_frame)
                encoded_image = base64.b64encode(buffer).decode('utf-8')
                emit('response', {'image': 'data:image/jpeg;base64,' + encoded_image, 'prediction': prediction})
    except Exception as e:
        print(f'Error in smoking detection: {e}')
    finally:
        is_processing = False

# --- 유기물 감지 웹소켓 핸들러 ---
@socketio.on('connect', namespace='/ws/abandoned_feed')
def connect_abandoned_feed():
    sid = request.sid
    print(f'Client connected to abandoned feed: {sid}')
    abandoned_detectors[sid] = AbandonedItemDetector(yolo_model=yolo_model)
    print(f"Created new AbandonedItemDetector for session {sid}")

@socketio.on('disconnect', namespace='/ws/abandoned_feed')
def disconnect_abandoned_feed():
    sid = request.sid
    if sid in abandoned_detectors:
        del abandoned_detectors[sid]
        print(f"Removed AbandonedItemDetector for session {sid}")
    print(f'Client disconnected from abandoned feed: {sid}')

@socketio.on('message', namespace='/ws/abandoned_feed')
def handle_abandoned_message(data):
    global is_abandon_processing
    if is_abandon_processing:
        return
    is_abandon_processing = True
    try:
        sid = request.sid
        if sid not in abandoned_detectors:
            return
        if data.startswith('data:image/jpeg;base64,'):
            base64_image = data.split(',')[1]
            image_bytes = base64.b64decode(base64_image)
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is not None:
                detector = abandoned_detectors[sid]
                processed_frame, detection_results = detector.process_frame(frame)
                _, buffer = cv2.imencode('.jpg', processed_frame)
                encoded_image = base64.b64encode(buffer).decode('utf-8')
                emit('response', {
                    'image': 'data:image/jpeg;base64,' + encoded_image,
                    'detections': detection_results
                }, namespace='/ws/abandoned_feed')
    except Exception as e:
        print(f'Error processing abandoned frame for session {request.sid}: {e}')
    finally:
        is_abandon_processing = False

# --- 폭행 감지 웹소켓 핸들러 ---
@socketio.on('connect', namespace='/ws/damage_feed')
def connect_damage_feed():
    sid = request.sid
    print(f'Client connected to damage feed: {sid}')
    damage_detectors[sid] = DamageDetector(yolo_model_path='./yolov8n.pt')
    print(f"Created new DamageDetector for session {sid}")

@socketio.on('disconnect', namespace='/ws/damage_feed')
def disconnect_damage_feed():
    sid = request.sid
    if sid in damage_detectors:
        del damage_detectors[sid]
        print(f"Removed DamageDetector for session {sid}")
    print(f'Client disconnected from damage feed: {sid}')

@socketio.on('message', namespace='/ws/damage_feed')
def handle_damage_message(data):
    global is_damage_processing
    if is_damage_processing:
        return
    is_damage_processing = True
    try:
        sid = request.sid
        if sid not in damage_detectors:
            return
        if data.startswith('data:image/jpeg;base64,'):
            base64_image = data.split(',')[1]
            image_bytes = base64.b64decode(base64_image)
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is not None:
                detector = damage_detectors[sid]
                processed_frame, detection_results = detector.process_frame(frame)
                _, buffer = cv2.imencode('.jpg', processed_frame)
                encoded_image = base64.b64encode(buffer).decode('utf-8')
                emit('response', {
                    'image': 'data:image/jpeg;base64,' + encoded_image,
                    'detections': detection_results
                }, namespace='/ws/damage_feed')
    except Exception as e:
        print(f'Error processing damage frame for session {request.sid}: {e}')
    finally:
        is_damage_processing = False

with app.app_context():
   initialize_database()
   create_roles()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, async_mode='eventlet')
