import React, { useState } from "react";
import { tokens } from "../../theme";
import {
  useTheme,
  Box,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Button,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Badge,
} from "@mui/material";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import PersonIcon from "@mui/icons-material/Person";
import ExitToAppOutlinedIcon from "@mui/icons-material/ExitToAppOutlined";
import FireIcon from "@mui/icons-material/LocalFireDepartmentOutlined";
import SmokeIcon from "@mui/icons-material/SmokeFreeOutlined";
import GunAlertOutlinedIcon from "@mui/icons-material/ReportOutlined";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { LOGOUT } from "./../../store/actions";
import { useDispatch } from "react-redux";
import axiosInstance from "../../api/axios";

const Topbar = () => {
  const dispatcher = useDispatch();
  const theme = useTheme();
  const colors = tokens;
  const currentRoute = window.location.pathname;
  const user = useSelector((state) => state.account.user);
  const refresh_token = useSelector((state) => state.account.Refresh_token);
  const username = JSON.stringify(user.username);
  let firstName = username.replace(/['"]+/g, "").split(".")[0];
  firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const routeTextMap = {
    "/dashboard": "Welcome Back, " + firstName,
    "/view_feed": "View Live Feed",
    "/notifications": "Notifications",
    "/incidents": "Incidents",
    "/usermgnt": "User Management",
    "/reports": "Reports",
    "/ai": "Artificial Intelligence",
    "/contact": "Contact Us",
    "/faq": "FAQ",
    "/settings/camsetting": "Camera Settings",
    "/settings/dispatchsettings": "Dispatch Settings",
    "/settings/floorplan": "Floor Plan",
    "/settings/versioninfo": "Version Info",
    "/settings/security": "Security",
  };

  const welcomeText = routeTextMap[currentRoute];

  const [anchorEl, setAnchorEl] = useState(null);
  const [alertAnchorEl, setAlertAnchorEl] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("all");

  const notifications = [
    { type: "fire", message: "Fire alert message", unread: true },
    { type: "smoke", message: "Smoke alert message", unread: false },
    { type: "gun", message: "Gun alert message", unread: true },
    { type: "fire", message: "Another fire alert message", unread: false },
  ];

  const handleClick = (event) => {
    if (anchorEl) {
      setAnchorEl(null);
    } else {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAlertClick = (event) => {
    if (alertAnchorEl) {
      setAlertAnchorEl(null);
    } else {
      setAlertAnchorEl(event.currentTarget);
    }
  };

  const handleAlertClose = () => {
    setAlertAnchorEl(null);
  };

  const handleFilterChange = (event) => {
    setSelectedFilter(event.target.value);
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (selectedFilter === "all") return true;
    return notification.type === selectedFilter;
  });

  const handleLogout = () => {
    axiosInstance
      .post("auth/api/users/logout", refresh_token)
      .then(function (response) {
        if (response.data.success) {
          dispatcher({ type: LOGOUT });
        } else {
          console.log("response - ", response.data.msg);
        }
      })
      .catch(function (error) {
        console.log("error - ", error);
      });
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",          // ✅ 브라우저 전체 폭으로 고정
        maxWidth: "100vw",        // ✅ 더 이상 늘어나지 않게 제한
        overflowX: "hidden",      // ✅ 내부 내용에 의한 흔들림 방지
        backgroundColor: "#fff",
        zIndex: 10001,
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        sx={{
          padding: "12px 24px",
        }}
      >
        {/* Left side - Logo */}
        {/* ✅ Left side - Header style logo */}
        <Box display="flex" alignItems="center">
          <Typography
            component={Link}
            to="/main"                // ✅ 메인페이지로 이동
            sx={{
              fontFamily: "'GmarketSansBold', sans-serif",
              fontSize: "26px",
              fontWeight: 900,
              color: "#f56214",
              textDecoration: "none",
              letterSpacing: "-0.05rem",
              "&:hover": { opacity: 0.8 },
            }}
          >
            ON:SIGNAL
          </Typography>
        </Box>

        {/* Right side - Icons and Profile */}
        <Box display="flex" alignItems="center" gap={2}>
          {/* Notification Bell */}
          <IconButton
            onClick={handleAlertClick}
            sx={{
              padding: "8px",
              color: "#666",
              transition: "all 0.2s ease",
              "&:hover": {
                color: "#333",
                backgroundColor: "transparent",
              },
            }}
          >
            <Badge
              badgeContent={unreadCount}
              color="error"
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: "9px",
                  height: "16px",
                  minWidth: "16px",
                  padding: "0 4px",
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M20 17H22V19H2V17H4V10C4 5.58172 7.58172 2 12 2C16.4183 2 20 5.58172 20 10V17ZM18 17V10C18 6.68629 15.3137 4 12 4C8.68629 4 6 6.68629 6 10V17H18ZM9 21H15V23H9V21Z"></path>
              </svg>
            </Badge>
          </IconButton>

          {/* Divider Line */}
          <Box
            sx={{
              width: "1px",
              height: "24px",
              backgroundColor: "#e0e0e0",
              margin: "0 4px",
            }}
          />

          {/* Profile Section */}
          <Box
            display="flex"
            alignItems="center"
            gap={1.5}
            sx={{
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "8px",
              transition: "all 0.2s ease",
              "&:hover": {
                // backgroundColor: "#f5f5f5",
              },
            }}
            onClick={handleClick}
          >
            {/* Text Info */}
            <Box sx={{ textAlign: "right" }}>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: "'NanumSquare', sans-serif",
                  fontWeight: "700",
                  color: "#2c2c2c",
                  fontSize: "14px",
                  lineHeight: "1.2",
                  marginBottom: "-4px",
                }}
              >
                {firstName}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontFamily: "'NanumSquare', sans-serif",
                  fontWeight: "400",
                  color: "#999",
                  fontSize: "12px",
                  lineHeight: "1.2",
                }}
              >
                {user.email || "user@example.com"}
              </Typography>
            </Box>

            {/* Profile Icon */}
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                backgroundColor: "#f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#666",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M4 22C4 17.5817 7.58172 14 12 14C16.4183 14 20 17.5817 20 22H18C18 18.6863 15.3137 16 12 16C8.68629 16 6 18.6863 6 22H4ZM12 13C8.685 13 6 10.315 6 7C6 3.685 8.685 1 12 1C15.315 1 18 3.685 18 7C18 10.315 15.315 13 12 13ZM12 11C14.21 11 16 9.21 16 7C16 4.79 14.21 3 12 3C9.79 3 8 4.79 8 7C8 9.21 9.79 11 12 11Z"></path>
              </svg>
            </Box>
          </Box>

          {/* Notification Menu */}
          <Menu
            anchorEl={alertAnchorEl}
            open={Boolean(alertAnchorEl)}
            onClose={handleAlertClose}
            PaperProps={{
              style: {
                backgroundColor: "#ffffff",
                boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                borderRadius: "12px",
                width: "320px",
                maxHeight: "450px",
                overflowY: "auto",
                marginTop: "8px",
              },
            }}
          >
            <Grid
              container
              alignItems="center"
              justifyContent="space-between"
              sx={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0" }}
            >
              <Grid item>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color={colors.blackAccents[500]}
                  sx={{ fontFamily: "'NanumSquare', sans-serif" }}
                >
                  Notifications
                </Typography>
              </Grid>
              <Grid item>
                <Button
                  variant="text"
                  color="primary"
                  size="small"
                  sx={{
                    textTransform: "none",
                    fontSize: "12px",
                    fontFamily: "'NanumSquare', sans-serif"
                  }}
                >
                  Mark All as Read
                </Button>
              </Grid>
            </Grid>
            <FormControl fullWidth variant="outlined" sx={{ p: 2 }}>
              <InputLabel sx={{ fontFamily: "'NanumSquare', sans-serif" }}>Filter</InputLabel>
              <Select
                value={selectedFilter}
                onChange={handleFilterChange}
                label="Filter"
                sx={{
                  borderRadius: "8px",
                  fontFamily: "'NanumSquare', sans-serif"
                }}
              >
                <MenuItem value="all" sx={{ fontFamily: "'NanumSquare', sans-serif" }}>All Notifications</MenuItem>
                <MenuItem value="unread" sx={{ fontFamily: "'NanumSquare', sans-serif" }}>Unread</MenuItem>
                <MenuItem value="fire" sx={{ fontFamily: "'NanumSquare', sans-serif" }}>Fire</MenuItem>
                <MenuItem value="smoke" sx={{ fontFamily: "'NanumSquare', sans-serif" }}>Smoke</MenuItem>
                <MenuItem value="gun" sx={{ fontFamily: "'NanumSquare', sans-serif" }}>Gun</MenuItem>
                <MenuItem value="weapon" sx={{ fontFamily: "'NanumSquare', sans-serif" }}>Weapon</MenuItem>
              </Select>
            </FormControl>
            {filteredNotifications.map((notification, index) => (
              <MenuItem
                key={index}
                onClick={handleAlertClose}
                sx={{
                  padding: "12px 20px",
                  borderBottom: "1px solid #f5f5f5",
                  "&:hover": {
                    backgroundColor: "#f9f9f9",
                  },
                }}
              >
                <Box display="flex" alignItems="center" gap={2} width="100%">
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        notification.type === "fire"
                          ? "#ffebee"
                          : notification.type === "smoke"
                          ? "#e3f2fd"
                          : "#fff3e0",
                    }}
                  >
                    {notification.type === "fire" && (
                      <FireIcon sx={{ color: "#f44336" }} />
                    )}
                    {notification.type === "smoke" && (
                      <SmokeIcon sx={{ color: "#2196f3" }} />
                    )}
                    {notification.type === "gun" && (
                      <GunAlertOutlinedIcon sx={{ color: "#ff9800" }} />
                    )}
                  </Box>
                  <Box flex={1}>
                    <Typography
                      variant="subtitle2"
                      fontWeight="600"
                      sx={{ fontFamily: "'NanumSquare', sans-serif" }}
                    >
                      {notification.type.charAt(0).toUpperCase() +
                        notification.type.slice(1)}{" "}
                      Alert
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      fontSize="12px"
                      sx={{ fontFamily: "'NanumSquare', sans-serif" }}
                    >
                      {notification.message}
                    </Typography>
                  </Box>
                  {notification.unread && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: colors.blueAccents[500],
                      }}
                    />
                  )}
                </Box>
              </MenuItem>
            ))}
            <Box sx={{ padding: "12px 20px", textAlign: "center" }}>
              <Button
                variant="text"
                color="primary"
                fullWidth
                sx={{
                  textTransform: "none",
                  borderRadius: "8px",
                  padding: "8px",
                  fontFamily: "'NanumSquare', sans-serif"
                }}
              >
                View All Notifications
              </Button>
            </Box>
          </Menu>

          {/* Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            PaperProps={{
              style: {
                backgroundColor: "#ffffff",
                boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                borderRadius: "12px",
                marginTop: "8px",
                minWidth: "200px",
              },
            }}
          >
            <MenuItem
              onClick={handleClose}
              component={Link}
              to="/myprofile"
              sx={{
                fontFamily: "'NanumSquare', sans-serif",
                padding: "12px 20px",
                "&:hover": {
                  backgroundColor: "#f5f5f5",
                },
              }}
            >
              <PersonIcon sx={{ mr: 2, color: colors.blueAccents[500] }} />
              <Typography variant="body2" sx={{ fontFamily: "'NanumSquare', sans-serif", fontSize: "16px" }}>My Profile</Typography>
            </MenuItem>
            <MenuItem
              onClick={handleLogout}
              sx={{
                fontFamily: "'NanumSquare', sans-serif",
                padding: "12px 20px",
                "&:hover": {
                  backgroundColor: "#ffebee",
                },
              }}
            >
              <ExitToAppOutlinedIcon sx={{ mr: 2, color: colors.orangeAccents[500] }} />
              <Typography variant="body2" sx={{ fontFamily: "'NanumSquare', sans-serif", fontSize: "16px" }}>Logout</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Box>
    </Box>
  );
};

export default Topbar;