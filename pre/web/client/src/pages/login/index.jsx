// src/pages/login/index.jsx

import React from "react";
import { Link, useHistory } from "react-router-dom";
import { useDispatch } from "react-redux";
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
import { Formik } from "formik";
import * as yup from "yup";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { ACCOUNT_INITIALIZE } from "../../store/actions";
import useScriptRef from "../../hooks/useScriptRef";
import { tokens } from "../../theme";
import axioInstance from "../../api/axios";

// ✅ 헤더 추가
import Header from "../../components/header/Header";

import Footer from "../../components/footer/Footer";

const Login = (props, { ...others }) => {
  const dispatcher = useDispatch();
  const history = useHistory();
  const [showPassword, setShowPassword] = React.useState(false);
  const scriptedRef = useScriptRef();

  const handleClickShowPassword = () => setShowPassword(!showPassword);
  const handleMouseDownPassword = (e) => e.preventDefault();

  const passwordRegEx =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$%^&+=!])(?!.*\s).{8,}$/;

  const handleFormSubmit = (values, { setErrors, setStatus, setSubmitting }) => {
    try {
      axioInstance
        .post("auth/api/users/login", {
          email: values.email,
          password: values.password,
        })
        .then((response) => {
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
            localStorage.setItem(
                "user",
                JSON.stringify({
                  username: response.data.user.username,
                  role: response.data.Role?.name || response.data.Role, // 백엔드 Role이 dict일 수도 있음
                  token: response.data.Access_token,
                })
              );
            if (scriptedRef.current) {
              setStatus({ success: true });
              setSubmitting(false);
              history.push("/dashboard");
            }
          } else {
            setStatus({ success: false });
            setErrors({ submit: response.data.msg });
            setSubmitting(false);
          }
        })
        .catch(() => {
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

  const initialValues = { email: "", password: "" };

  const loginSchema = yup.object().shape({
    email: yup.string().required("이메일을 입력해 주세요"),
    password: yup
      .string()
      .matches(passwordRegEx, "비밀번호 형식이 올바르지 않습니다!")
      .required("비밀번호를 입력해 주세요"),
  });

  const buttonSx = {
    backgroundColor: "#f56214",
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
      "& fieldset": { borderColor: "#E5E5E5" },
      "&:hover fieldset": { borderColor: "#D0D0D0" },
      "&.Mui-focused fieldset": { borderColor: "#f56214" },
    },
    "& .MuiOutlinedInput-input": { padding: "18px 20px" },
    "& .MuiIconButton-root": { marginRight: "4px", padding: "0" },
  };

  return (
    <>
      {/* ✅ 헤더 렌더링 */}
      <Header />

      {/* ✅ 헤더 높이만큼 상단 여백 확보 */}
      <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      // minHeight="calc(100vh - 80px)"
      mt="72px"
      py={15}  // ✅ 위아래 패딩 120px
      px={3}   // ✅ 좌우는 그대로 24px 유지 (원하면 같이 조정 가능)
      sx={{
        fontFamily: "'NanumSquare', 'Noto Sans KR', sans-serif",
        backgroundColor: "#fff",
      }}
    >
        <Box
          maxWidth="450px"
          width="100%"
          sx={{
            padding: "0px 40px",
            backgroundColor: "#ffffff",
            borderRadius: "25px",
          }}
        >
          <Typography
            variant="h3"
            textAlign="center"
            mb={2}
            sx={{
              fontSize: "36px",
              fontWeight: "800",
              color: "#1c1c1c",
              fontFamily: "'NanumSquare', 'Noto Sans KR', sans-serif",
            }}
          >
            로그인
          </Typography>

          <Typography
            variant="body1"
            textAlign="center"
            mb={5}
            sx={{
              fontSize: "16px",
              color: "#666666",
              lineHeight: "1.6",
              fontFamily: "'NanumSquare', 'Noto Sans KR', sans-serif",
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
                    sx={{ ...textFieldSx, mb: 2 }}
                  />

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
                            {showPassword ? <MdVisibility /> : <MdVisibilityOff />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mt={2}
                    mb={3}
                  >
                    <FormControlLabel
                      control={<Checkbox size="small" sx={{ color: "#666" }} />}
                      label={
                        <Typography sx={{ fontSize: "14px", color: "#666" }}>
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
                      }}
                    >
                      비밀번호를 잊으셨나요?
                    </Link>
                  </Box>

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
      <Footer />
    </>
  );
};

export default Login;
