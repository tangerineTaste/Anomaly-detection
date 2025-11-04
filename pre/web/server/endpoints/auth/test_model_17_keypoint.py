import cv2
import numpy as np
import tensorflow as tf
import mediapipe as mp
from collections import deque
import os

# --- 1. 모델 및 설정 불러오기 ---
print("Trained model loading...")
model = tf.keras.models.load_model('best_model.h5') # 훈련된 모델 불러오기

# MediaPipe Pose 모델 초기화
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5) # 감지 신뢰도 설정
mp_drawing = mp.solutions.drawing_utils

# 윈도우 크기
WINDOW_SIZE = 30
# 예측을 위한 시퀀스 데이터 deque
sequence_data = deque(maxlen=WINDOW_SIZE)

# --- 🔥 중요: 훈련 시 사용했던 관절 순서 정의 ---
joint_order_train = [
    "Pelvis", "Spine naval", "Spine chest", "Neck base", "Center head",
    "Left hip", "Left knee", "Left foot", "Right hip", "Right knee", "Right foot",
    "Left shoulder", "Left elbow", "Left hand", "Right shoulder", "Right elbow", "Right hand"
]
NUM_JOINTS_TRAIN = len(joint_order_train)

# --- 🔥 중요: 훈련 관절과 MediaPipe 관절 매핑 ---
joint_map_mp = {
    "Left hip": mp_pose.PoseLandmark.LEFT_HIP,
    "Left knee": mp_pose.PoseLandmark.LEFT_KNEE,
    "Left foot": mp_pose.PoseLandmark.LEFT_ANKLE,
    "Right hip": mp_pose.PoseLandmark.RIGHT_HIP,
    "Right knee": mp_pose.PoseLandmark.RIGHT_KNEE,
    "Right foot": mp_pose.PoseLandmark.RIGHT_ANKLE,
    "Left shoulder": mp_pose.PoseLandmark.LEFT_SHOULDER,
    "Left elbow": mp_pose.PoseLandmark.LEFT_ELBOW,
    "Left hand": mp_pose.PoseLandmark.LEFT_WRIST,
    "Right shoulder": mp_pose.PoseLandmark.RIGHT_SHOULDER,
    "Right elbow": mp_pose.PoseLandmark.RIGHT_ELBOW,
    "Right hand": mp_pose.PoseLandmark.RIGHT_WRIST,
    # 계산 필요한 관절은 일단 None 또는 임시 매핑
    "Spine naval": None,
    "Spine chest": None,
    "Neck base": None,
    "Center head": mp_pose.PoseLandmark.NOSE,
}
VISIBILITY_THRESHOLD = 0.25

# --- ✨ 핵심 관절 이름 정의 ---
key_joint_names = [
    "Left shoulder", "Left elbow", "Left hand",
    "Right shoulder", "Right elbow", "Right hand",
    "Center head", #"Neck base" # Neck base는 계산 관절이라 제외
]

# 핵심 관절에 해당하는 MediaPipe 랜드마크만 추출 (계산 제외)
key_joint_map_mp_enums = []
for name in key_joint_names:
     mp_landmark = joint_map_mp.get(name)
     if mp_landmark is not None:
          key_joint_map_mp_enums.append(mp_landmark)

# --- 2. 비디오 파일 로드 ---
# 파일 경로를 직접 지정하거나, input() 등으로 받을 수 있습니다.
video_path = './NIA/3 이상행동/10 흡연/_S3 최종데이터 mp4_흡연807/C_3_10_1_BU_DYA_08-04_11-16-34_CB_RGB_DF2_M2.mp4'
cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    print(f"Error: Could not open video file: {video_path}")
    exit()

# --- (선택) 결과 영상 저장을 위한 설정 ---
# output_video_path = 'output_keypoints_video.mp4'
# frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
# frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
# fps = int(cap.get(cv2.CAP_PROP_FPS))
# fourcc = cv2.VideoWriter_fourcc(*'mp4v')
# out = cv2.VideoWriter(output_video_path, fourcc, fps, (frame_width, frame_height))

# --- 3. 비디오 프레임 처리 루프 ---
while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        print("End of video file.")
        break

    frame.flags.writeable = False
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = pose.process(frame_rgb)
    frame.flags.writeable = True

    key_joints_visible = False # ✨ 핵심 관절 가시성 플래그
    frame_coords_normalized = [] # 이번 프레임의 최종 좌표 데이터 (34개)
    valid_frame_data = False # 이번 프레임 데이터가 유효하게 생성되었는지

    # --- 3. ✨ 핵심 관절 가시성 확인 및 전체 관절 좌표 생성 ---
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark

        # --- ✨ 핵심 관절이 모두 보이는지 우선 확인 ---
        visible_key_count = 0
        for landmark_enum in key_joint_map_mp_enums:
            if landmark_enum.value < len(landmarks) and landmarks[landmark_enum.value].visibility > VISIBILITY_THRESHOLD:
                visible_key_count += 1
        
        # 어깨 중앙(Neck base 계산용) 확인 추가
        left_shoulder_visible = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].visibility > VISIBILITY_THRESHOLD
        right_shoulder_visible = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].visibility > VISIBILITY_THRESHOLD

        if visible_key_count == len(key_joint_map_mp_enums) and left_shoulder_visible and right_shoulder_visible:
            key_joints_visible = True

        # --- ✨ 핵심 관절들이 보이면, 전체 17개 좌표 생성 시도 ---
        if key_joints_visible:
            # --- 계산 관절 시도 ---
            pelvis_x, pelvis_y = 0.0, 0.0
            pelvis_calculable = False
            left_hip_coord = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
            right_hip_coord = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
            if left_hip_coord.visibility > VISIBILITY_THRESHOLD and right_hip_coord.visibility > VISIBILITY_THRESHOLD:
                pelvis_x = (left_hip_coord.x + right_hip_coord.x) / 2
                pelvis_y = (left_hip_coord.y + right_hip_coord.y) / 2
                pelvis_calculable = True
            
            # Neck base 등 계산 (어깨 중앙 사용)
            left_shoulder_coord = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
            right_shoulder_coord = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
            shoulder_center_x = (left_shoulder_coord.x + right_shoulder_coord.x) / 2
            shoulder_center_y = (left_shoulder_coord.y + right_shoulder_coord.y) / 2
            
            calculated_coords = {
                "Pelvis": (pelvis_x, pelvis_y),
                "Spine naval": (pelvis_x, pelvis_y), # 임시: 골반 사용
                "Spine chest": (shoulder_center_x, shoulder_center_y), # 임시: 어깨 중앙 사용
                "Neck base": (shoulder_center_x, shoulder_center_y), # 임시: 어깨 중앙 사용
                "Center head": (landmarks[mp_pose.PoseLandmark.NOSE.value].x, landmarks[mp_pose.PoseLandmark.NOSE.value].y) # NOSE 사용
            }
            pelvis_origin_x, pelvis_origin_y = calculated_coords["Pelvis"] # 기준점 (0,0 일 수 있음)

            # --- 전체 17개 관절 순회하며 좌표 생성 ---
            temp_coords_normalized = []
            frame_valid = True # 이 프레임 데이터 유효성

            for joint_name in joint_order_train:
                joint_visible_this_iter = False
                x, y = 0.0, 0.0 # 기본값 (안보일 경우)

                if joint_name in calculated_coords:
                     # 계산된 관절 좌표 사용, 가시성은 기반 관절 따름
                     x_calc, y_calc = calculated_coords[joint_name]
                     # 기반 관절(골반, 어깨, 코) 가시성 체크
                     if joint_name == "Pelvis" and pelvis_calculable: joint_visible_this_iter = True
                     elif joint_name == "Spine naval" and pelvis_calculable: joint_visible_this_iter = True
                     elif joint_name in ["Spine chest", "Neck base"] and left_shoulder_visible and right_shoulder_visible: joint_visible_this_iter = True
                     elif joint_name == "Center head" and landmarks[mp_pose.PoseLandmark.NOSE.value].visibility > VISIBILITY_THRESHOLD: joint_visible_this_iter = True
                     
                     if joint_visible_this_iter: x, y = x_calc, y_calc

                else: # 직접 매핑된 관절
                    mp_landmark = joint_map_mp.get(joint_name)
                    if mp_landmark is not None and mp_landmark.value < len(landmarks):
                        lm = landmarks[mp_landmark.value]
                        if lm.visibility > VISIBILITY_THRESHOLD:
                            x, y = lm.x, lm.y
                            joint_visible_this_iter = True
                
                # 정규화: 골반 계산 가능하면 빼주고, 아니면 (0,0) 기준이므로 그대로 사용
                norm_x = x - pelvis_origin_x if pelvis_calculable else x
                norm_y = y - pelvis_origin_y if pelvis_calculable else y
                temp_coords_normalized.extend([norm_x, norm_y])

                # ✨ 만약 이 관절이 '핵심 관절'인데 안보였다면, 이 프레임은 버린다
                if joint_name in key_joint_names and not joint_visible_this_iter:
                     frame_valid = False
                     break # 더 이상 이 프레임 처리 무의미

            # --- 최종 유효성 검사 후 데이터 저장 ---
            if frame_valid and len(temp_coords_normalized) == NUM_JOINTS_TRAIN * 2:
                 frame_coords_normalized = temp_coords_normalized
                 sequence_data.append(frame_coords_normalized)
                 valid_frame_data = True # 유효한 데이터가 sequence에 추가됨
            # else: key_joints_visible = False # 예측 못하도록 플래그 내림 (이미 위에서 처리됨)

    # --- 4. 예측 및 결과 표시 ---
    prediction_text = "Waiting..."
    color = (255, 165, 0) # Orange default

    # ✨ sequence_data가 꽉 찼을 때만 예측 시도
    if len(sequence_data) == WINDOW_SIZE:
        input_data = np.expand_dims(np.array(sequence_data), axis=0)
        prediction = model.predict(input_data)[0][0]

        if prediction > 0.9: # 예측 임계값 설정
            prediction_text = f"SMOKING ({prediction:.2f})"
            color = (0, 0, 255) # Red
        else:
            prediction_text = f"NORMAL ({prediction:.2f})"
            color = (0, 255, 0) # Green
    elif not key_joints_visible and results.pose_landmarks: # 관절은 있는데 핵심이 안보일 때
         prediction_text = "Key Joints Hidden"
         color = (0, 255, 255) # Yellow


    # 화면에 텍스트 표시
    cv2.putText(frame, prediction_text, (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.5, color, 3)

    # 스켈레톤 그리기
    if results.pose_landmarks:
        mp_drawing.draw_landmarks(
            frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS,
            landmark_drawing_spec=mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=2),
            connection_drawing_spec=mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2)
            )

    # 화면에 출력 (결과 저장 대신)
    cv2.imshow('Smoking Detection - Keypoints Focus', frame)
    # out.write(frame) # 결과 저장 시 사용

    if cv2.waitKey(1) & 0xFF == ord('q'): # waitKey(1) 로 변경하여 비디오 속도에 맞춤
        break

# --- 5. 자원 해제 ---
cap.release()
# out.release() # 결과 저장 시 사용
cv2.destroyAllWindows()
pose.close()

# print(f"Processing complete. Output video saved to: {output_video_path}") # 결과 저장 시 사용