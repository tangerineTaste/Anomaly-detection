import os
import cv2
import numpy as np
import tensorflow as tf
import mediapipe as mp
from collections import deque

# --- 1. 모델 및 설정 불러오기 (초기화 함수) ---
def load_smoking_model():
    """
    흡연 탐지 모델과 MediaPipe Pose 모델을 로드합니다.
    이 함수는 애플리케이션 시작 시 한 번만 호출되어야 합니다.
    """
    print("Trained model loading...")
    model_path = os.path.join(os.path.dirname(__file__), 'best_model.h5')
    model = tf.keras.models.load_model(model_path)
    
    mp_pose = mp.solutions.pose
    pose = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5, min_tracking_confidence=0.5)
    
    return model, pose

# --- 2. 프레임 처리 및 예측 함수 ---
# 상수 정의
WINDOW_SIZE = 30
VISIBILITY_THRESHOLD = 0.25

# 훈련 시 사용했던 관절 순서 및 정보
joint_order_train = [
    "Pelvis", "Spine naval", "Spine chest", "Neck base", "Center head",
    "Left hip", "Left knee", "Left foot", "Right hip", "Right knee", "Right foot",
    "Left shoulder", "Left elbow", "Left hand", "Right shoulder", "Right elbow", "Right hand"
]
NUM_JOINTS_TRAIN = len(joint_order_train)

mp_pose = mp.solutions.pose
joint_map_mp = {
    "Left hip": mp_pose.PoseLandmark.LEFT_HIP, "Left knee": mp_pose.PoseLandmark.LEFT_KNEE,
    "Left foot": mp_pose.PoseLandmark.LEFT_ANKLE, "Right hip": mp_pose.PoseLandmark.RIGHT_HIP,
    "Right knee": mp_pose.PoseLandmark.RIGHT_KNEE, "Right foot": mp_pose.PoseLandmark.RIGHT_ANKLE,
    "Left shoulder": mp_pose.PoseLandmark.LEFT_SHOULDER, "Left elbow": mp_pose.PoseLandmark.LEFT_ELBOW,
    "Left hand": mp_pose.PoseLandmark.LEFT_WRIST, "Right shoulder": mp_pose.PoseLandmark.RIGHT_SHOULDER,
    "Right elbow": mp_pose.PoseLandmark.RIGHT_ELBOW, "Right hand": mp_pose.PoseLandmark.RIGHT_WRIST,
    "Center head": mp_pose.PoseLandmark.NOSE,
}

key_joint_names = [
    "Left shoulder", "Left elbow", "Left hand",
    "Right shoulder", "Right elbow", "Right hand", "Center head",
]
key_joint_map_mp_enums = [joint_map_mp.get(name) for name in key_joint_names if joint_map_mp.get(name) is not None]

def process_frame_for_smoking(frame, sequence_data, model, pose):
    """
    단일 프레임을 받아 흡연 여부를 예측하고, 예측 결과와 스켈레톤이 그려진 프레임을 반환합니다.
    """
    frame.flags.writeable = False
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(frame_rgb)
    frame.flags.writeable = True

    prediction_text = "Waiting..."
    key_joints_visible = False
    
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark
        
        # --- 핵심 관절 가시성 확인 ---
        visible_key_count = sum(1 for lm_enum in key_joint_map_mp_enums if lm_enum.value < len(landmarks) and landmarks[lm_enum.value].visibility > VISIBILITY_THRESHOLD)
        left_shoulder_visible = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].visibility > VISIBILITY_THRESHOLD
        right_shoulder_visible = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].visibility > VISIBILITY_THRESHOLD

        if visible_key_count == len(key_joint_map_mp_enums) and left_shoulder_visible and right_shoulder_visible:
            key_joints_visible = True

        if key_joints_visible:
            # --- 관절 좌표 계산 ---
            left_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
            right_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
            pelvis_calculable = left_hip.visibility > VISIBILITY_THRESHOLD and right_hip.visibility > VISIBILITY_THRESHOLD
            
            pelvis_x, pelvis_y = ((left_hip.x + right_hip.x) / 2, (left_hip.y + right_hip.y) / 2) if pelvis_calculable else (0.0, 0.0)

            left_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
            right_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
            shoulder_center_x = (left_shoulder.x + right_shoulder.x) / 2
            shoulder_center_y = (left_shoulder.y + right_shoulder.y) / 2

            calculated_coords = {
                "Pelvis": (pelvis_x, pelvis_y), "Spine naval": (pelvis_x, pelvis_y),
                "Spine chest": (shoulder_center_x, shoulder_center_y), "Neck base": (shoulder_center_x, shoulder_center_y),
                "Center head": (landmarks[mp_pose.PoseLandmark.NOSE.value].x, landmarks[mp_pose.PoseLandmark.NOSE.value].y)
            }
            
            # --- 전체 관절 좌표 정규화 ---
            temp_coords_normalized = []
            frame_valid = True
            for joint_name in joint_order_train:
                joint_visible = False
                x, y = 0.0, 0.0

                if joint_name in calculated_coords:
                    x_calc, y_calc = calculated_coords[joint_name]
                    # 기반 관절 가시성 체크
                    if joint_name in ["Pelvis", "Spine naval"] and pelvis_calculable: joint_visible = True
                    elif joint_name in ["Spine chest", "Neck base"] and left_shoulder_visible and right_shoulder_visible: joint_visible = True
                    elif joint_name == "Center head" and landmarks[mp_pose.PoseLandmark.NOSE.value].visibility > VISIBILITY_THRESHOLD: joint_visible = True
                    if joint_visible: x, y = x_calc, y_calc
                else:
                    mp_landmark = joint_map_mp.get(joint_name)
                    if mp_landmark and mp_landmark.value < len(landmarks):
                        lm = landmarks[mp_landmark.value]
                        if lm.visibility > VISIBILITY_THRESHOLD:
                            x, y = lm.x, lm.y
                            joint_visible = True
                
                if joint_name in key_joint_names and not joint_visible:
                    frame_valid = False
                    break
                
                norm_x = x - pelvis_x if pelvis_calculable else x
                norm_y = y - pelvis_y if pelvis_calculable else y
                temp_coords_normalized.extend([norm_x, norm_y])

            if frame_valid and len(temp_coords_normalized) == NUM_JOINTS_TRAIN * 2:
                sequence_data.append(temp_coords_normalized)

    # --- 예측 수행 ---
    if len(sequence_data) < WINDOW_SIZE:
        prediction_text = "waiting"
    else:
        input_data = np.expand_dims(np.array(sequence_data), axis=0)
        prediction = model.predict(input_data)[0][0]
        prediction_text = f"SMOKING ({prediction:.2f})" if prediction > 0.9 else f"NORMAL ({prediction:.2f})"

    return prediction_text, frame, results
