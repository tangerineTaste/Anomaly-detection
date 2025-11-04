// src/components/Footer.jsx
import React from "react";
import "./Footer.css";
import { FaGithub } from "react-icons/fa"; // ✅ GitHub 아이콘 추가

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* 왼쪽 영역 */}
        <div className="footer-info">
          {/*<div className="footer-links">*/}
          {/*  <a href="#">개인정보처리방침</a>*/}
          {/*  <span>|</span>*/}
          {/*  <a href="#">서비스 이용약관</a>*/}
          {/*</div>*/}

          <p className="footer-text">
            <strong>프로젝트명 :</strong> SIGNAL - 이상행동 감지 시스템 &nbsp; | &nbsp;
            <strong>개발팀 :</strong> AI Surveillance Lab &nbsp; | &nbsp;
            <strong>버전 :</strong> 1.0.0 <br />
            본 시스템은 CCTV 기반으로 사람의 전도(Fall) 및 이상행동을
            인공지능이 실시간으로 감지하여 빠른 대응을 지원하기 위해 개발되었습니다.
          </p>

          <p className="footer-copy">
            © 2025 SIGNAL Behavior Detection System. All rights reserved.
          </p>
        </div>

        {/* 오른쪽 영역 - GitHub 아이콘 */}
        <div className="footer-right">
          <a
            href="https://github.com/tangerineTaste/Anomaly-detection"  // ✅ 네 깃허브 링크로 변경
            target="_blank"
            rel="noopener noreferrer"
            className="github-icon"
            title="GitHub Repository"
          >
            <FaGithub size={36} />
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
