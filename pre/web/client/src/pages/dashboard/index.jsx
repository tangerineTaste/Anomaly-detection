import { Box, IconButton, Typography } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { AiOutlineArrowRight } from "react-icons/ai";
import { BsFillCameraFill, BsRobot } from "react-icons/bs";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import LineChart from "../../components/LineChart";

const Dashboard = ({ boxWidth = "380px", boxHeight = "150px" }) => {
  // ✅ Flask API 경로
  const API_URL = "http://127.0.0.1:5000/dashboard/stats";

  // ✅ 통계 데이터 저장
  const [stats, setStats] = useState({
    today_incidents: 0,
    verified_events: 0,
    ai_false_rate: 0,
    active_events: 0,
    total_cameras: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(API_URL);
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      }
    };
    fetchStats();
  }, []);

  // 🔶 카드 리스트
  const cardItems = [
    { title: "오늘 감지된 이상행동", value: stats.today_incidents },
    { title: "검증 완료된 이벤트", value: stats.verified_events },
    { title: "실시간 대응 중 이벤트", value: stats.active_events },
    { title: "활성 카메라수", value: stats.total_cameras },
    { title: "오프라인 카메라", value: 0 },
  ];

    // SVG icons (1~3 변경됨)
  const icons = [
    // 1
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M4.00001 20V14C4.00001 9.58172 7.58173 6 12 6C16.4183 6 20 9.58172 20 14V20H21V22H3.00001V20H4.00001ZM6.00001 14H8.00001C8.00001 11.7909 9.79087 10 12 10V8C8.6863 8 6.00001 10.6863 6.00001 14ZM11 2H13V5H11V2ZM19.7782 4.80761L21.1924 6.22183L19.0711 8.34315L17.6569 6.92893L19.7782 4.80761ZM2.80762 6.22183L4.22183 4.80761L6.34315 6.92893L4.92894 8.34315L2.80762 6.22183Z"></path>
    </svg>,
    // 2
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M4 3H20C20.5523 3 21 3.44772 21 4V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V4C3 3.44772 3.44772 3 4 3ZM11.0026 16L18.0737 8.92893L16.6595 7.51472L11.0026 13.1716L8.17421 10.3431L6.75999 11.7574L11.0026 16Z"></path>
    </svg>,
    // 3
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M13.5 2C13.5 2.44425 13.3069 2.84339 13 3.11805V5H18C19.6569 5 21 6.34315 21 8V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V8C3 6.34315 4.34315 5 6 5H11V3.11805C10.6931 2.84339 10.5 2.44425 10.5 2C10.5 1.17157 11.1716 0.5 12 0.5C12.8284 0.5 13.5 1.17157 13.5 2ZM0 10H2V16H0V10ZM24 10H22V16H24V10ZM9 14.5C9.82843 14.5 10.5 13.8284 10.5 13C10.5 12.1716 9.82843 11.5 9 11.5C8.17157 11.5 7.5 12.1716 7.5 13C7.5 13.8284 8.17157 14.5 9 14.5ZM16.5 13C16.5 12.1716 15.8284 11.5 15 11.5C14.1716 11.5 13.5 12.1716 13.5 13C13.5 13.8284 14.1716 14.5 15 14.5C15.8284 14.5 16.5 13.8284 16.5 13Z"></path>
    </svg>,
    // 4
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
      <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11 15V17H13V15H11ZM11 7V13H13V7H11Z"></path>
    </svg>,
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
        <path d="M9.82726 21.7633L14.3094 14L17.8413 20.1175C16.198 21.3021 14.1805 22 12 22C11.2538 22 10.5268 21.9183 9.82726 21.7633ZM7.88985 21.119C5.3115 19.955 3.31516 17.7297 2.4578 15H11.4226L7.88985 21.119ZM2.04938 13C2.01672 12.6711 2 12.3375 2 12C2 9.39284 2.99773 7.0187 4.6322 5.23859L9.11325 13H2.04938ZM6.15866 3.88251C7.80198 2.6979 9.81949 2 12 2C12.7462 2 13.4732 2.08172 14.1727 2.2367L9.6906 10L6.15866 3.88251ZM16.1101 2.88101C18.6885 4.04495 20.6848 6.27028 21.5422 9H12.5774L16.1101 2.88101ZM21.9506 11C21.9833 11.3289 22 11.6625 22 12C22 14.6072 21.0023 16.9813 19.3678 18.7614L14.8868 11H21.9506Z"></path>
    </svg>,
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="26" height="26">
        <path d="M19.5859 21H3.00016C2.44787 21 2.00016 20.5523 2.00016 20V6.00003C2.00016 5.44775 2.44787 5.00003 3.00016 5.00003H3.58594L1.39355 2.80765L2.80777 1.39343L22.6068 21.1924L21.1925 22.6066L19.5859 21ZM7.55544 8.96953C6.58902 10.0346 6.00016 11.4486 6.00016 13C6.00016 16.3137 8.68645 19 12.0002 19C13.5516 19 14.9656 18.4112 16.0307 17.4448L14.6139 16.028C13.9129 16.6337 12.9993 17 12.0002 17C9.79102 17 8.00016 15.2092 8.00016 13C8.00016 12.0009 8.36649 11.0873 8.97217 10.3863L7.55544 8.96953ZM22.0002 17.7858L17.9549 13.7406C17.9848 13.4979 18.0002 13.2508 18.0002 13C18.0002 9.68633 15.3139 7.00003 12.0002 7.00003C11.7494 7.00003 11.5023 7.01541 11.2596 7.04528L8.10726 3.89293L9.00016 3.00003H15.0002L17.0002 5.00003H21.0002C21.5524 5.00003 22.0002 5.44775 22.0002 6.00003V17.7858ZM13.5085 9.29418C14.5045 9.69999 15.3002 10.4957 15.706 11.4917L13.5085 9.29418Z"></path>
    </svg>
  ];

  return (
    <Box sx={{ backgroundColor: "#f8f9f9", height: "auto",}} p={4} minHeight={"100vh"}>
      <Grid container spacing={3}>
        {/* ----------------- 통계 카드 ----------------- */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            {cardItems.map((item, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Box
                  sx={{
                    backgroundColor: "#fff",
                    borderRadius: "16px",
                    p: 3,
                    width: "193px",
                    height: boxHeight,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    border: "1px solid #f0f0f0",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  }}
                >
                  <Typography sx={{ fontSize: "16px", fontWeight: 600, color: "#1c1c1c", wordBreak: "keep-all", }}>
                    {item.title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "36px",
                      fontWeight: 700,
                      textAlign: "right",
                      width: "100%",
                      color: "#f56214",
                      lineHeight: "1",
                    }}
                  >
                    {item.value}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          <Grid item xs={12} md={8}>
            <Box
              sx={{
                background: "#fff",
                borderRadius: "16px",
                p: 3,
                marginTop: "20px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
              }}
            >
              <Typography sx={{ fontWeight: "bold", mb: 2, fontSize: "16px" }}>
                월별 이상행동 통계
              </Typography>

              <Box sx={{ height: "250px" }}>
                <LineChart isDashboard={true} data={stats.monthly_data || []} />
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/*/!* ----------------- 월별 이상행동 그래프 ----------------- *!/*/}
        {/*  <Grid item xs={12} md={8}>*/}
        {/*    <Box*/}
        {/*      sx={{*/}
        {/*        background: "#fff",*/}
        {/*        borderRadius: "16px",*/}
        {/*        p: 3,*/}
        {/*        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",*/}
        {/*      }}*/}
        {/*    >*/}
        {/*      <Typography sx={{ fontWeight: "bold", mb: 2 }}>*/}
        {/*        월별 이상행동 통계*/}
        {/*      </Typography>*/}

        {/*      <Box sx={{ height: "250px" }}>*/}
        {/*        <LineChart isDashboard={true} data={stats.monthly_data || []} />*/}
        {/*      </Box>*/}
        {/*    </Box>*/}
        {/*  </Grid>*/}

        {/* ----------------- 챗봇 박스 ----------------- */}
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              background: "#f56214",
              borderRadius: "16px",
              p: 4,
              height: "100%",
              minHeight: "377px",
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              position: "relative",
            }}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: "bold" , fontSize: "36px"}}>
                Security Chatbot
              </Typography>
              <Typography sx={{ color: "rgba(255,255,255,0.9)", marginBottom: "30px"}}>
                AI 기반 위험 상황 분석 및 자동 응답 시스템
              </Typography>
            </Box>

            {/*<Box sx={{ mt: 3, lineHeight: 1.8 }}>*/}
            {/*  <Typography>• 현재 활성 세션: 3</Typography>*/}
            {/*  <Typography>• 대기 중 응답 요청: 1</Typography>*/}
            {/*  <Typography>• 마지막 대화: CCTV 3번 이상행동 감지</Typography>*/}
            {/*</Box>*/}

            <Box sx={{ display: "flex", gap: 1 }}>
              <Link
                  to="#"
                  onClick={() => {
                      const currentHost = window.location.hostname;
                      // 팝업창으로 열기 (크기, 위치 지정 가능)
                      window.open(
                          `http://${currentHost}:8080/chat-app`,
                          "_blank",
                          "width=1000,height=800,left=200,top=100,menubar=no,toolbar=no,scrollbars=yes,resizable=yes"
                      );
                  }}
                  style={{textDecoration: "none"}}
              >
                <Box
                    sx={{
                        background: "rgba(255,255,255,0.2)",
                        borderRadius: "10px",
                        padding: "16px",
                        textAlign: "center",
                        cursor: "pointer",
                    }}
                >
                    대화 시작하기
                </Box>
            </Link>
            </Box>

            <BsRobot
              style={{
                position: "absolute",
                right: "24px",
                bottom: "16px",
                fontSize: "100px",
                opacity: 0.1,
              }}
            />
          </Box>
        </Grid>

        {/* ----------------- CCTV 피드 ----------------- */}
        <Grid item xs={12}>
          <Box
            sx={{
              background: "#fff",
              borderRadius: "16px",
              p: 3,
              boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {/*<BsFillCameraFill style={{ color: "#f56214", fontSize: "24px" }} />*/}
                <Typography sx={{ fontWeight: "bold", fontSize: "16px" }}>CCTV 보기</Typography>
              </Box>
              <Link to="/view_feed">
                <IconButton>
                  <AiOutlineArrowRight />
                </IconButton>
              </Link>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
              {[1, 2, 3].map((i) => (
                <img
                  key={i}
                  src={"../../assets/vid-evidence.jpg"}
                  alt={`camera${i}`}
                  style={{ width: "32%", borderRadius: "8px", objectFit: "cover" }}
                />
              ))}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
