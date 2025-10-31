import cv2 as cv
import numpy as np
from ultralytics import YOLO
from PIL import ImageFont, ImageDraw, Image

# 폭행 감지 시스템을 위한 클래스
class DamageDetector:
    """
    비디오 프레임에서 폭행과 같은 이상 행동을 감지하는 클래스입니다.
    YOLO를 사용하여 사람을 감지하고, 광학 흐름(Optical Flow)의 방향 분산을 분석하여
    움직임의 혼란도를 측정하고 위험 상황을 판단합니다.
    """
    def __init__(self, yolo_model_path=r"./yolov12n.pt", resize_width=720, min_person_conf=0.5, box_margin=20, 
                 angle_std_threshold=45.0, mag_threshold_for_angle=1.5, consec_frames=4):
        """
        DamageDetector를 초기화합니다.

        Args:
            yolo_model_path (str): YOLO 모델 파일의 경로.
            resize_width (int): 프레임 처리 시 리사이즈할 너비.
            min_person_conf (float): 사람 감지에 대한 최소 신뢰도.
            box_margin (int): 사람 바운딩 박스 주변에 추가할 여백.
            angle_std_threshold (float): 움직임 방향의 표준편차가 '위험'으로 간주될 임계값 (단위: 도).
            mag_threshold_for_angle (float): 각도 계산에 포함될 최소 움직임 크기.
            consec_frames (int): 경고를 트리거하기 위한 연속 위험 프레임 수.
        """
        self.model = YOLO(yolo_model_path)
        self.resize_width = resize_width
        self.min_person_conf = min_person_conf
        self.box_margin = box_margin
        self.angle_std_threshold = angle_std_threshold
        self.mag_threshold_for_angle = mag_threshold_for_angle
        self.consec_frames = consec_frames

        # 상태 변수 초기화
        self.prev_gray = None
        self.h = 0
        self.w = 0
        self.danger_accum = 0

        # 폰트 로드 (PIL 사용)
        try:
            self.font_pil = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 26)
        except IOError:
            self.font_pil = ImageFont.load_default()
            print("Arial 폰트를 찾을 수 없어 기본 폰트 사용.")

    def _initialize_first_frame(self, frame):
        """
        탐지기를 첫 번째 프레임으로 초기화합니다.
        """
        h0, w0 = frame.shape[:2]
        self.w = self.resize_width
        self.h = int(self.w * h0 / w0)
        frame_resized = cv.resize(frame, (self.w, self.h))
        self.prev_gray = cv.cvtColor(frame_resized, cv.COLOR_BGR2GRAY)
        return frame_resized

    def process_frame(self, frame):
        """
        단일 비디오 프레임을 처리하여 폭행을 감지합니다.
        """
        if self.prev_gray is None:
            processed_frame = self._initialize_first_frame(frame)
            return processed_frame, {"is_danger": False, "angle_std": 0, "danger_accum": 0, "status_message": "초기화 중..."}

        frame_resized = cv.resize(frame, (self.w, self.h))
        gray = cv.cvtColor(frame_resized, cv.COLOR_BGR2GRAY)

        # YOLO를 이용한 사람 감지
        results = self.model(frame_resized, verbose=False)
        person_mask = np.zeros((self.h, self.w), dtype=np.uint8)
        person_boxes = []
        for det in results[0].boxes:
            cls = int(det.cls[0])
            conf = float(det.conf[0])
            if cls == 0 and conf >= self.min_person_conf:
                x1, y1, x2, y2 = map(int, det.xyxy[0].cpu().numpy())
                person_boxes.append((x1, y1, x2, y2))
                x1_margin = max(0, x1 - self.box_margin)
                y1_margin = max(0, y1 - self.box_margin)
                x2_margin = min(self.w, x2 + self.box_margin)
                y2_margin = min(self.h, y2 + self.box_margin)
                person_mask[y1_margin:y2_margin, x1_margin:x2_margin] = 255

        # 광학 흐름 계산
        flow = cv.calcOpticalFlowFarneback(self.prev_gray, gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)
        mag, ang = cv.cartToPolar(flow[..., 0], flow[..., 1], angleInDegrees=True)

        # 사람 영역 내에서 유의미한 움직임이 있는 픽셀만 필터링
        meaningful_motion_mask = (person_mask > 0) & (mag > self.mag_threshold_for_angle)
        
        angle_std = 0.0
        if np.any(meaningful_motion_mask):
            angles = ang[meaningful_motion_mask]
            # 원형 표준편차 계산 (Circular Standard Deviation)
            angles_rad = np.deg2rad(angles)
            mean_cos = np.mean(np.cos(angles_rad))
            mean_sin = np.mean(np.sin(angles_rad))
            r = np.sqrt(mean_cos**2 + mean_sin**2)
            if r < 1.0:
                angle_std = np.rad2deg(np.sqrt(-2 * np.log(r)))

        # 위험 누적 카운터 업데이트 (방향 표준편차 기반)
        if angle_std > self.angle_std_threshold:
            self.danger_accum += 1
        else:
            self.danger_accum = max(0, self.danger_accum - 1)

        # 시각화
        processed_frame = frame_resized.copy()
        is_danger = self.danger_accum >= self.consec_frames
        if is_danger:
            # 위험 상황일 때 사람 바운딩 박스를 빨간색으로 표시
            for (x1, y1, x2, y2) in person_boxes:
                cv.rectangle(processed_frame, (x1, y1), (x2, y2), (0, 0, 255), 3)

        # 프레임에 통계 정보 그리기
        img_pil = Image.fromarray(processed_frame)
        draw = ImageDraw.Draw(img_pil)
        
        status_text = "위험 감지!" if is_danger else "정상"
        status_color = (0, 0, 255) if is_danger else (0, 255, 0)
        texts = [
            f"상태: {status_text}",
            f"방향STD: {angle_std:.1f}°",
            f"위험 누적: {self.danger_accum}"
        ]
        colors = [status_color, (255, 255, 0), (255, 100, 100)]

        # ... (기존 그리기 로직과 유사하게 텍스트를 그립니다) ...
        y_offset = 10
        for i, t in enumerate(texts):
            bbox = draw.textbbox((0, 0), t, font=self.font_pil)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            draw.rectangle([5, y_offset, 15 + text_width, y_offset + text_height + 10], fill=(0,0,0,128))
            draw.text((10, y_offset + 5), t, font=self.font_pil, fill=colors[i])
            y_offset += text_height + 15

        processed_frame = np.array(img_pil)

        # 이전 프레임 업데이트
        self.prev_gray = gray.copy()

        # 탐지 결과 딕셔너리 생성
        detection_results = {
            "is_danger": bool(is_danger),
            "angle_std": float(angle_std),
            "danger_accum": int(self.danger_accum),
            "status_message": status_text
        }

        return processed_frame, detection_results
