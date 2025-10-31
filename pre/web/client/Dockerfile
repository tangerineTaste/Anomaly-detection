# --- 1단계: 빌드 환경 ---
# 노드 18 버전을 "builder"라는 이름의 임시 환경으로 지정
FROM node:18-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 의존성 설치 (캐시 활용)
COPY package.json ./
COPY package-lock.json ./
RUN npm install

# 나머지 모든 프론트엔드 코드 복사
COPY . .

# React 앱 빌드! (build 폴더가 생성됨)
RUN npm run build

# --- 2단계: 서빙 환경 ---
# 가벼운 Nginx(웹서버) 이미지 사용
FROM nginx:alpine

# "builder" 환경의 /app/build 폴더에서
# Nginx의 기본 HTML 폴더로 정적 파일들(HTML, JS, CSS) 복사
COPY --from=builder /app/build /usr/share/nginx/html

# 80번 포트 개방 (Nginx 기본 포트)
EXPOSE 80

# Nginx 실행
CMD ["nginx", "-g", "daemon off;"]