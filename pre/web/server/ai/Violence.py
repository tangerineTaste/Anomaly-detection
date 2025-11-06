import cv2 as cv
import numpy as np
from ultralytics import YOLO
from PIL import ImageFont, ImageDraw, Image

class ViolenceDetector:
    def __init__(self, yolo_model_path, resize_width=720, min_person_conf=0.5, box_margin=20, flow_threshold=3.0, danger_pixels_min=100, consec_frames=3):
        self.model = YOLO(yolo_model_path)
        self.resize_width = resize_width
        self.new_h = None
        self.min_person_conf = min_person_conf
        self.box_margin = box_margin
        self.flow_threshold = flow_threshold
        self.danger_pixels_min = danger_pixels_min
        self.consec_frames = consec_frames

        self.prev_gray = None
        self.danger_accum = 0
        self.violence_frames = 0
        self.total_frames = 0

        try:
            self.font_pil = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 26)
        except IOError:
            self.font_pil = ImageFont.load_default()
            print("Arial font not found. Using default.")

    def _initialize_dimensions(self, frame):
        h0, w0 = frame.shape[:2]
        self.new_w = self.resize_width
        self.new_h = int(self.new_w * h0 / w0)

    def process_frame(self, frame):
        if self.new_h is None:
            self._initialize_dimensions(frame)

        frame_resized = cv.resize(frame, (self.new_w, self.new_h))
        gray = cv.cvtColor(frame_resized, cv.COLOR_BGR2GRAY)

        if self.prev_gray is None:
            self.prev_gray = gray.copy()
            return frame_resized, {'is_violence': False, 'status_message': 'Initializing...'}

        self.total_frames += 1

        results = self.model(frame_resized)
        person_mask = np.zeros((self.new_h, self.new_w), dtype=np.uint8)

        for det in results[0].boxes:
            cls = int(det.cls[0])
            conf = float(det.conf[0])
            if cls == 0 and conf >= self.min_person_conf:
                x1, y1, x2, y2 = map(int, det.xyxy[0].cpu().numpy())
                x1 = max(0, x1 - self.box_margin)
                y1 = max(0, y1 - self.box_margin)
                x2 = min(self.new_w, x2 + self.box_margin)
                y2 = min(self.new_h, y2 + self.box_margin)
                person_mask[y1:y2, x1:x2] = 255

        flow = cv.calcOpticalFlowFarneback(self.prev_gray, gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)
        mag, _ = cv.cartToPolar(flow[..., 0], flow[..., 1])
        mag_masked = mag * (person_mask / 255.0)
        danger_area = mag_masked > self.flow_threshold
        danger_pixels = np.sum(danger_area)

        if danger_pixels > self.danger_pixels_min:
            self.danger_accum += 1
        else:
            self.danger_accum = max(0, self.danger_accum - 1)

        is_violence = self.danger_accum >= self.consec_frames
        
        overlay = frame_resized.copy()
        if is_violence:
            overlay[danger_area] = [0, 0, 255]
            cv.addWeighted(overlay, 0.5, frame_resized, 0.5, 0, frame_resized)
            self.violence_frames += 1

        img_pil = Image.fromarray(frame_resized)
        draw = ImageDraw.Draw(img_pil)

        danger_ratio = (self.violence_frames / self.total_frames * 100) if self.total_frames > 0 else 0.0

        texts = [
            f"Violence:{danger_ratio:5.1f}%",
            f"Flow:{danger_pixels:6d}",
            f"Active:{self.danger_accum:3d}"
        ]
        colors = [(255, 255, 0), (0, 255, 255), (255, 100, 100)]

        segment_widths = []
        total_width = 0
        for t in texts:
            try:
                bbox = draw.textbbox((0, 0), t, font=self.font_pil)
                w = bbox[2] - bbox[0]
            except AttributeError:
                w, _ = draw.textsize(t, font=self.font_pil)
            segment_widths.append(w)
            total_width += w + 30
        total_width -= 20

        padding = 15
        box_height = 45
        box_width = total_width + 2 * padding
        box_x = (self.new_w - box_width) // 2
        box_y = 8

        draw.rectangle([box_x, box_y, box_x + box_width, box_y + box_height],
                       fill=(0, 0, 0, 180), outline=(80, 80, 80), width=1)

        x_offset = box_x + padding
        y_offset = box_y + 8
        for i, t in enumerate(texts):
            draw.text((x_offset, y_offset), t, font=self.font_pil, fill=colors[i])
            x_offset += segment_widths[i] + 30

        frame_resized = np.array(img_pil)
        
        self.prev_gray = gray.copy()

        detection_results = {
            'is_violence': is_violence,
            'status_message': f"Violence:{danger_ratio:5.1f}% | Flow:{danger_pixels:6d} | Active:{self.danger_accum:3d}"
        }

        return frame_resized, detection_results
