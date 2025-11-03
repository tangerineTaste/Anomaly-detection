import React, { useState, useEffect, useRef } from "react";
import Header from "../../components/header/Header";
import Footer from "../../components/footer/Footer";
import { Button, Box } from "@mui/material";
import "./Main.css";

export default function Main() {
  const [index, setIndex] = useState(0);
  const stepRefs = useRef([]);

  // ✅ Intersection Observer 등록
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("active");
        });
      },
      { threshold: 0.2 }
    );

    stepRefs.current.forEach((ref) => ref && observer.observe(ref));
    return () => observer.disconnect();
  }, []);

  const cards = [
  {
    tag: "전도",
    img: `${process.env.PUBLIC_URL}/assets/main_bg.jpg`,
    title: "관절 각도를 기반으로 한\n신체 기울기 및 동작 감지",
    desc: "자세 변화와 낙상 위험을 실시간 감지해 즉각적인 구조 신호를 전송합니다.",
    keywords: "관절 각도 변화 / 기울기 / 포즈시퀀스",
  },
  {
    tag: "파손",
    img: `${process.env.PUBLIC_URL}/assets/main_bg.jpg`,
    title: "물체 충돌 및\n비정상 움직임 분석",
    desc: "카메라가 물체 파손 상황을 감지하고 관리자에게 즉시 알림을 보냅니다.",
    keywords: "충돌 / 파손 / 프레임변화",
  },
  {
    tag: "방화",
    img: `${process.env.PUBLIC_URL}/assets/main_bg.jpg`,
    title: "화염 및 연기 패턴\n딥러닝 기반 감지",
    desc: "화염이나 연기의 색상, 움직임 변화를 AI가 학습해 조기 경보를 발생합니다.",
    keywords: "화염 감지 / 연기 감지 / 색상변화",
  },
  {
    tag: "흡연",
    img: `${process.env.PUBLIC_URL}/assets/main_bg.jpg`,
    title: "연기 확산 및 제스처\n패턴 인식 기반 감지",
    desc: "금연 구역 내 흡연 행위를 AI 비전으로 탐지해 관리자에게 알립니다.",
    keywords: "제스처 인식 / 연기 확산 / 탐지",
  },
  {
    tag: "폭행",
    img: `${process.env.PUBLIC_URL}/assets/main_bg.jpg`,
    title: "사람 간 비정상적\n접촉 동작 분석",
    desc: "공격적 움직임과 자세 변화를 시퀀스 단위로 감지해 즉시 경고합니다.",
    keywords: "상호작용 / 자세 변화 / 공격 패턴",
  },
  {
    tag: "유기",
    img: `${process.env.PUBLIC_URL}/assets/main_bg.jpg`,
    title: "아동 및 반려동물\n방치 상황 인식",
    desc: "일정 시간 이상 감지되지 않는 행동 패턴을 분석해 이상 상황을 판단합니다.",
    keywords: "시간 기반 감지 / 객체 추적 / 동선 분석",
  },
  {
    tag: "절도",
    img: `${process.env.PUBLIC_URL}/assets/main_bg.jpg`,
    title: "물체 이동 및\n손동작 추적 감지",
    desc: "특정 영역 내 비인가 물체 이동을 AI가 자동 인식하여 기록합니다.",
    keywords: "객체 인식 / 이동 추적 / 구역 침입",
  },
  {
    tag: "교통약자",
    img: `${process.env.PUBLIC_URL}/assets/main_bg.jpg`,
    title: "휠체어·유모차 이용자\n위험 상황 감지",
    desc: "넘어짐, 길 막힘 등 위험을 즉시 감지해 안내 및 지원을 요청합니다.",
    keywords: "휠체어 / 유모차 / 이동 속도",
  },
];

  const [stackTab, setStackTab] = useState("backend");

    const stacks = {
      backend: [
        { name: "Python", src: `${process.env.PUBLIC_URL}/assets/logos/python.svg` },
        { name: "FastAPI", src: `${process.env.PUBLIC_URL}/assets/logos/fastapi.svg` },
        { name: "Flask", src: `${process.env.PUBLIC_URL}/assets/logos/flask-original.svg` },
        { name: "PostgreSQL", src: `${process.env.PUBLIC_URL}/assets/logos/postgresql.svg` },
        { name: "SQLAlchemy", src: `${process.env.PUBLIC_URL}/assets/logos/sqlalchemy.svg` },
        { name: "Docker", src: `${process.env.PUBLIC_URL}/assets/logos/docker.svg` },
        { name: "Python", src: `${process.env.PUBLIC_URL}/assets/logos/python.svg` },
        { name: "FastAPI", src: `${process.env.PUBLIC_URL}/assets/logos/fastapi.svg` },
        { name: "Flask", src: `${process.env.PUBLIC_URL}/assets/logos/flask-original.svg` },
        { name: "PostgreSQL", src: `${process.env.PUBLIC_URL}/assets/logos/postgresql.svg` },
        { name: "SQLAlchemy", src: `${process.env.PUBLIC_URL}/assets/logos/sqlalchemy.svg` },
        { name: "Docker", src: `${process.env.PUBLIC_URL}/assets/logos/docker.svg` },
      ],
      frontend: [
        { name: "React", src: `${process.env.PUBLIC_URL}/assets/logos/react.svg` },
        { name: "Vite", src: `${process.env.PUBLIC_URL}/assets/logos/vite.svg` },
        { name: "MUI", src: `${process.env.PUBLIC_URL}/assets/logos/mui.svg` },
        { name: "TailwindCSS", src: `${process.env.PUBLIC_URL}/assets/logos/tailwind.svg` },
        { name: "Redux", src: `${process.env.PUBLIC_URL}/assets/logos/redux.svg` },
        { name: "Axios", src: `${process.env.PUBLIC_URL}/assets/logos/axios.svg` },
      ],
    };


  const handlePrev = () => {
    setIndex((prev) => (prev > 0 ? prev - 1 : 0));
  };

  const handleNext = () => {
    setIndex((prev) => (prev < cards.length - 3 ? prev + 1 : prev));
  };

  return (
    <>
      <Header />
      <Box component="main">
        {/* Hero Section */}
        <section
          className="section hero"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)),
              url(${process.env.PUBLIC_URL}/assets/main_bg.jpg)
            `,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="container">
            <div className="hero__left">
              <h1 className="hero__title">관찰의 끝, 신호의 시작</h1>
              <p className="hero__brand">ON:SIGNAL</p>
              <div className="hero__divider"></div>
              <p className="hero__desc">
                언제 어디서나 매장 상황 ‘실시간 모니터링’이 가능한 서비스입니다.
                <br />
                AI가 당신 대신 매장을 지켜보며 이상행동을 즉시 알립니다.
              </p>
              <Button
                href="/login"
                variant="contained"
                sx={{
                  backgroundColor: "#f56214 !important",
                  color: "#fff !important",
                  borderRadius: "50px",
                  padding: "12px 36px",
                  fontSize: "16px",
                  fontWeight: "700",
                  fontFamily: "'NanumSquare', 'Noto Sans KR', sans-serif",
                  textTransform: "none",
                  boxShadow: "none",
                  "&:hover": {
                    backgroundColor: "#e55510 !important",
                    boxShadow: "0 4px 12px rgba(245, 98, 20, 0.3)",
                  },
                }}
              >
                로그인
              </Button>
            </div>
          </div>
        </section>

        {/* ✅ Service Section */}
        <section className="section service">
          <div className="container service__container">
            {/* 왼쪽 텍스트 */}
            <div className="service__text">
              <h2 className="service__title">
                <b>서비스 모델</b>을<br />확인해 보세요.
              </h2>
              <p className="service__desc">
                내 매장에 맞는 서비스를 찾아<br />
                바로 적용해 보세요.
              </p>
              <div className="service__arrows">
                <button className="arrow-btn" onClick={handlePrev}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10.8284 12.0007L15.7782 16.9504L14.364 18.3646L8 12.0007L14.364 5.63672L15.7782 7.05093L10.8284 12.0007Z"></path>
                  </svg>
                </button>
                <button className="arrow-btn" onClick={handleNext}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.1717 12.0007L8.22192 7.05093L9.63614 5.63672L16.0001 12.0007L9.63614 18.3646L8.22192 16.9504L13.1717 12.0007Z"></path>
                  </svg>
                </button>
              </div>
            </div>

            {/* ✅ 오른쪽 카드 슬라이드 */}
            <div className="service__cards-wrapper">
              <div
                className="service__cards"
                style={{
                  transform: `translateX(-${index * 304}px)`,
                  transition: "transform 0.4s ease",
                }}
              >
                {cards.map((card, i) => (
                  <div className="service__card" key={i}>
                    <div className="card__img-wrapper">
                      <img src={card.img} alt={card.tag} className="card__img" />
                      <div className="card__tag">{card.tag}</div>
                    </div>
                    <h3 className="card__title">{card.title}</h3>
                    <p className="card__desc">{card.desc}</p>
                    <p className="card__keywords">{card.keywords}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ✅ Platform Section */}
            <section className="section platform">
              <div className="container">
                <h2 className="platform__title">
                  <b>실시간 감지</b>부터 <b>이상행동 분석</b>까지,<br /><b>모든 과정</b>을 한눈에 확인하세요.
                </h2>
                <p className="platform__subtitle">
                  AI 기반 CCTV 분석 플랫폼이 매장 내 모든 상황을 실시간으로 인식하고 기록합니다.
                </p>

                {/* STEP 1 */}
                <div className="platform__step" ref={(el) => (stepRefs.current[0] = el)}>
                  <div className="platform__text">
                    <span className="platform__step-label">STEP 1. CCTV 영상 등록</span>
                    <h4 className="platform__headline">설치된 CCTV만 등록하면<br />AI 분석 준비 완료</h4>
                    <p className="platform__desc">
                      복잡한 설정 없이 기존 CCTV 영상을 등록하면,
                      AI가 자동으로 영상 피드를 분석 환경에 연결합니다.
                      매장별 카메라를 손쉽게 관리하고, 실시간 데이터를 받아볼 수 있습니다.
                    </p>
                  </div>
                  <div className="platform__image">
                    <img src={`${process.env.PUBLIC_URL}/assets/main_bg.jpg`} alt="CCTV 등록" />
                  </div>
                </div>

                {/* STEP 2 */}
                <div className="platform__step" ref={(el) => (stepRefs.current[1] = el)}>
                  <div className="platform__image">
                    <img src={`${process.env.PUBLIC_URL}/assets/main_bg.jpg`} alt="AI 감지" />
                  </div>
                  <div className="platform__text">
                    <span className="platform__step-label">STEP 2. AI 감지 및 분석</span>
                    <h4 className="platform__headline">AI가 이상행동을 감지하고<br />즉시 관리자에게 알림</h4>
                    <p className="platform__desc">
                      전도, 폭행, 방화 등 이상행동을 실시간으로 탐지하여
                      관리자 화면과 알림 시스템을 통해 즉시 전송합니다.
                      인식된 데이터는 자동 저장되어 통계와 분석에 활용됩니다.
                    </p>
                  </div>
                </div>

                {/* STEP 3 */}
                <div className="platform__step" ref={(el) => (stepRefs.current[2] = el)}>
                  <div className="platform__text">
                    <span className="platform__step-label">STEP 3. 이상행동 리포트</span>
                    <h4 className="platform__headline">데이터 기반의<br />통계 리포트 자동 생성</h4>
                    <p className="platform__desc">
                      감지된 이상행동 데이터를 바탕으로 주간·월간 통계 리포트를 자동 생성합니다.
                      관리자 페이지에서 그래프와 지표로 확인 가능하며,
                      이를 통해 효율적인 매장 관리와 사고 예방이 가능합니다.
                    </p>
                  </div>
                  <div className="platform__image">
                    <img src={`${process.env.PUBLIC_URL}/assets/main_bg.jpg`} alt="리포트 분석" />
                  </div>
                </div>
              </div>
              <div className="rolling-text" aria-hidden="true">
                  <div className="rolling-track">
                    <span>OBSERVE · DETECT · ALERT · ANALYZE · EVOLVE ·</span>
                    <span>OBSERVE · DETECT · ALERT · ANALYZE · EVOLVE ·</span>
                  </div>
                </div>
            </section>

            {/* ✅ Tech Stack / Partners-like Section */}
            <section className="section stack">
              <div className="container">
                <h2 className="stack__title">
                  <b>백엔드</b>부터 <b>프론트엔드</b>까지,<br /><b>사용 기술</b>을 한눈에 확인하세요.
                </h2>
                <p className="stack__subtitle">
                  프로젝트에 사용한 핵심 기술 스택을 한눈에 확인하세요.
                </p>

                {/* 탭 버튼 */}
                <div className="stack__tabs">
                  <button
                    className={`stack__tab ${stackTab === "backend" ? "is-active" : ""}`}
                    onClick={() => setStackTab("backend")}
                  >
                    백엔드
                  </button>
                  <button
                    className={`stack__tab ${stackTab === "frontend" ? "is-active" : ""}`}
                    onClick={() => setStackTab("frontend")}
                  >
                    프론트엔드
                  </button>
                </div>

                {/* 로고 그리드 카드 */}
                <div className="stack__card">
                  <div className="stack__grid">
                    {stacks[stackTab].map((it) => (
                      <div key={it.name} className="stack__item" title={it.name}>
                        <img src={it.src} alt={it.name} />
                        <span>{it.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
        </Box>
      <Footer />
    </>
  );
}
