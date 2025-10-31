# 1. 기본 이미지: 파이썬 3.10 (슬림 버전)
FROM python:3.10-slim

# 2. 작업 디렉토리 설정
WORKDIR /app

# 3. 의존성 설치 
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. 나머지 모든 백엔드 코드를 /app 디렉토리로 복사
COPY . .

# 5. Flask/SocketIO가 0.0.0.0:5000에서 실행될 것이므로 포트 개방
EXPOSE 5000

# 6. 서버 실행! (app.py의 __name__ == '__main__' 부분을 실행)
CMD ["python", "app.py"]