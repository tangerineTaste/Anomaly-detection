"""
이상행동 실시간 탐지 시스템
- sample 폴더 기반 실행
- 한글 폰트 지원
- 8개 클래스 자동 샘플링
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
# 샘플 폴더 관리 함수
# ============================================
def setup_sample_folder(base_dir, sample_dir='sample'):
    """sample 폴더 설정: 없으면 생성 + 랜덤 복사, 있으면 기존 사용"""
    
    sample_path = Path(sample_dir)
    base_path = Path(base_dir)
    
    # sample 폴더 확인
    if sample_path.exists():
        # 기존 sample 폴더 사용
        video_files = list(sample_path.glob('*.mp4'))
        
        if video_files:
            print("\n" + "="*60)
            print(f"기존 sample 폴더 발견: {len(video_files)}개 비디오")
            print("="*60)
            
            selected_videos = []
            for video_path in sorted(video_files):
                # 파일명에서 클래스명 추출 시도
                filename = video_path.stem
                class_name = "Unknown"
                
                # 파일명 패턴 분석
                for class_keyword in ['전도', '파손', '방화', '흡연', '유기', '절도', '폭행', '교통약자']:
                    if class_keyword in filename:
                        class_name = class_keyword
                        break
                
                selected_videos.append({
                    'path': str(video_path),
                    'class': class_name,
                    'folder': 'sample'
                })
                print(f"[OK] {video_path.name} ({class_name})")
            
            print(f"\n총 {len(selected_videos)}개 비디오 사용")
            print("="*60 + "\n")
            
            return selected_videos, False  # False = 복사 안함
        else:
            # 빈 폴더 발견 → 자동 삭제 후 새로 생성
            print("\n" + "="*60)
            print("[INFO] 빈 sample 폴더 발견 → 삭제 후 새로 생성")
            print("="*60)
            
            try:
                sample_path.rmdir()  # 빈 폴더 삭제
                print("[OK] 빈 sample 폴더 삭제 완료")
            except Exception as e:
                print(f"[WARNING] 폴더 삭제 실패: {e}")
                print("[INFO] 수동으로 'sample' 폴더를 삭제하고 재실행하세요.")
                return [], False
    
    # sample 폴더 생성 + 랜덤 선택 + 복사
    print("\n" + "="*60)
    print("sample 폴더 생성 및 랜덤 샘플 복사")
    print("="*60)
    
    sample_path.mkdir(exist_ok=True)
    print(f"[OK] sample 폴더 생성: {sample_path.absolute()}")
    
    # 8개 클래스 폴더명
    class_folders = [
        'VS_03.이상행동_07.전도',
        'VS_03.이상행동_08.파손',
        'VS_03.이상행동_09.방화',
        'VS_03.이상행동_10.흡연',
        'VS_03.이상행동_11.유기',
        'VS_03.이상행동_12.절도',
        'VS_03.이상행동_13.폭행',
        'VS_03.이상행동_14.교통약자'
    ]
    
    selected_videos = []
    copy_count = 0
    
    print("\n8개 클래스에서 랜덤 선택 및 복사:")
    
    for folder_name in class_folders:
        folder_path = base_path / folder_name
        
        if not folder_path.exists():
            print(f"[WARNING] 폴더를 찾을 수 없음: {folder_name}")
            continue
        
        # 폴더 내 모든 .mp4 파일 찾기
        video_files = list(folder_path.glob('*.mp4'))
        
        if not video_files:
            print(f"[WARNING] 비디오 없음: {folder_name}")
            continue
        
        # 랜덤 선택 (1개)
        selected_video = random.choice(video_files)
        class_name = folder_name.split('_')[-1]
        
        # 새 파일명: 01_전도_원본파일명.mp4
        new_filename = f"{len(selected_videos)+1:02d}_{class_name}_{selected_video.name}"
        dest_path = sample_path / new_filename
        
        # 복사
        try:
            shutil.copy2(selected_video, dest_path)
            copy_count += 1
            
            selected_videos.append({
                'path': str(dest_path),
                'class': class_name,
                'folder': folder_name
            })
            
            print(f"[OK] {folder_name}: {selected_video.name}")
            print(f"     → sample/{new_filename}")
            
        except Exception as e:
            print(f"[ERROR] 복사 실패: {e}")
    
    print(f"\n총 {copy_count}개 비디오를 sample 폴더에 복사 완료")
    print("="*60 + "\n")
    
    return selected_videos, True  # True = 복사 완료

# ============================================
# 모델 정의
# ============================================
class Optimized3DCNN(nn.Module):
    """추론용 3D CNN - 학습 때와 동일한 구조"""
    
    def __init__(self, num_classes=8):
        super().__init__()
        
        # 학습 때와 완전히 동일한 구조
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
    """이상행동 탐지기 - 한글 지원"""
    
    def __init__(self, model_path, device='cuda', confidence_threshold=0.6):
        self.device = device
        self.confidence_threshold = confidence_threshold
        
        # 모델 로드
        print(f"모델 로딩: {model_path}")
        checkpoint = torch.load(model_path, map_location=device, weights_only=False)
        
        # 클래스 레이블 매핑
        if 'label_map' in checkpoint:
            self.label_map = checkpoint['label_map']
            print(f"[OK] 체크포인트에서 레이블 로드")
        else:
            print("[WARNING] 체크포인트에 label_map 없음")
            try:
                import pickle
                metadata_path = 'C:/편의점이상행동/metadata/train_event_8class_metadata.pkl'
                with open(metadata_path, 'rb') as f:
                    metadata = pickle.load(f)
                    self.label_map = metadata['label_map']
                    print(f"[OK] 메타데이터에서 레이블 로드")
            except:
                self.label_map = {
                    '전도': 0, '파손': 1, '방화': 2, '흡연': 3,
                    '유기': 4, '절도': 5, '폭행': 6, '교통약자': 7
                }
        
        self.id_to_label = {v: k for k, v in self.label_map.items()}
        self.num_classes = len(self.label_map)
        
        # 모델 초기화
        self.model = Optimized3DCNN(num_classes=self.num_classes).to(device)
        self.model.load_state_dict(checkpoint['model'])
        self.model.eval()
        
        print(f"[OK] 모델 로드 완료!")
        print(f"  클래스 수: {self.num_classes}")
        if 'best_val_acc' in checkpoint:
            print(f"  검증 정확도: {checkpoint['best_val_acc']:.1f}%")
        
        # 전처리 파라미터
        self.mean = torch.tensor([0.45, 0.45, 0.45]).view(1, 3, 1, 1, 1).to(device)
        self.std = torch.tensor([0.225, 0.225, 0.225]).view(1, 3, 1, 1, 1).to(device)
        self.target_size = 224
        
        # 한글 폰트 로드
        try:
            self.font_large = ImageFont.truetype("malgun.ttf", 40)
            self.font_medium = ImageFont.truetype("malgun.ttf", 30)
            self.font_small = ImageFont.truetype("malgun.ttf", 20)
            print("[OK] 한글 폰트 로드 (맑은 고딕)")
        except:
            try:
                self.font_large = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 40)
                self.font_medium = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 30)
                self.font_small = ImageFont.truetype("C:/Windows/Fonts/malgun.ttf", 20)
                print("[OK] 한글 폰트 로드 (맑은 고딕)")
            except:
                print("[WARNING] 한글 폰트 없음. 기본 폰트 사용")
                self.font_large = ImageFont.load_default()
                self.font_medium = ImageFont.load_default()
                self.font_small = ImageFont.load_default()
        
        # 클래스별 색상
        self.class_colors_rgb = {
            0: (255, 100, 100), 1: (255, 255, 100), 2: (255, 100, 0), 3: (255, 100, 255),
            4: (100, 200, 255), 5: (255, 200, 100), 6: (255, 0, 0), 7: (100, 255, 255),
        }
        
        self.class_colors = {
            0: (100, 100, 255), 1: (100, 255, 255), 2: (0, 100, 255), 3: (255, 100, 255),
            4: (255, 200, 100), 5: (100, 200, 255), 6: (0, 0, 255), 7: (255, 255, 100),
        }
        
        # 통계
        self.stats = {
            'total_frames': 0,
            'inference_times': [],
            'detections': {label: 0 for label in self.label_map.keys()}
        }
    
    def preprocess_frames(self, frames):
        """프레임 전처리"""
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
        """16프레임 예측"""
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
        """결과 그리기 - 한글 지원"""
        h, w = frame.shape[:2]
        
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(frame_rgb)
        draw = ImageDraw.Draw(pil_image)
        
        class_name_kr = result['class_name_kr']
        confidence = result['confidence']
        class_id = result['class_id']
        color_rgb = self.class_colors_rgb.get(class_id, (255, 255, 255))
        
        # 반투명 배경
        overlay = Image.new('RGBA', pil_image.size, (0, 0, 0, 0))
        overlay_draw = ImageDraw.Draw(overlay)
        overlay_draw.rectangle([(0, 0), (w, 200)], fill=(0, 0, 0, 180))
        pil_image = Image.alpha_composite(pil_image.convert('RGBA'), overlay).convert('RGB')
        draw = ImageDraw.Draw(pil_image)
        
        is_abnormal = confidence > self.confidence_threshold
        
        if is_abnormal:
            status_text = f"경고: {class_name_kr} 감지"
            status_color = (255, 0, 0)
        else:
            status_text = "상태: 불확실"
            status_color = (255, 255, 0)
        
        draw.text((20, 10), status_text, font=self.font_large, fill=status_color)
        draw.text((20, 60), f"클래스: {class_name_kr}", font=self.font_medium, fill=color_rgb)
        draw.text((20, 95), f"신뢰도: {confidence*100:.1f}%", font=self.font_small, fill=(255, 255, 255))
        
        frame = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # 신뢰도 바
        bar_width, bar_height, bar_x, bar_y = 300, 20, 20, 130
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + bar_width, bar_y + bar_height), (50, 50, 50), -1)
        fill_width = int(bar_width * confidence)
        color_bgr = self.class_colors.get(class_id, (255, 255, 255))
        cv2.rectangle(frame, (bar_x, bar_y), (bar_x + fill_width, bar_y + bar_height), color_bgr, -1)
        
        # 상위 3개
        probs = result['probabilities']
        top3_indices = np.argsort(probs)[-3:][::-1]
        
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(frame_rgb)
        draw = ImageDraw.Draw(pil_image)
        
        y_offset = 165
        for i, idx in enumerate(top3_indices):
            label_kr = self.id_to_label[idx]
            prob = probs[idx]
            text = f"{i+1}. {label_kr}: {prob*100:.1f}%"
            draw.text((20, y_offset + i*25), text, font=self.font_small, fill=(200, 200, 200))
        
        if fps:
            draw.text((w - 150, 10), f"FPS: {fps:.1f}", font=self.font_small, fill=(0, 255, 255))
        draw.text((w - 180, 40), f"Buffer: {frame_buffer_size}/16", font=self.font_small, fill=(255, 255, 255))
        
        frame = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        return frame
    
    def process_video(self, video_path, output_path=None, stride=8, display=True, real_time_speed=True):
        """비디오 처리"""
        print(f"\n{'='*60}")
        print(f"비디오 처리: {Path(video_path).name}")
        print(f"{'='*60}")
        
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"비디오를 열 수 없음: {video_path}")
        
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        frame_delay = int(1000 / fps) if fps > 0 else 33
        
        print(f"해상도: {width}x{height}, FPS: {fps}, 총 프레임: {total_frames}")
        print(f"{'='*60}\n")
        
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
                          f"신뢰도: {result['confidence']*100:5.1f}% | "
                          f"시간: {result['inference_time']*1000:.1f}ms")
                
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
                    overlay_draw.rectangle([(width//2-150, height//2-50), (width//2+150, height//2+50)], fill=(0, 0, 0, 180))
                    pil_img = Image.alpha_composite(pil_img.convert('RGBA'), overlay).convert('RGB')
                    draw = ImageDraw.Draw(pil_img)
                    draw.text((width//2-80, height//2-20), "일시정지", font=self.font_large, fill=(0, 255, 255))
                    display_frame = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
                
                cv2.imshow('편의점 이상행동 탐지', display_frame)
                
                wait_time = max(1, frame_delay) if real_time_speed and not paused else (30 if paused else 1)
                key = cv2.waitKey(wait_time) & 0xFF
                
                if key == ord('q'):
                    print("\n사용자 중단")
                    break
                elif key == ord(' '):
                    paused = not paused
                    print("\n[PAUSE]" if paused else "[PLAY]")
        
        cap.release()
        if writer:
            writer.release()
        if display:
            cv2.destroyAllWindows()
        
        self.print_statistics()
        if output_path:
            print(f"\n[OK] 결과 저장: {output_path}")
    
    def print_statistics(self):
        """통계 출력"""
        print(f"\n{'='*60}")
        print("처리 통계")
        print(f"{'='*60}")
        print(f"총 프레임: {self.stats['total_frames']}")
        
        if self.stats['inference_times']:
            avg_time = np.mean(self.stats['inference_times']) * 1000
            print(f"평균 추론 시간: {avg_time:.1f}ms")
            print(f"추론 FPS: {1000/avg_time:.1f}")
        
        print(f"\n클래스별 탐지 횟수:")
        for label, count in sorted(self.stats['detections'].items(), key=lambda x: x[1], reverse=True):
            if count > 0:
                print(f"  {label:15s}: {count:4d}회")
        print(f"{'='*60}\n")
    
    def reset_statistics(self):
        """통계 초기화"""
        self.stats['total_frames'] = 0
        self.stats['inference_times'] = []
        for key in self.stats['detections'].keys():
            self.stats['detections'][key] = 0

# ============================================
# 메인 함수
# ============================================
def main():
    """메인 함수"""
    
    MODEL_PATH = 'efficient_50_best.pth'
    BASE_VIDEO_DIR = r'C:\편의점이상행동\Validation\비디오'
    SAMPLE_DIR = 'sample'
    OUTPUT_DIR = 'outputs'
    
    CONFIDENCE_THRESHOLD = 0.6
    STRIDE = 8
    DISPLAY = True
    REAL_TIME_SPEED = True
    SAVE_OUTPUT = True
    USE_WARMUP = True
    
    print("="*60)
    print("편의점 이상행동 탐지 시스템")
    print("="*60)
    
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    print(f"디바이스: {device}")
    if device == 'cuda':
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    # sample 폴더 설정
    selected_videos, is_new_sample = setup_sample_folder(BASE_VIDEO_DIR, SAMPLE_DIR)
    
    if not selected_videos:
        print("[ERROR] 처리할 비디오 없음!")
        return
    
    if is_new_sample:
        print("\n[INFO] 새 샘플 생성됨")
        print(f"[INFO] 다른 샘플을 원하면 '{SAMPLE_DIR}' 폴더 삭제 후 재실행\n")
    else:
        print("\n[INFO] 기존 샘플 사용")
        print(f"[INFO] 새 샘플을 원하면 '{SAMPLE_DIR}' 폴더 삭제 후 재실행\n")
    
    Path(OUTPUT_DIR).mkdir(exist_ok=True)
    
    # 탐지기 초기화
    detector = AbnormalBehaviorDetector(
        model_path=MODEL_PATH,
        device=device,
        confidence_threshold=CONFIDENCE_THRESHOLD
    )
    
    # GPU 워밍업
    if device == 'cuda' and USE_WARMUP:
        warmup_start = time.time()
        print("\nGPU 워밍업 중...", end='', flush=True)
        try:
            dummy = torch.randn(1, 3, 8, 112, 112).to(device)
            with torch.no_grad():
                _ = detector.model(dummy)
            warmup_time = time.time() - warmup_start
            print(f" 완료! ({warmup_time:.2f}초)")
            if warmup_time > 5:
                print("[INFO] 첫 실행인 경우 CUDA 초기화로 5-10초 걸림")
        except Exception as e:
            print(f" 실패: {e}")
    
    print()
    
    # 8개씩 처리
    batch_size = 8
    total_batches = (len(selected_videos) + batch_size - 1) // batch_size
    
    total_stats = {'videos_processed': 0, 'total_frames': 0, 'class_detection_count': {}}
    
    for batch_idx in range(total_batches):
        batch_start = batch_idx * batch_size
        batch_end = min(batch_start + batch_size, len(selected_videos))
        batch_videos = selected_videos[batch_start:batch_end]
        
        print(f"\n{'='*60}")
        print(f"세트 {batch_idx + 1}/{total_batches}: {len(batch_videos)}개 처리")
        print(f"{'='*60}\n")
        
        for idx_in_batch, video_info in enumerate(batch_videos):
            global_idx = batch_start + idx_in_batch + 1
            video_path = video_info['path']
            class_name = video_info['class']
            
            print(f"\n[{global_idx}/{len(selected_videos)}] 처리 중: {class_name}")
            print(f"파일: {Path(video_path).name}")
            print("-" * 60)
            
            output_path = None
            if SAVE_OUTPUT:
                output_filename = f"{global_idx:02d}_{class_name}_{Path(video_path).stem}_result.mp4"
                output_path = str(Path(OUTPUT_DIR) / output_filename)
            
            detector.reset_statistics()
            
            try:
                detector.process_video(
                    video_path=video_path,
                    output_path=output_path,
                    stride=STRIDE,
                    display=DISPLAY,
                    real_time_speed=REAL_TIME_SPEED
                )
                
                total_stats['videos_processed'] += 1
                total_stats['total_frames'] += detector.stats['total_frames']
                for cls, count in detector.stats['detections'].items():
                    if cls not in total_stats['class_detection_count']:
                        total_stats['class_detection_count'][cls] = 0
                    total_stats['class_detection_count'][cls] += count
                
            except Exception as e:
                print(f"\n[ERROR] 처리 실패: {e}")
                import traceback
                traceback.print_exc()
        
        if batch_end < len(selected_videos):
            print(f"\n{'='*60}")
            print(f"세트 {batch_idx + 1}/{total_batches} 완료!")
            user_input = input(f"\n다음 세트 계속? [Y/n]: ")
            if user_input.lower() == 'n':
                print("중단됨")
                break
    
    # 전체 요약
    print(f"\n{'='*60}")
    print("전체 요약")
    print(f"{'='*60}")
    print(f"처리 완료: {total_stats['videos_processed']}/{len(selected_videos)}")
    print(f"총 프레임: {total_stats['total_frames']}")
    print(f"\n전체 탐지 횟수:")
    for cls, count in sorted(total_stats['class_detection_count'].items(), key=lambda x: x[1], reverse=True):
        if count > 0:
            print(f"  {cls:15s}: {count:4d}회")
    print(f"{'='*60}")
    
    if SAVE_OUTPUT:
        print(f"\n[OK] 결과 저장 위치: {OUTPUT_DIR}/")
    
    print(f"\n{'='*60}")
    print("시연 완료!")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()