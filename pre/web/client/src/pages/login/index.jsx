//react
import React from "react";
import { Link, useHistory } from "react-router-dom"; // 👈 useHistory 추가
import { useDispatch } from "react-redux";

// ⚠️ 나눔스퀘어 폰트를 사용하려면 public/index.html의 <head> 태그 안에 아래 코드를 추가하세요:
// <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/moonspam/NanumSquare@2.0/nanumsquare.css">

//MUI
import {
  Box,
  Button,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputAdornment,
  IconButton,
} from "@mui/material";

//Third party
import { Formik } from "formik";
import * as yup from "yup";
import { ACCOUNT_INITIALIZE } from "../../store/actions";

//Project Imports
import useScriptRef from "../../hooks/useScriptRef";
import { tokens } from "../../theme";
import axioInstance from "../../api/axios";

//assets
import { MdVisibility } from "react-icons/md";
import { MdVisibilityOff } from "react-icons/md";

const Login = (props, { ...others }) => {
  const dispatcher = useDispatch();
  const history = useHistory(); // 👈 history 객체 초기화

  const [showPassword, setShowPassword] = React.useState(false);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const passwordRegEx =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$%^&+=!])(?!.*\s).{8,}$/;

  const scriptedRef = useScriptRef();

  const handleFormSubmit = (
    values,
    { setErrors, setStatus, setSubmitting }
  ) => {
    try {
      axioInstance
        .post("auth/api/users/login", {
          email: values.email,
          password: values.password,
        })
        .then(function (response) {
          if (response.data.success) {
            dispatcher({
              type: ACCOUNT_INITIALIZE,
              payload: {
                isLoggedIn: true,
                Access_token: response.data.Access_token,
                Refresh_token: response.data.Refresh_token,
                Role: response.data.Role,
                user: response.data.user,
              },
            });
            if (scriptedRef.current) {
              setStatus({ success: true });
              setSubmitting(false);

              // 🌟 **수정: 로그인 성공 후 대시보드(/dashboard)로 명시적 이동**
              history.push("/dashboard");
            }
          } else {
            setStatus({ success: false });
            setErrors({ submit: response.data.msg });
            setSubmitting(false);
          }
        })
        .catch(function (error) {
          setStatus({ success: false });
          setSubmitting(false);
        });
    } catch (err) {
      console.error(err);
      if (scriptedRef.current) {
        setStatus({ success: false });
        setErrors({ submit: err.message });
        setSubmitting(false);
      }
    }
  };

  const colors = tokens;

  const initialValues = {
    email: "",
    password: "",
  };

  const loginSchema = yup.object().shape({
    email: yup.string().required("이메일을 입력해 주세요"),
    password: yup
      .string()
      .matches(passwordRegEx, "비밀번호 형식이 올바르지 않습니다!")
      .required("비밀번호를 입력해 주세요"),
  });

  const buttonSx = {
    backgroundColor: "#f56214", // 진한 파란색/보라색
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "bold",
    fontFamily: "'NanumSquare', 'Noto Sans KR', sans-serif",
    padding: "15px 15px",
    width: "100%",
    borderRadius: "12px",
    textTransform: "none",
    "&:hover": {
      backgroundColor: "#e55510",
      boxShadow: "0 4px 12px rgba(76, 81, 191, 0.3)",
    },
  };

  const textFieldSx = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#F7F7F7",
      borderRadius: "12px",
      fontFamily: "'NanumSquare', 'Noto Sans KR', sans-serif",
      "& fieldset": {
        borderColor: "#E5E5E5",
      },
      "&:hover fieldset": {
        borderColor: "#D0D0D0",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#f56214",
      },
    },
    "& .MuiIconButton-root": {
        marginRight: "4px",
        padding: "0",
    },
    "& .MuiOutlinedInput-input": {
      padding: "18px 20px",  // 원하는 패딩값으로 변경
    },
    "& .MuiInputLabel-root": {
      fontFamily: "'NanumSquare', 'Noto Sans KR', sans-serif",
    },
    "& .MuiFormHelperText-root": {
      fontFamily: "'NanumSquare', 'Noto Sans KR', sans-serif",
    },
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      p={3}
      sx={{
        // background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", // 보라색 그라데이션 배경
        fontFamily: "'NanumSquare', 'Noto Sans KR', sans-serif",
      }}
    >
      <Box
        maxWidth="450px"
        width="100%"
        sx={{
          padding: "60px 40px",
          backgroundColor: "#ffffff", // 흰색 박스
          // borderRadius: "25px", // 둥근 모서리
          // boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
          fontFamily: "'NanumSquare', 'Noto Sans KR', sans-serif",
        }}
      >
        {/* 제목 */}
        <Typography
          variant="h3"
          textAlign="center"
          mb={2}
          sx={{
            fontSize: "34px",
            fontWeight: "800",
            color: "#000000",
            fontFamily: "'NanumSquare', 'Noto Sans KR', sans-serif"
          }}
        >
          로그인
        </Typography>

        {/* 부제목 */}
        <Typography
          variant="body1"
          textAlign="center"
          mb={5}
          sx={{
            fontSize: "16px",
            color: "#666666",
            letterSpacing: "-0.05rem",
            lineHeight: "1.6",
            fontFamily: "'NanumSquare', 'Noto Sans KR', sans-serif"
          }}
        >
          안전한 매장 관리를 위한 첫 걸음,
          <br />
          로그인하고 시작하세요.
        </Typography>

        <Formik
          onSubmit={handleFormSubmit}
          initialValues={initialValues}
          validationSchema={loginSchema}
        >
          {({
            errors,
            handleBlur,
            handleChange,
            handleSubmit,
            isSubmitting,
            touched,
            values,
          }) => (
            <form noValidate onSubmit={handleSubmit} {...others}>
              <FormControl fullWidth>
                {/* 이메일 입력 */}
                <TextField
                  fullWidth
                  variant="outlined"
                  type="text"
                  placeholder="이메일을 입력해 주세요."
                  onBlur={handleBlur}
                  onChange={handleChange}
                  value={values.email}
                  name="email"
                  error={!!touched.email && !!errors.email}
                  helperText={touched.email && errors.email}
                  sx={{ ...textFieldSx, mb: 2}}
                />

                {/* 비밀번호 입력 */}
                <TextField
                  fullWidth
                  variant="outlined"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호를 입력해 주세요."
                  onBlur={handleBlur}
                  onChange={handleChange}
                  value={values.password}
                  name="password"
                  error={!!touched.password && !!errors.password}
                  helperText={touched.password && errors.password}
                  sx={textFieldSx}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          onMouseDown={handleMouseDownPassword}
                          edge="end"
                        >
                          {showPassword ? (
                            <MdVisibility />
                          ) : (
                            <MdVisibilityOff />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* 로그인 상태 유지 & 비밀번호 찾기 */}
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mt={2}
                  mb={3}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        sx={{
                          color: "#666666",
                          "&.Mui-checked": {
                            color: "#4C51BF",
                          },
                        }}
                      />
                    }
                    label={
                      <Typography sx={{
                        fontSize: "14px",
                        color: "#666666",
                        fontFamily: "'NanumSquare', 'Noto Sans KR', sans-serif"
                      }}>
                        로그인 상태 유지
                      </Typography>
                    }
                  />
                  <Link
                    to="/forgot-password"
                    style={{
                      color: "#f56214",
                      textDecoration: "none",
                      fontSize: "14px",
                      fontWeight: "500",
                      fontFamily: "'NanumSquare', 'Noto Sans KR', sans-serif"
                    }}
                  >
                    비밀번호를 잊으셨나요?
                  </Link>
                </Box>

                {/* 로그인 버튼 */}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={buttonSx}
                >
                  로그인
                </Button>
              </FormControl>
            </form>
          )}
        </Formik>
      </Box>
    </Box>
  );
};

export default Login;