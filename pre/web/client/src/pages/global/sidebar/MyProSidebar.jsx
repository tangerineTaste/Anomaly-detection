import React, { useState, useEffect } from "react";
import { Menu, Sidebar, MenuItem } from "react-pro-sidebar";
import { useSidebarContext } from "./sidebarContext";
import { Link, useHistory, useLocation } from "react-router-dom";
import { Box, Typography } from "@mui/material";

// ICONS
import { FaChartPie } from "react-icons/fa";
import { MdOutlineNotificationAdd } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";
import { LuSettings } from "react-icons/lu";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import { FiHeadphones } from "react-icons/fi";
import { AiOutlineCamera } from "react-icons/ai";
import { BiUserVoice } from "react-icons/bi";

const Item = ({ title, to, icon, selected, setSelected }) => {
  const isActive = selected === title;

  return (
    <Box
      sx={{
        margin: "4px 12px",
        borderRadius: "10px",
        backgroundColor: isActive ? "rgb(255 167 0 / 24%)" : "transparent",
        transition: "all 0.3s ease",
        "&:hover": {
          backgroundColor: "rgb(255 167 0 / 24%)",
          "& .menu-text": { color: "#f56214", fontWeight: 600 },
          "& .menu-icon": { color: "#f56214" },
        },
      }}
    >
      <MenuItem
        active={isActive}
        style={{
          color: isActive ? "#f56214" : "#444",
          backgroundColor: "transparent",
          padding: "10px 16px",
          fontWeight: isActive ? 600 : 500,
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
        onClick={() => setSelected(title)}
        icon={
          <Box
            className="menu-icon"
            sx={{
              color: isActive ? "#f56214" : "#444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease",
              width: "22px",
            }}
          >
            {icon}
          </Box>
        }
        routerLink={<Link to={to} />}
      >
        <Typography
          className="menu-text"
          sx={{
            fontWeight: isActive ? 600 : 500,
            fontSize: "15px",
            color: isActive ? "#f56214" : "#444",
            transition: "all 0.3s ease",
          }}
        >
          {title}
        </Typography>
      </MenuItem>
    </Box>
  );
};

const MyProSidebar = () => {
  const { sidebarRTL, sidebarImage } = useSidebarContext();
  const history = useHistory();
  const location = useLocation();

  // ✅ 경로 기반으로 메뉴 상태 자동 설정
  const getInitialMenu = (path) => {
    if (path === "/dashboard" || path === "/") return "Dashboard";
    if (path.startsWith("/settings/camsetting")) return "카메라 등록";
    if (path.startsWith("/settings/dispatchsettings")) return "카메라 수정";
    if (path === "/notifications") return "CCTV 보기";
    if (path === "/incidents") return "이미지 관리";
    if (path === "/faq") return "상가 등록";
    if (path === "/contact") return "상가 수정";
    return "";
  };

  const [selected, setSelected] = useState(getInitialMenu(location.pathname));
  const [isCameraMenuOpen, setIsCameraMenuOpen] = useState(false);

  // ✅ 경로가 바뀔 때 선택된 메뉴 업데이트
  useEffect(() => {
    setSelected(getInitialMenu(location.pathname));
  }, [location.pathname]);

  // ✅ 카메라 관련 페이지면 자동으로 토글 펼치기
  useEffect(() => {
    if (
      location.pathname.startsWith("/settings/camsetting") ||
      location.pathname.startsWith("/settings/dispatchsettings")
    ) {
      setIsCameraMenuOpen(true);
    }
  }, [location.pathname]);

  return (
    <Box
      sx={{
        position: "fixed",
        top: "70px",
        left: 0,
        height: "calc(100vh - 70px)",
        zIndex: 10000,
      }}
    >
      <Sidebar
        breakPoint="md"
        rtl={sidebarRTL}
        backgroundColor="#ffffff"
        image={sidebarImage}
        width="280px"
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative"
        }}
      >
        {/* 스크롤 가능한 메뉴 영역 */}
        <Box sx={{ flex: 1, overflowY: "auto", paddingBottom: "80px" }}>
          <Menu iconshape="square">
            <Box sx={{ padding: "15px 0 8px 0" }}>
              {/* ===== MAIN MENU ===== */}
              <Typography
                sx={{
                  padding: "8px 24px",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#1c1c1c",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                MAIN MENU
              </Typography>

              {/* Dashboard */}
              <Item
                title="Dashboard"
                to="/dashboard"
                icon={<FaChartPie style={{ fontSize: 20 }} />}
                selected={selected}
                setSelected={setSelected}
              />

              {/* 카메라 관리 */}
              <Box sx={{ margin: "4px 12px 4px 8px" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    userSelect: "none",
                    px: 2,
                    py: 1.5,
                    borderRadius: "10px",
                    transition: "all 0.2s ease",
                    color: isCameraMenuOpen ? "#f56214" : "#444",
                    backgroundColor: isCameraMenuOpen
                      ? "rgb(255 167 0 / 24%)"
                      : "transparent",
                    "&:hover": {
                      backgroundColor: "rgb(255 167 0 / 24%)",
                      color: "#f56214",
                    },
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCameraMenuOpen((prev) => !prev);
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LuSettings style={{ fontSize: 20 }} />
                    <Typography sx={{ fontWeight: 500, fontSize: "16px" }}>
                      카메라 관리
                    </Typography>
                  </Box>

                  {/* 화살표 (열기/닫기 회전) */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width="18"
                    height="18"
                    style={{
                      transition: "transform 0.2s ease",
                      transform: isCameraMenuOpen
                        ? "rotate(0deg)"
                        : "rotate(-90deg)",
                    }}
                  >
                    <path d="M11.9999 13.1714L16.9497 8.22168L18.3639 9.63589L11.9999 15.9999L5.63599 9.63589L7.0502 8.22168L11.9999 13.1714Z"></path>
                  </svg>
                </Box>

                {isCameraMenuOpen && (
                  <Box
                    sx={{
                      pl: 4,
                      mt: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1,
                    }}
                  >
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCameraMenuOpen(true); // ✅ 클릭해도 접히지 않게
                        setSelected("카메라 등록");
                        history.push("/settings/camsetting");
                      }}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        cursor: "pointer",
                        py: 1,
                        borderRadius: "8px",
                        "&:hover": {
                          backgroundColor: "rgb(255 167 0 / 24%)",
                          color: "#f56214",
                        },
                      }}
                    >
                      <AiOutlineCamera style={{ fontSize: 18 }} />
                      <Typography sx={{ fontWeight: 500 }}>카메라 등록</Typography>
                    </Box>

                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCameraMenuOpen(true); // ✅ 접히지 않게 유지
                        setSelected("카메라 수정");
                        history.push("/settings/dispatchsettings");
                      }}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        cursor: "pointer",
                        py: 1,
                        borderRadius: "8px",
                        "&:hover": {
                          backgroundColor: "rgb(255 167 0 / 24%)",
                          color: "#f56214",
                        },
                      }}
                    >
                      <BiUserVoice style={{ fontSize: 18 }} />
                      <Typography sx={{ fontWeight: 500 }}>카메라 수정</Typography>
                    </Box>
                  </Box>
                )}
              </Box>

              {/* CCTV 보기 */}
              <Item
                title="CCTV 보기"
                to="/notifications"
                icon={<MdOutlineNotificationAdd style={{ fontSize: 20 }} />}
                selected={selected}
                setSelected={setSelected}
              />

              {/* 이미지 관리 */}
              <Item
                title="이미지 관리"
                to="/incidents"
                icon={<FaRegEye style={{ fontSize: 20 }} />}
                selected={selected}
                setSelected={setSelected}
              />

              {/* ===== INFORMATION ===== */}
              <Typography
                sx={{
                  padding: "12px 24px 4px 24px",
                  fontSize: "14px",
                  fontWeight: "700",
                  color: "#1c1c1c",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                INFORMATION
              </Typography>

              {/* 상가 등록 */}
              <Item
                title="상가 등록"
                to="/faq"
                icon={<AiOutlineQuestionCircle style={{ fontSize: 20 }} />}
                selected={selected}
                setSelected={setSelected}
              />

              {/* 상가 수정 */}
              <Item
                title="상가 수정"
                to="/contact"
                icon={<FiHeadphones style={{ fontSize: 20 }} />}
                selected={selected}
                setSelected={setSelected}
              />
            </Box>
          </Menu>
        </Box>

        {/* Footer - 하단 고정 */}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            padding: "20px",
            backgroundColor: "#f9f9f9",
            borderTop: "1px solid #f0f0f0",
          }}
        >
          <Typography
            sx={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#444",
              textAlign: "center",
            }}
          >
            Version 2.0
          </Typography>
        </Box>
      </Sidebar>
    </Box>
  );
};

export default MyProSidebar;