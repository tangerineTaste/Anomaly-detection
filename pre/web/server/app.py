import json
import time
from flask import Flask, jsonify, render_template
from flask_socketio import SocketIO, emit
import base64
import cv2
import numpy as np
from flask_cors import CORS
import logging
import requests
from threading import Thread

#Handel token releated operations
from endpoints.auth.helpers import revoke_token, is_token_revoked

# Importing the rest_api from routes.py
from endpoints import Foresight_API
# Importing the extensions
from extensions import db, jwt
from models import Roles
from models.camera import CameraDetails

# Creating the Flask app instance
app = Flask(__name__)

# Loading configuration from BaseConfig class in the config module
app.config.from_object('config.BaseConfig')
app.config['SECRET_KEY'] = 'key'
socketio = SocketIO(app, cors_allowed_origins="*") 

# Initializing the database with the app instance
db.init_app(app)

# Initializing the rest_api with the app instance
Foresight_API.init_app(app)


# Initializing the JWTManager extension with the app instance
jwt.init_app(app)

# Enabling Cross-Origin Resource Sharing (CORS)
CORS(app)

#Initialize boolean
initialized = False

# Global variable to store RTSP URLs
#rtsp_urls = []

# Assuming CameraDetails model and rtsp_urls variable as previously defined

# def process_stream(rtsp_url):
#     try:
#         response = requests.post('http://localhost:5000/api/users/process_weapon', json={'rtsp_url': rtsp_url})
#         print(f"Response for {rtsp_url}: {response.status_code}")
#     except Exception as e:
#         print(f"Error processing stream {rtsp_url}: {e}")

# def construct_and_send_rtsp_urls():
#     global rtsp_urls
#     try:
#         cameras = CameraDetails.query.all()
#         with ThreadPoolExecutor(max_workers=len(cameras)) as executor:
#             for camera in cameras:
#                 portactive = ":" + camera.Port if camera.Port else ""
#                 rtsp_url = f"rtsp://{camera.IPAddress}{portactive}/{camera.Option}"
#                 rtsp_urls.append(rtsp_url)
#                 executor.submit(process_stream, rtsp_url)
#         print("RTSP URLs processing initiated.")
#     except Exception as e:
#         print(f"Error during RTSP URL processing: {e}")

# @app.before_request
# def startup():
#     construct_and_send_rtsp_urls()




@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_data):
    try:
        if is_token_revoked(jwt_data):

            # Provide a generic response
            
            print("hit token already revoked")
            return jsonify({"message": "Authentication failed", "error": "token_revoked"}), 401
        else:
            jti = jwt_data["jti"]
            user_id = jwt_data[app.config.get("JWT_IDENTITY_CLAIM")]
            revoke_token(jti,user_id);
            # Provide a generic response
            return jsonify({"message": "Authentication failed", "error": "token_expired"}), 401
    except Exception as e:

        # Provide a generic response
        print("hit exception")
        return jsonify({"message": "Authentication failed", "error": "token_expired"}), 401



@jwt.invalid_token_loader
def invalid_token_callback(error):
        return (
            jsonify(
                {"message": "Signature verification has failed", "error": "invalid_token"}
            ),
            401,
        )

@jwt.unauthorized_loader
def missing_token_callback(error):
        return (
            jsonify(
                {
                    "message": "Request doesnt contain valid token",
                    "error": "authorization_header",
                }
            ),
            401,
        )

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
    """Close the database session at the end of each request."""
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

# Custom response for debugging
@app.after_request
def after_request(response):
    # Check if the response status code indicates an error (400 or higher)
    if response.status_code >= 400:
        try:
            response_data = json.loads(response.get_data())
            if "errors" in response_data:
                # If "errors" key exists in the response data, transform it
                response_data = {"success": False,
                                 "msg": list(response_data["errors"].items())[0][1]}
                response.set_data(json.dumps(response_data))
            response.headers.add('Content-Type', 'application/json')
        except json.JSONDecodeError as e:
            # If JSON decoding fails, log the error and leave the response unchanged
            logging.error(f"JSON decoding error: {e}")

    return response

from collections import deque
from smoking_model import load_smoking_model, process_frame_for_smoking
import mediapipe as mp

# --- 모델 및 관련 변수 초기화 ---
smoking_model, smoking_pose = load_smoking_model()
sequence_data = deque(maxlen=30) # WINDOW_SIZE
mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose
is_processing = False # 프레임 처리 중인지 확인하는 플래그

@socketio.on('connect', namespace='/ws/video_feed' )
def test_connect():
    print('Client connected')
    # 참고: 다중 사용자를 지원하려면 세션별로 sequence_data를 관리해야 합니다.
    # 예: session['sequence_data'] = deque(maxlen=30)
    
@socketio.on('disconnect', namespace='/ws/video_feed')
def test_disconnect():
    print('Client disconnected')
    
@socketio.on('message', namespace='/ws/video_feed')
def handle_message(data):
    global is_processing
    if is_processing:
        return  # 이미 처리 중인 프레임이 있으면 현재 프레임은 건너뜁니다.

    is_processing = True
    try:
        global smoking_model, smoking_pose # Moved global declaration here
        if data.startswith('data:image/jpeg;base64,'):
            base64_image = data.split(',')[1]
            try:
                image_bytes = base64.b64decode(base64_image)
                nparr = np.frombuffer(image_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                # --- 흡연 탐지 모델로 프레임 처리 ---
                try:
                    prediction, processed_frame, landmarks = process_frame_for_smoking(
                        frame, sequence_data, smoking_model, smoking_pose
                    )

                    # --- 결과 프레임에 스켈레톤 그리기 ---
                    if landmarks.pose_landmarks:
                        mp_drawing.draw_landmarks(
                            processed_frame, landmarks.pose_landmarks, mp_pose.POSE_CONNECTIONS,
                            landmark_drawing_spec=mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=2),
                            connection_drawing_spec=mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2)
                        )
                    
                    # --- 프레임을 다시 base64로 인코딩하여 클라이언트에 전송 ---
                    _, buffer = cv2.imencode('.jpg', processed_frame)
                    encoded_image = base64.b64encode(buffer).decode('utf-8')
                    
                    # 예측 결과와 처리된 이미지를 클라이언트에 전송
                    emit('response', {'image': 'data:image/jpeg;base64,' + encoded_image, 'prediction': prediction})

                except Exception as mediapipe_error:
                    # global smoking_model, smoking_pose # Removed from here
                    print(f"MediaPipe 처리 중 오류 발생: {mediapipe_error}. 모델을 다시 로드합니다.")
                    smoking_model, smoking_pose = load_smoking_model()
                    # Optionally, send a message to the client that there was an error or to re-send
                    emit('error', {'message': 'MediaPipe processing error, re-initializing model.'})

            except Exception as e:
                print(f'이미지 디코딩 또는 기타 오류: {e}')
        else:
            print('알 수 없는 메시지 형식:', data[:50])
    finally:
        is_processing = False # 처리가 끝나면 플래그를 리셋합니다.

        
with app.app_context():
    # Initialization code that requires app context
   initialize_database()
   create_roles()
   # start_initialize_processing()

# This part runs the Flask app if this script is being executed directly
if __name__ == '__main__':
    socketio.run(app, host='127.0.0.1', port=5000, async_mode='eventlet')