# 하이브리드 방화 감지 시스템 - 수정 버전
import cv2 as cv
import mediapipe as mp
import numpy as np
from collections import deque
import time
from PIL import ImageFont, ImageDraw, Image
import os

class FireDetector:
    def __init__(self, yolo_model_path=None):
        # MediaPipe 초기화
        self.mp_pose = mp.solutions.pose
        self.mp_hand = mp.solutions.hands
        self.mp_drawing = mp.solutions.drawing_utils

        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            enable_segmentation=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        self.hand = self.mp_hand.Hands(
            max_num_hands=2,
            static_image_mode=False,
            min_detection_confidence=0.3,
            min_tracking_confidence=0.5
        )

        # YOLO
        self.YOLO_AVAILABLE = False
        self.yolo_model = None
        if yolo_model_path:
            try:
                from ultralytics import YOLO
                self.yolo_model = YOLO(yolo_model_path)
                self.YOLO_AVAILABLE = True
                print(f"[INIT] YOLO model loaded from {yolo_model_path}")
            except Exception as e:
                print(f"[INIT] YOLO not available: {e}")

        # 전역 변수 -> 인스턴스 변수
        self.alert_mode = False
        self.confirmed_fires = []
        self.fire_history = deque(maxlen=10)
        self.next_fire_id = 1
        self.frame_count = 0
        self.show_debug = False

        try:
            self.font_pil = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 26)
        except IOError:
            try:
                self.font_pil = ImageFont.truetype(os.path.join(os.path.dirname(__file__), "font", "malgun.ttf"), 26)
            except IOError:
                self.font_pil = ImageFont.load_default()
                print("Arial or malgun 폰트를 찾을 수 없어 기본 폰트 사용")

    def detect_fire_color(self, frame):
        """원본 색상 기반 화재 감지"""
        # YUV 색상 공간
        yuv = cv.cvtColor(frame, cv.COLOR_BGR2YUV)
        y_channel = yuv[:, :, 0]
        u_channel = yuv[:, :, 1]
        v_channel = yuv[:, :, 2]
        
        y_mask = cv.inRange(y_channel, 190, 255)
        u_mask = cv.inRange(u_channel, 0, 100)
        v_mask = cv.inRange(v_channel, 145, 255)
        fire_mask_yuv = cv.bitwise_and(cv.bitwise_and(y_mask, u_mask), v_mask)
        
        # HSV 색상 공간
        hsv = cv.cvtColor(frame, cv.COLOR_BGR2HSV)
        
        lower_red = np.array([0, 120, 150])
        upper_red = np.array([10, 255, 255])
        mask_red = cv.inRange(hsv, lower_red, upper_red)
        
        lower_orange = np.array([10, 120, 150])
        upper_orange = np.array([25, 255, 255])
        mask_orange = cv.inRange(hsv, lower_orange, upper_orange)
        
        fire_mask_hsv = cv.bitwise_or(mask_red, mask_orange)
        
        # 밝기 마스크
        gray = cv.cvtColor(frame, cv.COLOR_BGR2GRAY)
        _, white_mask = cv.threshold(gray, 200, 255, cv.THRESH_BINARY)
        
        # 조합
        strong_fire = cv.bitwise_and(fire_mask_yuv, fire_mask_hsv)
        yuv_only = cv.bitwise_and(fire_mask_yuv, cv.bitwise_not(fire_mask_hsv))
        yuv_bright = cv.bitwise_and(yuv_only, white_mask)
        hsv_only = cv.bitwise_and(fire_mask_hsv, cv.bitwise_not(fire_mask_yuv))
        hsv_bright = cv.bitwise_and(hsv_only, white_mask)
        
        fire_mask = cv.bitwise_or(strong_fire, yuv_bright)
        fire_mask = cv.bitwise_or(fire_mask, hsv_bright)
        
        # 노이즈 제거
        kernel_small = np.ones((2, 2), np.uint8)
        kernel_large = np.ones((3, 3), np.uint8)
        
        fire_mask = cv.morphologyEx(fire_mask, cv.MORPH_OPEN, kernel_small)
        fire_mask = cv.morphologyEx(fire_mask, cv.MORPH_CLOSE, kernel_large)
        fire_mask = cv.medianBlur(fire_mask, 3)
        
        return fire_mask

    def detect_fire_yolo(self, frame):
        """YOLO 기반 화재 감지"""
        if not self.yolo_model or not self.YOLO_AVAILABLE:
            return []
        
        try:
            results = self.yolo_model(frame, conf=0.3, verbose=False)
            detections = []
            
            for result in results:
                if result.boxes:
                    boxes = result.boxes
                    for box in boxes:
                        cls = int(box.cls[0])
                        conf = float(box.conf[0])
                        class_name = self.yolo_model.names[cls]
                        
                        if 'fire' in class_name.lower():
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            center_x = (x1 + x2) // 2
                            center_y = (y1 + y2) // 2
                            
                            detections.append({
                                'bbox': (x1, y1, x2, y2),
                                'center': (center_x, center_y),
                                'conf': conf,
                                'class': class_name
                            })
            
            return detections
        except Exception as e:
            print(f"YOLO fire detection error: {e}")
            return []

    def calculate_flickering(self, contour, frame):
        """너울거림 점수 계산"""
        M = cv.moments(contour)
        if M["m00"] == 0:
            return 0, (0, 0)
        
        cx = int(M["m10"] / M["m00"])
        cy = int(M["m01"] / M["m00"])
        
        movement = 0
        if len(self.fire_history) >= 3:
            for i in range(min(3, len(self.fire_history))):
                if isinstance(self.fire_history[i], dict) and 'center' in self.fire_history[i]:
                    prev = self.fire_history[i]
                    dx = cx - prev['center'][0]
                    dy = cy - prev['center'][1]
                    movement += np.sqrt(dx*dx + dy*dy)
        
        avg_movement = movement / 3 if movement > 0 else 0
        
        # 너울거림 점수
        if avg_movement > 5:
            flicker_score = 5
        elif avg_movement > 3:
            flicker_score = 4
        elif avg_movement > 2:
            flicker_score = 3
        elif avg_movement > 1:
            flicker_score = 2
        else:
            flicker_score = 1
        
        return flicker_score, (cx, cy)

    def calculate_arm_length(self, shoulder, elbow, wrist, frame_shape):
        """팔길이 계산"""
        if shoulder.visibility > 0.5 and elbow.visibility > 0.5 and wrist.visibility > 0.5:
            h, w = frame_shape[:2]
            shoulder_pt = np.array([shoulder.x * w, shoulder.y * h])
            elbow_pt = np.array([elbow.x * w, elbow.y * h])
            wrist_pt = np.array([wrist.x * w, wrist.y * h])
            
            upper_arm = np.linalg.norm(elbow_pt - shoulder_pt)
            lower_arm = np.linalg.norm(wrist_pt - elbow_pt)
            
            return upper_arm + lower_arm
        return None

    def get_hand_landmarks(self, frame, wrist, elbow, margin=150):
        """손 위치 감지"""
        h, w = frame.shape[:2]
        
        wrist_x, wrist_y = int(wrist.x * w), int(wrist.y * h)
        elbow_x, elbow_y = int(elbow.x * w), int(elbow.y * h)
        
        dx = wrist_x - elbow_x
        dy = wrist_y - elbow_y
        hand_x = wrist_x + int(dx * 0.3)
        hand_y = wrist_y + int(dy * 0.3)
        
        x1 = max(0, hand_x - margin)
        y1 = max(0, hand_y - margin)
        x2 = min(w, hand_x + margin)
        y2 = min(h, hand_y + margin)
        
        if x2 - x1 > 20 and y2 - y1 > 20:
            roi = frame[y1:y2, x1:x2]
            roi_rgb = cv.cvtColor(roi, cv.COLOR_BGR2RGB)
            hand_result = self.hand.process(roi_rgb)
            
            if hand_result.multi_hand_landmarks:
                finger_tips = []
                for hand_landmarks in hand_result.multi_hand_landmarks:
                    for tip_idx in [4, 8, 12, 16, 20]:
                        lm = hand_landmarks.landmark[tip_idx]
                        tip_x = int(lm.x * (x2 - x1) + x1)
                        tip_y = int(lm.y * (y2 - y1) + y1)
                        finger_tips.append((tip_x, tip_y))
                return finger_tips, (hand_x, hand_y)
        
        return [], (wrist_x, wrist_y)

    def merge_detections(self, color_candidates, yolo_detections):
        """COLOR와 YOLO 통합"""
        merged = []
        threshold = 50
        used_yolo = []
        
        # COLOR 처리
        for cx, cy, area, flicker_score in color_candidates:
            matched_yolo = None
            min_dist = threshold
            
            for i, yolo_det in enumerate(yolo_detections):
                if i in used_yolo:
                    continue
                
                yolo_cx, yolo_cy = yolo_det['center']
                dist = np.sqrt((cx - yolo_cx)**2 + (cy - yolo_cy)**2)
                
                if dist < min_dist:
                    min_dist = dist
                    matched_yolo = i
            
            if matched_yolo is not None:
                # HYBRID (둘 다 감지)
                used_yolo.append(matched_yolo)
                yolo_bbox = yolo_detections[matched_yolo]['bbox']
                merged.append({
                    'center': (cx, cy),
                    'area': area,
                    'flicker_score': flicker_score,
                    'yolo_conf': yolo_detections[matched_yolo]['conf'],
                    'yolo_bbox': yolo_bbox,  # YOLO 박스 정보 추가
                    'detection_type': 'HYBRID',
                    'confidence': 3
                })
            else:
                # COLOR only
                merged.append({
                    'center': (cx, cy),
                    'area': area,
                    'flicker_score': flicker_score,
                    'yolo_conf': 0,
                    'detection_type': 'COLOR',
                    'confidence': 1 if flicker_score >= 3 else 0
                })
        
        # YOLO only
        for i, yolo_det in enumerate(yolo_detections):
            if i not in used_yolo:
                x1, y1, x2, y2 = yolo_det['bbox']
                area = (x2 - x1) * (y2 - y1)
                merged.append({
                    'center': yolo_det['center'],
                    'area': area,
                    'flicker_score': 0,
                    'yolo_conf': yolo_det['conf'],
                    'yolo_bbox': yolo_det['bbox'],  # YOLO 박스 정보 추가
                    'detection_type': 'YOLO',
                    'confidence': 2
                })
        
        return merged

    def update_fires(self, merged_detections, hand_positions, arm_lengths, frame_shape):
        """화재 업데이트"""
        current_time = time.time()
        
        for fire in self.confirmed_fires:
            fire['updated_this_frame'] = False
        
        for detection in merged_detections:
            cx, cy = detection['center']
            area = detection['area']
            detection_type = detection['detection_type']
            confidence = detection['confidence']
            
            # YOLO 박스 정보 저장
            yolo_bbox = detection.get('yolo_bbox', None)
            
            # 기존 화재와 매칭
            matched = False
            for fire in self.confirmed_fires:
                dist = np.sqrt((cx - fire['center'][0])**2 + (cy - fire['center'][1])**2)
                
                if dist < 30:
                    fire['center'] = (cx, cy)
                    fire['area'] = area
                    fire['detection_type'] = detection_type
                    fire['confidence'] = max(fire['confidence'], confidence)
                    fire['last_seen'] = current_time
                    fire['updated_this_frame'] = True
                    fire['lost_frames'] = 0
                    if yolo_bbox:
                        fire['yolo_bbox'] = yolo_bbox
                    matched = True
                    break
            
            # 새 화재 생성
            if not matched and confidence >= 1:
                min_distance = float('inf')
                nearest_hand = None
                
                for hand_type, (tips, center) in hand_positions.items():
                    if tips:
                        for tip in tips:
                            dist = np.sqrt((cx - tip[0])**2 + (cy - tip[1])**2)
                            if dist < min_distance:
                                min_distance = dist
                                nearest_hand = hand_type
                    elif center:
                        dist = np.sqrt((cx - center[0])**2 + (cy - center[1])**2)
                        if dist < min_distance:
                            min_distance = dist
                            nearest_hand = hand_type
                
                max_distance = 150
                if nearest_hand and nearest_hand in arm_lengths:
                    max_distance = arm_lengths[nearest_hand] * 0.7
                
                if min_distance < max_distance or detection_type == 'YOLO':
                    new_fire = {
                        'id': self.next_fire_id,
                        'center': (cx, cy),
                        'area': area,
                        'confidence': confidence,
                        'detection_type': detection_type,
                        'start_time': current_time,
                        'last_seen': current_time,
                        'hand': nearest_hand,
                        'distance': min_distance,
                        'updated_this_frame': True,
                        'lost_frames': 0
                    }
                    if yolo_bbox:
                        new_fire['yolo_bbox'] = yolo_bbox
                        
                    self.confirmed_fires.append(new_fire)
                    self.next_fire_id += 1
                    
                    # 높은 신뢰도 시 경고 모드 (비디오는 계속 재생)
                    if confidence >= 2:
                        self.alert_mode = True
                        print(f"[FIRE ALERT] #{new_fire['id']} Type:{detection_type} Pos:({cx},{cy})")
        
        # 업데이트 안 된 화재 처리
        for fire in self.confirmed_fires:
            if not fire['updated_this_frame']:
                fire['lost_frames'] = fire.get('lost_frames', 0) + 1
        
        self.confirmed_fires = [f for f in self.confirmed_fires if f.get('lost_frames', 0) < 60]

    def draw_fire(self, frame, fire):
        """화재 표시"""
        cx, cy = fire['center']
        fire_id = fire['id']
        dtype = fire['detection_type']
        conf = fire['confidence']
        
        # 타입별 색상
        if dtype == 'HYBRID':
            color = (0, 255, 255)  # 노랑
            label = "HYBRID"
        elif dtype == 'YOLO':
            color = (255, 0, 255)  # 보라
            label = "YOLO"
        else:
            color = (0, 150, 255)  # 주황
            label = "COLOR"
        
        # YOLO 박스가 있으면 적당히 확대된 박스로 표시
        if 'yolo_bbox' in fire:
            x1, y1, x2, y2 = fire['yolo_bbox']
            # YOLO 박스 적당히 확대 (1.12배 - 12% 확장)
            width = x2 - x1
            height = y2 - y1
            expand_x = int(width * 0.06)  # 양쪽 6%씩 = 총 12% 확대
            expand_y = int(height * 0.06)
            
            x1 = max(0, x1 - expand_x)
            y1 = max(0, y1 - expand_y)
            x2 = min(frame.shape[1], x2 + expand_x)
            y2 = min(frame.shape[0], y2 + expand_y)
            
            cv.rectangle(frame, (x1, y1), (x2, y2), color, 2)  # 선 두께도 3에서 2로 조정
        else:
            # 일반 박스
            box_size = 30  # 35에서 30으로 조정
            cv.rectangle(frame, (cx-box_size, cy-box_size), 
                        (cx+box_size, cy+box_size), color, 2)
        
        # 중심점
        cv.circle(frame, (cx, cy), 5, color, -1)
        cv.circle(frame, (cx, cy), 7, (255, 255, 255), 1)
        
        # 라벨
        label_text = f"#{fire_id} {label} C:{conf}"
        cv.putText(frame, label_text, (cx-30, cy-40),
                  cv.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        
        # Alert 모드에서 깜빡임 효과
        if self.alert_mode and (self.frame_count % 10 < 5):
            if 'yolo_bbox' in fire:
                cv.rectangle(frame, (x1-3, y1-3), (x2+3, y2+3), (0, 0, 255), 1)
            else:
                cv.rectangle(frame, (cx-35, cy-35), (cx+35, cy+35), (0, 0, 255), 1)

    def process_frame(self, frame):
        self.frame_count += 1
        detection_results = {'is_fire': False, 'fire_count': 0, 'status_message': 'No fire detected'}

        frame_rgb = cv.cvtColor(frame, cv.COLOR_BGR2RGB)
        pose_res = self.pose.process(frame_rgb)
        
        arm_lengths = {}
        hand_positions = {}

        if pose_res.pose_landmarks:
            self.mp_drawing.draw_landmarks(frame, pose_res.pose_landmarks, self.mp_pose.POSE_CONNECTIONS)
            landmarks = pose_res.pose_landmarks.landmark
            
            left_arm = self.calculate_arm_length(
                landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER],
                landmarks[self.mp_pose.PoseLandmark.LEFT_ELBOW],
                landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST],
                frame.shape
            )
            if left_arm:
                arm_lengths['left'] = left_arm
            
            right_arm = self.calculate_arm_length(
                landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER],
                landmarks[self.mp_pose.PoseLandmark.RIGHT_ELBOW],
                landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST],
                frame.shape
            )
            if right_arm:
                arm_lengths['right'] = right_arm
            
            if landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST].visibility > 0.5:
                tips, center = self.get_hand_landmarks(
                    frame,
                    landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST],
                    landmarks[self.mp_pose.PoseLandmark.LEFT_ELBOW]
                )
                hand_positions['left'] = (tips, center)
                for tip in tips:
                    cv.circle(frame, tip, 4, (0, 255, 0), -1)
                cv.circle(frame, center, 8, (0, 255, 0), 2)
            
            if landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST].visibility > 0.5:
                tips, center = self.get_hand_landmarks(
                    frame,
                    landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST],
                    landmarks[self.mp_pose.PoseLandmark.RIGHT_ELBOW]
                )
                hand_positions['right'] = (tips, center)
                for tip in tips:
                    cv.circle(frame, tip, 4, (0, 255, 0), -1)
                cv.circle(frame, center, 8, (0, 255, 0), 2)
        
        color_candidates = []
        fire_mask = self.detect_fire_color(frame)
        contours, _ = cv.findContours(fire_mask, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
        
        for contour in contours:
            area = cv.contourArea(contour)
            if 20 < area < 1000:
                flicker_score, center = self.calculate_flickering(contour, frame)
                self.fire_history.append({'center': center, 'area': area})
                
                if flicker_score >= 2:
                    color_candidates.append((center[0], center[1], area, flicker_score))
        
        yolo_detections = []
        if self.YOLO_AVAILABLE:
            yolo_detections = self.detect_fire_yolo(frame)
        
        merged_detections = self.merge_detections(color_candidates, yolo_detections)
        
        self.update_fires(merged_detections, hand_positions, arm_lengths, frame.shape)
        
        for fire in self.confirmed_fires:
            self.draw_fire(frame, fire)
        
        active_fires = [f for f in self.confirmed_fires if f.get('lost_frames', 0) == 0]
        detection_results['fire_count'] = len(active_fires)
        if len(active_fires) > 0:
            detection_results['is_fire'] = True
            detection_results['status_message'] = f"Fire detected! Active: {len(active_fires)}"
            if self.alert_mode:
                detection_results['status_message'] = "ALERT! Fire detected!"

        # 상태 표시
        status = "ALERT!" if self.alert_mode else f"Frame: {self.frame_count}"
        active = len(active_fires)
        
        types = {'COLOR': 0, 'YOLO': 0, 'HYBRID': 0}
        for f in active_fires:
            types[f['detection_type']] = types.get(f['detection_type'], 0) + 1
        
        if self.alert_mode:
            cv.rectangle(frame, (5, 5), (frame.shape[1]-5, 40), (0, 0, 255), 2)
            status_color = (0, 0, 255) if (self.frame_count % 10 < 5) else (255, 255, 255)
        else:
            status_color = (255, 255, 255)
        
        status_text = f"{status} | Active: {active} (C:{types['COLOR']} Y:{types['YOLO']} H:{types['HYBRID']})"
        cv.putText(frame, status_text, (10, 25),
                  cv.FONT_HERSHEY_SIMPLEX, 0.6, status_color, 2)

        return frame, detection_results

# if __name__ == "__main__":
#     # Example usage (for testing the class)
#     detector = FireDetector(yolo_model_path='fire_detection.pt') # or None if no YOLO
#     video_path = 'C_3_9_2_BU_SMB_09-02_10-43-45_CA_RGB_DF2_M2.mp4'
#     cap = cv.VideoCapture(video_path)

#     if not cap.isOpened():
#         print(f"ERROR: Cannot open video")
#         exit()

#     while True:
#         ret, frame = cap.read()
#         if not ret:
#             print("\n[END] Video finished")
#             break
        
#         processed_frame, results = detector.process_frame(frame)
#         print(f"Frame {detector.frame_count}: {results}")

#         cv.imshow('Fire Detection', processed_frame)
        
#         key = cv.waitKey(5) & 0xFF
#         if key == ord('q'):
#             break
#         elif key == ord('c'):  # Clear alert
#             detector.alert_mode = False
#         elif key == ord('r'):
#             cap.set(cv.CAP_PROP_POS_FRAMES, 0)
#             detector.confirmed_fires.clear()
#             detector.fire_history.clear()
#             detector.next_fire_id = 1
#             detector.frame_count = 0
#             detector.alert_mode = False

#     cap.release()
#     cv.destroyAllWindows()
