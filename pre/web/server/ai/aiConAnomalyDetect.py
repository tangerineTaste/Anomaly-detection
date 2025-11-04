"""
이상행동 실시간 탐지 시스템
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import cv2
import numpy as np
from pathlib import Path
from collections import deque
import time
import random
from PIL import Image, ImageDraw, ImageFont
import shutil

# ============================================
# 샘플 폴더 관리
# ============================================
def setup_sample_folder(base_dir, sample_dir='sample'):
    """sample 폴더 설정"""
    sample_path = Path(sample_dir)
    base_path = Path(base_dir)
    
    if sample_path.exists():
        video_files = list(sample_path.glob('*.mp4'))
        
        if video_files:
            print(f"\n기존 sample 폴더: {len(video_files)}개 비디오")
            selected_videos = []
            for video_path in sorted(video_files):
                class_name = "Unknown"
                for kw in ['전도', '파손', '방화', '흡연', '유기', '절도', '폭행', '교통약자']:
                    if kw in video_path.stem:
                        class_name = kw
                        break
                selected_videos.append({'path': str(video_path), 'class': class_name, 'folder': 'sample'})
            return selected_videos, False
        else:
            try:
                sample_path.rmdir()
            except:
                pass
    
    print("\nsample 폴더 생성 및 랜덤 샘플 복사")
    sample_path.mkdir(exist_ok=True)
    
    class_folders = [
        'VS_03.이상행동_07.전도', 'VS_03.이상행동_08.파손',
        'VS_03.이상행동_09.방화', 'VS_03.이상행동_10.흡연',
        'VS_03.이상행동_11.유기', 'VS_03.이상행동_12.절도',
        'VS_03.이상행동_13.폭행', 'VS_03.이상행동_14.교통약자'
    ]
    
    selected_videos = []
    for folder_name in class_folders:
        folder_path = base_path / folder_name
        if not folder_path.exists():
            continue
        
        video_files = list(folder_path.glob('*.mp4'))
        if not video_files:
            continue
        
        selected_video = random.choice(video_files)
        class_name = folder_name.split('_')[-1]
        new_filename = f"{len(selected_videos)+1:02d}_{class_name}_{selected_video.name}"
        dest_path = sample_path / new_filename
        
        try:
            shutil.copy2(selected_video, dest_path)
            selected_videos.append({'path': str(dest_path), 'class': class_name, 'folder': folder_name})
            print(f"[OK] {class_name}: {selected_video.name}")
        except Exception as e:
            print(f"[ERROR] 복사 실패: {e}")
    
    return selected_videos, True

# ============================================
# 모델 정의
# ============================================
class Optimized3DCNN(nn.Module):
    def __init__(self, num_classes=8):
        super().__init__()
        
        self.features = nn.Sequential(
            nn.Conv3d(3, 32, kernel_size=(1,7,7), stride=(1,2,2), padding=(0,3,3)),
            nn.BatchNorm3d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool3d(kernel_size=(1,3,3), stride=(1,2,2), padding=(0,1,1)),
            
            nn.Conv3d(32, 64, kernel_size=(3,3,3), stride=(1,2,2), padding=(1,1,1)),
            nn.BatchNorm3d(64),
            nn.ReLU(inplace=True),
            
            nn.Conv3d(64, 128, kernel_size=(3,3,3), stride=(2,2,2), padding=(1,1,1)),
            nn.BatchNorm3d(128),
            nn.ReLU(inplace=True),
            
            nn.Conv3d(128, 256, kernel_size=(3,3,3), stride=(2,2,2), padding=(1,1,1)),
            nn.BatchNorm3d(256),
            nn.ReLU(inplace=True),
        )
        
        self.avgpool = nn.AdaptiveAvgPool3d((1, 1, 1))
        self.classifier = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(256, 512),
            nn.ReLU(),
            nn.BatchNorm1d(512),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes)
        )
    
    def forward(self, x):
        x = self.features(x)
        x = self.avgpool(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x

# ============================================
# 비디오 추론 클래스
# ============================================
class AbnormalBehaviorDetector:
    def __init__(self, model_path, device='cuda', confidence_threshold=0.6):
        self.device = device
        self.confidence_threshold = confidence_threshold
        
        checkpoint = torch.load(model_path, map_location=device, weights_only=False)
        
        if 'label_map' in checkpoint:
            self.label_map = checkpoint['label_map']
        else:
            self.label_map = {
                '전도': 0, '파손': 1, '방화': 2, '흡연': 3,
                '유기': 4, '절도': 5, '폭행': 6, '교통약자': 7
            }
        
        self.id_to_label = {v: k for k, v in self.label_map.items()}
        self.num_classes = len(self.label_map)
        
        self.model = Optimized3DCNN(num_classes=self.num_classes).to(device)
        self.model.load_state_dict(checkpoint['model'])
        self.model.eval()
        
        print(f"[OK] 모델 로드 완료! 클래스: {self.num_classes}")
        if 'best_val_acc' in checkpoint:
            print(f"  검증 정확도: {checkpoint['best_val_acc']:.1f}%")
        
        self.mean = torch.tensor([0.45, 0.45, 0.45]).view(1, 3, 1, 1, 1).to(device)
        self.std = torch.tensor([0.225, 0.225, 0.225]).view(1, 3, 1, 1, 1).to(device)
        self.target_size = 224
        
        # 한글 폰트 - 1.5배 크기
        try:
            self.font_large = ImageFont.truetype("malgun.ttf", 60)
            self.font_medium = ImageFont.truetype("malgun.ttf", 45)
            self.font_small = ImageFont.truetype("malgun.ttf", 30)
            print("[OK] 한글 폰트 로드")
        except:
            try:
                self.font_large = ImageFont.truetype("./ai/font/malgun.ttf", 60)
                self.font_medium = ImageFont.truetype("./ai/font/malgun.ttf", 45)
                self.font_small = ImageFont.truetype("./ai/font/malgun.ttf", 30)
                print("[OK] 한글 폰트 로드")
            except:
                print("[WARNING] 한글 폰트 없음")
                self.font_large = ImageFont.load_default()
                self.font_medium = ImageFont.load_default()
                self.font_small = ImageFont.load_default()
        
        self.class_colors_rgb = {
            0: (255, 100, 100), 1: (255, 255, 100), 2: (255, 100, 0), 3: (255, 100, 255),
            4: (100, 200, 255), 5: (255, 200, 100), 6: (255, 0, 0), 7: (100, 255, 255),
        }
        
        self.class_colors = {
            0: (100, 100, 255), 1: (100, 255, 255), 2: (0, 100, 255), 3: (255, 100, 255),
            4: (255, 200, 100), 5: (100, 200, 255), 6: (0, 0, 255), 7: (255, 255, 100),
        }
        
        self.stats = {
            'total_frames': 0,
            'inference_times': [],
            'detections': {label: 0 for label in self.label_map.keys()}
        }
    
    def preprocess_frames(self, frames):
        processed = []
        for frame in frames:
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frame = cv2.resize(frame, (self.target_size, self.target_size))
            processed.append(frame)
        
        frames_array = np.array(processed, dtype=np.float32) / 255.0
        frames_tensor = torch.from_numpy(frames_array).permute(0, 3, 1, 2)
        frames_tensor = frames_tensor.unsqueeze(0).permute(0, 2, 1, 3, 4)
        frames_tensor = frames_tensor.to(self.device)
        frames_tensor = (frames_tensor - self.mean) / self.std
        return frames_tensor
    
    @torch.no_grad()
    def predict(self, frames):
        start_time = time.time()
        
        input_tensor = self.preprocess_frames(frames)
        outputs = self.model(input_tensor)
        probabilities = F.softmax(outputs, dim=1)[0]
        
        confidence, predicted_class = probabilities.max(0)
        confidence = confidence.item()
        predicted_class = predicted_class.item()
        
        inference_time = time.time() - start_time
        self.stats['inference_times'].append(inference_time)
        
        class_name_kr = self.id_to_label[predicted_class]
        
        return {
            'class_id': predicted_class,
            'class_name_kr': class_name_kr,
            'confidence': confidence,
            'probabilities': probabilities.cpu().numpy(),
            'inference_time': inference_time
        }
    
    def draw_results(self, frame, result, frame_buffer_size, fps=None):
        """결과 그리기 - 우하단 배치"""
        h, w = frame.shape[:2]
        
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(frame_rgb)
        draw = ImageDraw.Draw(pil_image)
        
        class_name_kr = result['class_name_kr']
        confidence = result['confidence']
        class_id = result['class_id']
        color_rgb = self.class_colors_rgb.get(class_id, (255, 255, 255))
        
        # 우하단 반투명 배경 (1.5배)
        bg_width = 450  # 300 * 1.5
        bg_height = 300  # 200 * 1.5
        margin = 20
        bg_x = w - bg_width - margin
        bg_y = h - bg_height - margin
        
        overlay = Image.new('RGBA', pil_image.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.rectangle([(bg_x, bg_y), (bg_x + bg_width, bg_y + bg_height)], fill=(0, 0, 0, 180))
        pil_image = Image.alpha_composite(pil_image.convert('RGBA'), overlay).convert('RGB')
        draw = ImageDraw.Draw(pil_image)
        
        is_abnormal = confidence > self.confidence_threshold
        
        if is_abnormal:
            status_text = f"경고: {class_name_kr} 감지"
            status_color = (255, 0, 0)
        else:
            status_text = "상태: 불확실"
            status_color = (255, 255, 0)
        
        # 텍스트 위치 (우하단 기준)
        text_x = bg_x + 30
        text_y = bg_y + 15
        
        draw.text((text_x, text_y), status_text, font=self.font_large, fill=status_color)
        draw.text((text_x, text_y + 90), f"클래스: {class_name_kr}", font=self.font_medium, fill=color_rgb)
        draw.text((text_x, text_y + 143), f"신뢰도: {confidence*100:.1f}%", font=self.font_small, fill=(255, 255, 255))
        
        frame = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # 신뢰도 바 (우하단 하단)
        bar_width, bar_height = 450, 30  # 1.5배
        bar_x = bg_x
        bar_y = bg_y + 195
        
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + bar_width, bar_y + bar_height), (50, 50, 50), -1)
        fill_width = int(bar_width * confidence)
        color_bgr = self.class_colors.get(class_id, (255, 255, 255))
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + fill_width, bar_y + bar_height), color_bgr, -1)
        
        # 상위 3개 (우하단 최하단)
        probs = result['probabilities']
        top3_indices = np.argsort(probs)[-3:][::-1]
        
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(frame_rgb)
        draw = ImageDraw.Draw(pil_image)
        
        y_offset = bg_y + 248
        for i, idx in enumerate(top3_indices):
            label_kr = self.id_to_label[idx]
            prob = probs[idx]
            text = f"{i+1}. {label_kr}: {prob*100:.1f}%"
            draw.text((text_x, y_offset + i*38), text, font=self.font_small, fill=(200, 200, 200))
        
        # FPS & Buffer (우상단)
        if fps:
            draw.text((w - 225, 15), f"FPS: {fps:.1f}", font=self.font_small, fill=(0, 255, 255))
        draw.text((w - 270, 60), f"Buffer: {frame_buffer_size}/16", font=self.font_small, fill=(255, 255, 255))
        
        frame = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        return frame
    
    def process_video(self, video_path, output_path=None, stride=8, display=True, real_time_speed=True):
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"비디오 열기 실패: {video_path}")
        
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        frame_delay = int(1000 / fps) if fps > 0 else 33
        
        print(f"\n비디오: {Path(video_path).name}")
        print(f"해상도: {width}x{height}, FPS: {fps}, 프레임: {total_frames}")
        
        writer = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        frame_buffer = deque(maxlen=16)
        frame_count = 0
        last_result = None
        fps_start_time = time.time()
        fps_frame_count = 0
        current_fps = 0
        paused = False
        
        print("처리 중... (Q=종료, SPACE=일시정지)")
        
        while True:
            if not paused:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                self.stats['total_frames'] += 1
                frame_buffer.append(frame.copy())
                
                if len(frame_buffer) == 16 and frame_count % stride == 0:
                    result = self.predict(list(frame_buffer))
                    last_result = result
                    self.stats['detections'][result['class_name_kr']] += 1
                    
                    print(f"Frame {frame_count:5d}/{total_frames} | "
                          f"{result['class_name_kr']:10s} | "
                          f"{result['confidence']*100:5.1f}% | "
                          f"{result['inference_time']*1000:.1f}ms")
                
                if last_result:
                    fps_frame_count += 1
                    if fps_frame_count >= 30:
                        current_fps = fps_frame_count / (time.time() - fps_start_time)
                        fps_start_time = time.time()
                        fps_frame_count = 0
                    
                    display_frame = self.draw_results(frame, last_result, len(frame_buffer), current_fps)
                else:
                    display_frame = frame
                
                if writer:
                    writer.write(display_frame)
            else:
                display_frame = frame if 'frame' in locals() else np.zeros((height, width, 3), dtype=np.uint8)
            
            if display:
                if paused:
                    frame_rgb = cv2.cvtColor(display_frame, cv2.COLOR_BGR2RGB)
                    pil_img = Image.fromarray(frame_rgb)
                    overlay = Image.new('RGBA', pil_img.size, (0, 0, 0, 0))
                    overlay_draw = ImageDraw.Draw(overlay)
                    overlay_draw.rectangle([(width//2-225, height//2-75), (width//2+225, height//2+75)], fill=(0, 0, 0, 180))
                    pil_img = Image.alpha_composite(pil_img.convert('RGBA'), overlay).convert('RGB')
                    draw = ImageDraw.Draw(pil_img)
                    draw.text((width//2-120, height//2-30), "일시정지", font=self.font_large, fill=(0, 255, 255))
                    display_frame = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
                
                cv2.imshow('편의점 이상행동 탐지', display_frame)
                
                wait_time = max(1, frame_delay) if real_time_speed and not paused else (30 if paused else 1)
                key = cv2.waitKey(wait_time) & 0xFF
                
                if key == ord('q'):
                    print("\n사용자 중단")
                    break
                elif key == ord(' '):
                    paused = not paused
        
        cap.release()
        if writer:
            writer.release()
        if display:
            cv2.destroyAllWindows()
        
        self.print_statistics()
    
    def print_statistics(self):
        print(f"\n총 프레임: {self.stats['total_frames']}")
        if self.stats['inference_times']:
            avg_time = np.mean(self.stats['inference_times']) * 1000
            print(f"평균 추론: {avg_time:.1f}ms, FPS: {1000/avg_time:.1f}")
        
        print("\n클래스별 탐지:")
        for label, count in sorted(self.stats['detections'].items(), key=lambda x: x[1], reverse=True):
            if count > 0:
                print(f"  {label}: {count}회")
    
    def reset_statistics(self):
        self.stats['total_frames'] = 0
        self.stats['inference_times'] = []
        for key in self.stats['detections'].keys():
            self.stats['detections'][key] = 0

# ============================================
# 메인
# ============================================
def main():
    MODEL_PATH = 'efficient_50_best.pth'
    BASE_VIDEO_DIR = r'C:\편의점이상행동\Validation\비디오'
    SAMPLE_DIR = 'sample'
    OUTPUT_DIR = 'outputs'
    
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"디바이스: {device}")
    
    selected_videos, is_new = setup_sample_folder(BASE_VIDEO_DIR, SAMPLE_DIR)
    if not selected_videos:
        print("[ERROR] 비디오 없음!")
        return
    
    Path(OUTPUT_DIR).mkdir(exist_ok=True)
    
    detector = AbnormalBehaviorDetector(MODEL_PATH, device, confidence_threshold=0.6)
    
    # GPU 워밍업
    if device == 'cuda':
        print("\nGPU 워밍업...", end='', flush=True)
        dummy = torch.randn(1, 3, 8, 112, 112).to(device)
        with torch.no_grad():
            _ = detector.model(dummy)
        print(" 완료!")
    
    # 배치 처리
    batch_size = 8
    for batch_idx in range(0, len(selected_videos), batch_size):
        batch = selected_videos[batch_idx:batch_idx+batch_size]
        
        for idx, video_info in enumerate(batch):
            video_path = video_info['path']
            class_name = video_info['class']
            
            print(f"\n[{batch_idx+idx+1}/{len(selected_videos)}] {class_name}")
            
            output_path = str(Path(OUTPUT_DIR) / f"{batch_idx+idx+1:02d}_{class_name}_result.mp4")
            
            detector.reset_statistics()
            detector.process_video(video_path, output_path, stride=8, display=True, real_time_speed=True)
        
        if batch_idx + batch_size < len(selected_videos):
            user_input = input(f"\n다음 배치 계속? [Y/n]: ")
            if user_input.lower() == 'n':
                break
    
    print("\n시연 완료!")

if __name__ == "__main__":
    main()