import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/main">ON:SIGNAL</Link>
        </div>
        <nav className="nav">
          <ul>
            <li><Link to="/login">로그인</Link></li>
            <li><Link to="/signup">회원가입</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
