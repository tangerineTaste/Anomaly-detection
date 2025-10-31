from ultralytics import YOLO
import cv2
import numpy as np
import time

# 비디오 스트림에서 방치된 물건을 탐지하는 클래스입니다.
class AbandonedItemDetector:
    def __init__(self, yolo_model, fps=10, bg_learning_duration_sec=3):
        """
        AbandonedItemDetector를 초기화합니다.

        Args:
            yolo_model: 미리 로드된 YOLO 모델 객체입니다.
            fps (int): 비디오 스트림의 초당 프레임 수입니다.
            bg_learning_duration_sec (int): 배경 학습을 위한 시간(초)입니다.
        """
        self.model = yolo_model # 미리 로드된 YOLO 모델을 사용합니다.
        self.fps = fps # 초당 프레임 수를 설정합니다.
        self.bg_frames = int(self.fps * bg_learning_duration_sec) # 배경 학습에 사용할 프레임 수를 계산합니다.
        self.frame_count = 0 # 현재까지 처리된 프레임 수를 계산합니다.

        self.persons_present = True # 사람 존재 여부를 나타내는 플래그입니다.
        self.last_seen_person_frame = 0 # 마지막으로 사람이 감지된 프레임 번호입니다.
        self.background_frame = None # 배경 모델을 저장할 변수입니다.
        self.abandoned_items = [] # 확정된 방치 물체의 경계 상자를 저장합니다.
        self.abandoned_candidates = {} # 잠재적인 방치 물체와 그 지속 시간을 저장합니다.

    def process_frame(self, frame):
        """
        방치된 물건을 탐지하기 위해 단일 비디오 프레임을 처리합니다.

        Args:
            frame (numpy.ndarray): 현재 비디오 프레임 (BGR 형식).

        Returns:
            tuple: (processed_frame, detection_results)
                processed_frame (numpy.ndarray): 탐지 결과가 그려진 프레임.
                detection_results (dict): 다음을 포함하는 딕셔너리:
                    - 'abandoned_items': 확정된 방치 물체의 경계 상자 목록.
                    - 'persons_present': 현재 사람이 있는지 여부를 나타내는 불리언 값.
                    - 'status_message': 현재 상태를 나타내는 메시지 (예: "Background Learning").
        """
        self.frame_count += 1
        current_frame_display = frame.copy() # 시각화를 위해 프레임을 복사합니다.
        detection_results = {
            'abandoned_items': [],
            'persons_present': self.persons_present,
            'status_message': ''
        }

        # --- YOLO 객체 탐지 ---
        results = self.model(current_frame_display, conf=0.1, verbose=False) # YOLO 모델로 객체를 탐지합니다.
        detections = results[0].boxes.data.cpu().numpy()

        persons = [] # 사람 객체를 저장할 리스트입니다.
        items = [] # 사람 이외의 객체를 저장할 리스트입니다.
        for det in detections:
            x1, y1, x2, y2, score, cls = det
            cls = int(cls)
            if cls == 0:  # COCO 데이터셋에서 클래스 0은 일반적으로 '사람'입니다.
                persons.append((x1, y1, x2, y2))
            else:
                items.append((x1, y1, x2, y2, cls))

        # --- 배경 학습 ---
        if self.frame_count <= self.bg_frames:
            # 초기 몇 초 동안 배경을 학습합니다.
            if self.background_frame is None:
                self.background_frame = frame.copy().astype("float")
            else:
                cv2.accumulateWeighted(frame, self.background_frame, 0.05) # 가중 평균을 사용하여 배경을 업데이트합니다.
            cv2.putText(current_frame_display, "Background Learning...", (30, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 200, 255), 2)
            detection_results['status_message'] = "Background Learning..."

        else:
            # --- 사람 존재 상태 업데이트 ---
            if len(persons) > 0:
                self.persons_present = True
                self.last_seen_person_frame = self.frame_count
            else:
                # 사람이 없는 경우, 1초 이상 사라졌는지 확인합니다.
                if self.persons_present and (self.frame_count - self.last_seen_person_frame) > self.fps:
                    self.persons_present = False
                    # 사람이 방금 떠났다면, 오탐지를 피하기 위해 방치 후보를 초기화합니다.
                    self.abandoned_candidates = {}
                
            detection_results['persons_present'] = self.persons_present

            # --- 방치된 물건 탐지 ---
            if not self.persons_present:
                # 현재 프레임과 배경의 차이를 계산합니다.
                diff = cv2.absdiff(frame, cv2.convertScaleAbs(self.background_frame))
                gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
                blur = cv2.GaussianBlur(gray, (5, 5), 0)
                _, thresh = cv2.threshold(blur, 40, 255, cv2.THRESH_BINARY)
                contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

                current_frame_abandoned_items = []
                for cnt in contours:
                    if cv2.contourArea(cnt) < 2000:  # 작은 변화는 무시합니다.
                        continue
                    x, y, w, h = cv2.boundingRect(cnt)
                    candidate_bbox = (x, y, x + w, y + h)
                    key = f"{x}_{y}_{w}_{h}" # 추적을 위한 간단한 키

                    # 이 후보가 탐지된 '물건'과 겹치는지 확인합니다.
                    is_item_detected = False
                    for item_x1, item_y1, item_x2, item_y2, _ in items:
                        if self._bbox_overlap(candidate_bbox, (item_x1, item_y1, item_x2, item_y2)):
                            is_item_detected = True
                            break
                    
                    if is_item_detected:
                        # 이 후보의 지속 시간을 증가시킵니다.
                        self.abandoned_candidates[key] = self.abandoned_candidates.get(key, 0) + 1
                        
                        # 후보가 1초 이상 지속되면 방치된 것으로 확정합니다.
                        if self.abandoned_candidates[key] > self.fps:
                            if candidate_bbox not in self.abandoned_items: # 중복을 피합니다.
                                self.abandoned_items.append(candidate_bbox)
                            current_frame_abandoned_items.append(candidate_bbox)
                
                # 현재 프레임의 윤곽선에 더 이상 존재하지 않는 후보를 제거합니다.
                keys_to_remove = [k for k in self.abandoned_candidates if k not in [f"{x}_{y}_{w}_{h}" for x,y,w,h in [cv2.boundingRect(c) for c in contours if cv2.contourArea(c) >= 2000]]]
                for k in keys_to_remove:
                    self.abandoned_candidates.pop(k, None)

                detection_results['abandoned_items'] = self.abandoned_items # 모든 확정된 방치 물건을 반환합니다.

        # --- 시각화 ---
        # 사람을 초록색 사각형으로 표시합니다.
        for (x1, y1, x2, y2) in persons:
            cv2.rectangle(current_frame_display, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
            cv2.putText(current_frame_display, "Person", (int(x1), int(y1) - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

        # 물건을 하늘색 사각형으로 표시합니다.
        for (x1, y1, x2, y2, cls) in items:
            cv2.rectangle(current_frame_display, (int(x1), int(y1)), (int(x2), int(y2)), (255, 255, 0), 1)
            # 선택적으로 물건 클래스 이름을 추가할 수 있습니다.
            # cv2.putText(current_frame_display, self.model.names[cls], (int(x1), int(y1) - 5),
            #             cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)

        # 방치된 물건을 빨간색 사각형으로 표시합니다.
        for (x1, y1, x2, y2) in self.abandoned_items:
            cv2.rectangle(current_frame_display, (int(x1), int(y1)), (int(x2), int(y2)), (0, 0, 255), 3)
            cv2.putText(current_frame_display, "Abandoned", (int(x1), int(y1) - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            detection_results['status_message'] = "Abandoned Item Detected!"


        return current_frame_display, detection_results

    def _bbox_overlap(self, bbox1, bbox2):
        """
        두 경계 상자가 겹치는지 계산합니다.
        bbox 형식: (x1, y1, x2, y2)
        """
        x1_1, y1_1, x2_1, y2_1 = bbox1
        x1_2, y1_2, x2_2, y2_2 = bbox2

        # 사각형이 겹치는지 확인합니다.
        if x1_1 < x2_2 and x2_1 > x1_2 and y1_1 < y2_2 and y2_1 > y1_2:
            return True
        return False