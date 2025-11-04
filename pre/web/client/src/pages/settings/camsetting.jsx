import React from "react";
import { useEffect } from "react";
import { Box, Button, MenuItem, TextField, Toolbar } from "@mui/material";
import {
  DataGrid,
  GridToolbarQuickFilter,
  GridToolbarContainer,
  GridToolbarFilterButton,
} from "@mui/x-data-grid";
import { tokens } from "../../theme";
import { Formik } from "formik";
import * as yup from "yup";
import { Typography } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import { useState } from "react";
import { AiOutlineCamera } from "react-icons/ai";
import { MdEdit } from "react-icons/md";
import { BsTrash3Fill } from "react-icons/bs";
import axiosInstance from "../../api/axios";

function CustomToolbar({ setFilterButtonEl, fetchCameras }) {
  const colors = tokens;

  const handleOverlayClick = (e) => {
    e.stopPropagation();
    setShowForm(false);
  };

  const [showForm, setShowForm] = React.useState(false);

  const ipAddressRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  const portRegex = /^([1-9]\d{0,4}|[1-5]\d{4}|[1-6][0-5][0-5][0-3][0-5])$/;

  const handleFormSubmit = (
    values,
    { setErrors, setStatus, setSubmitting }
  ) => {
    try {
      axiosInstance
        .post("user/settings/camsettings/add", {
          CameraName: values.name,
          CameraType: values.type,
          IPAddress: values.IP,
          Port: values.Port,
          OwnerName: values.Owner,
          Option: values.Option,
          Description: values.Description,
        })
        .then(function (response) {
          if (response.data.success) {
            // Handle success
            console.log("Camera added successfully:", response.data.message);
            alert("Camera added successfully");
            setStatus({ success: true });
            setSubmitting(false);
            fetchCameras();
            setShowForm(false);
          } else {
            // Handle failure
            console.error("Failed to add camera:", response.data.msg);
            alert(`Failed to add camera: ${response.data.msg}`);
            setStatus({ success: false });
            setErrors({ submit: response.data.msg });
            setSubmitting(false);
          }
        })
        .catch(function (error) {
          // Handle error
          console.error("Error adding camera:", error);
          alert("Error adding camera. Please try again.");
          setStatus({ success: false });
          setErrors({ submit: error.message });
          setSubmitting(false);
        });
    } catch (err) {
      // Handle unexpected error
      console.error(err);
      alert("Error adding camera. Please try again.");
      setStatus({ success: false });
      setErrors({ submit: err.message });
      setSubmitting(false);
    }
  };

  const [selectedType, setselectedType] = useState(""); // State to hold the selected question

  const handleTypeChange = (event) => {
    setselectedType(event.target.value);
  };

  const initialValues = {
    name: "",
    type: selectedType,
    IP: "",
    Port: "",
    Owner: "",
    Option: "",
    Description: "",
  };

  const checkoutSchema = yup.object().shape({
    name: yup.string().required("Required"),
    type: yup.string().required("Required"),
    IP: yup
      .string()
      .matches(ipAddressRegex, "Invalid IP!")
      .required("Required"),
    Port: yup.string().matches(portRegex, "Port is not valid!"),
    Owner: yup.string().required("Required"),
    Option: yup.string(),
    Description: yup.string().required("Required"),
  });

  const buttonSx = {
    backgroundColor: colors.orangeAccents[500],
    color: colors.primary[500],
    fontSize: "14px",
    fontWeight: "bold",
    padding: "10px",
    minWidth: "130px",
    "&:hover": {
      backgroundColor: colors.primary[500],
      color: colors.orangeAccents[500],
      boxShadow: " rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;",
    },
  };
  //Adding the Camers Form
  const AddCameraForm = ({
    onClose,
    onSubmit,
    initialValues,
    validationSchema,
    setShowForm,
  }) => {
    return (
      <Box
        position="fixed"
        top={0}
        left={0}
        width="100%"
        height="100%"
        display="flex"
        justifyContent="center"
        alignItems="center"
        onClick={handleOverlayClick}
        backgroundColor="rgba(0, 0, 0, 0.65)"
        zIndex={9999}
      >
        <Box
          onClick={(e) => e.stopPropagation()}
          backgroundColor={colors.primary[500]}
          borderRadius="8px"
          padding="20px"
          maxWidth="600px"
          height={"700px"}
          boxShadow="0px 4px 10px rgba(0, 0, 0, 0.2)"
        >
          <Formik
            onSubmit={handleFormSubmit}
            initialValues={initialValues}
            validationSchema={checkoutSchema}
          >
            {({
              values,
              errors,
              touched,
              handleBlur,
              handleChange,
              handleSubmit,
            }) => (
              <form onSubmit={handleSubmit}>
                <Box p={1} display={"flex"} alignItems={"center"}>
                  <AiOutlineCamera style={{ fontSize: "2rem" }} />
                  <Typography variant="h6" p={2} fontWeight={"bold"}>
                    Camera Details
                  </Typography>
                </Box>
                <Box
                  display="grid"
                  gap="25px"
                  gridTemplateColumns="repeat(4, minmax(0, 1fr))"
                  p={4}
                >
                  <TextField
                    fullWidth
                    variant="filled"
                    type="text"
                    label="Camera's Name"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    value={values.name} // Adjusted from 'values.Name'
                    name="name" // Adjusted from 'values.Name'
                    error={!!touched.name && !!errors.name}
                    helperText={touched.name && errors.name}
                    sx={{ gridColumn: "span 4" }}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    select
                    variant="filled"
                    type="text"
                    label="Camera's Type"
                    onBlur={handleBlur}
                    onChange={handleTypeChange}
                    value={values.type} // Adjusted from 'values.Type'
                    name="type" // Adjusted from 'values.Type'
                    error={!!touched.type && !!errors.type}
                    helperText={touched.type && errors.type}
                    sx={{
                      gridColumn: "span 2",
                    }}
                    SelectProps={{
                      MenuProps: {
                        style: { zIndex: 9999 },
                      },
                    }}
                    size="small"
                  >
                    <MenuItem value="Indoors">Indoors</MenuItem>
                    <MenuItem value="Outdoors">Outdoors</MenuItem>
                  </TextField>

                  <TextField
                    fullWidth
                    variant="filled"
                    type="text" // Adjusted from 'IP'
                    label="Camera's IP Address"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    value={values.IP}
                    name="IP"
                    error={!!touched.IP && !!errors.IP}
                    helperText={touched.IP && errors.IP}
                    sx={{ gridColumn: "span 2" }}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    variant="filled"
                    type="text"
                    label="Camera's Port"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    value={values.Port}
                    name="Port"
                    error={!!touched.Port && !!errors.Port}
                    helperText={touched.Port && errors.Port}
                    sx={{ gridColumn: "span 2" }}
                    size="small"
                  />

                  <TextField
                    fullWidth
                    variant="filled"
                    type="text"
                    label="Owner Name"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    value={values.Owner}
                    name="Owner"
                    error={!!touched.Owner && !!errors.Owner}
                    helperText={touched.Owner && errors.Owner}
                    sx={{ gridColumn: "span 2" }}
                    size="small"
                  />

                  <TextField
                    fullWidth
                    variant="filled"
                    type="text"
                    label="Optional"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    value={values.Option}
                    name="Option"
                    error={!!touched.Option && !!errors.Option}
                    helperText={touched.Option && errors.Option}
                    sx={{ gridColumn: "span 4" }}
                    size="small"
                  />

                  <TextField
                    fullWidth
                    variant="filled"
                    type="text"
                    label="Description"
                    onBlur={handleBlur}
                    onChange={handleChange}
                    value={values.Description}
                    name="Description"
                    error={!!touched.Description && !!errors.Description}
                    helperText={touched.Description && errors.Description}
                    sx={{
                      gridColumn: "span 4",
                      ".MuiInputBase-input": {
                        height: "8rem",
                      },
                    }}
                  />

                  <Box
                    gridColumn="span 4"
                    maxWidth={"100%"}
                    display="flex"
                    justifyContent="right"
                    gap={"10px"}
                  >
                    <Button
                      type="submit"
                      variant="contained"
                      size="small"
                      sx={{
                        color: colors.orangeAccents[500],
                        padding: "10px",
                        backgroundColor: colors.primary[500],
                        border: "1px solid" + colors.orangeAccents[500],
                        width: "120px",
                      }}
                    >
                      Help
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      size="small"
                      sx={{
                        color: colors.primary[500],
                        padding: "10px",
                        backgroundColor: colors.orangeAccents[500],
                        width: "120px",
                      }}
                    >
                      Add Camera
                    </Button>
                  </Box>
                </Box>
              </form>
            )}
          </Formik>
        </Box>
      </Box>
    );
  };

  return (
    <Box>
      {/* 안내 섹션 */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        bgcolor="#fff"
        px={4}
        py={3}
        borderBottom="1px solid #ddd"
        padding="0 0px"
      >
        <Box>
          <Typography variant="h5" fontSize="28px" fontWeight="bold" color="#1c1c1c" marginBottom="10px">
            카메라 등록 / 수정 안내
          </Typography>
          <Typography variant="body2" fontSize="16px" color="#666" marginBottom="20px">
            CCTV 카메라 등록과 설정을 관리할 수 있는 페이지입니다.<br />
            새로운 카메라를 추가하거나 기존 정보를 수정할 수 있습니다.
          </Typography>
        </Box>

        <Box
          component="img"
          src="/assets/faq_illustration.png"
          alt="Camera Illustration"
          sx={{ width: 220, height: "auto", objectFit: "contain" }}
        />
      </Box>

      {/* 중앙 정렬된 검색 + 버튼 */}
      <Box
        sx={{
          flexGrow: 1,
          borderRadius: "8px 8px 0 0",
          backgroundColor: "#fefffe",
        }}
      >
        <Toolbar
          variant="dense"
          disableGutters
          sx={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
            gap: 2,
            py: 2,
            padding: "20px 0px",
          }}
        >
          <GridToolbarContainer
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              backgroundColor: "#fff",
              borderRadius: "8px",
              padding: "4px 0 0",
            }}
          >
            <GridToolbarQuickFilter
              variant="outlined"
              size="small"
              sx={{
                borderColor: "#DCDDDD",
                color: "#202020",
                width: "250px",
              }}
            />
            <GridToolbarFilterButton
              variant="outlined"
              sx={{
                height: "3.125em",
                borderColor: "#bcbdbd",
                color: "#202020",
                "&:hover": { borderColor: "black" },
              }}
              ref={setFilterButtonEl}
            />
          </GridToolbarContainer>

          <Button onClick={() => setShowForm(true)} sx={buttonSx}>
            카메라 등록
          </Button>
        </Toolbar>

        {/* 모달 */}
        {showForm && (
          <AddCameraForm
            initialValues={initialValues}
            validationSchema={checkoutSchema}
          />
        )}
      </Box>
    </Box>
  );
}

const CameraSettings = () => {
  const [Camera, setCamera] = useState([]);

  const handleDelete = async (id) => {
    try {
      // Make a request to your backend to delete the camera
      const response = await axiosInstance.delete(
        `/user/settings/camsettings/delete/${id}`
      );
      console.log(response);
      if (response.status === 200) {
        console.log("Camera deleted successfully:", response.data.message);
        alert("Camera deleted successfully");
        fetchCameras();
      } else {
        // Handle error scenario
        console.error("Failed to delete camera:", response.data.message);
      }
    } catch (error) {
      // Handle unexpected error
      console.error("Error deleting camera:", error.message);
    }
  };

  const fetchCameras = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:5000/user/settings/camsettings"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(result);
      if (result.success && Array.isArray(result.camera)) {
        setCamera(result.camera);
      } else {
        throw new Error("Invalid data structure");
      }
    } catch (error) {
      console.error("There was an error fetching camera:", error);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []); // Dependencies array

  const colors = tokens;
  const [filterButtonEl, setFilterButtonEl] = useState(null);
  const columns = [
    {
      field: "id",
      headerName: "ID",
      flex: 1, // Space columns equally
      cellClassName: "name-column--cell",
    },
    {
      field: "CameraName",
      headerName: "Name",
      flex: 1, // Space columns equally
      cellClassName: "name-column--cell",
    },
    {
      field: "CameraType",
      headerName: "Type",
      type: "number",
      headerAlign: "left",
      align: "left",
      flex: 1, // Space columns equally
      cellClassName: "name-column--cell",
    },
    {
      field: "IPAddress",
      headerName: "IP",
      flex: 1, // Space columns equally
      cellClassName: "name-column--cell",
    },
    {
      field: "Port",
      headerName: "Port",
      flex: 1, // Space columns equally
      cellClassName: "name-column--cell",
    },
    {
      field: "OwnerName",
      headerName: "Owner",
      flex: 1, // Space columns equally
      cellClassName: "name-column--cell",
    },
    {
      field: "Option",
      headerName: "Option",
      flex: 1, // Space columns equally
      cellClassName: "name-column--cell",
    },
    {
      field: "Description",
      headerName: "Description",
      flex: 1, // Space columns equally
      cellClassName: "name-column--cell",
    },
    // {
    //   field: "action",
    //   headerName: "Action",
    //   flex: 1, // Space columns equally
    //   cellClassName: "name-column--cell",
    //   disableColumnMenu: true,
    //   renderCell: (params) => (
    //     <Box display="flex">
    //       <IconButton>
    //         <MdEdit
    //           style={{
    //             color: colors.blueAccents[500],
    //             width: "15px",
    //             height: "15px",
    //           }}
    //         />
    //       </IconButton>
    //       <IconButton>
    //         <BsTrash3Fill
    //           onClick={() => handleDelete(params.row.id)}
    //           style={{
    //             color: colors.blueAccents[500],
    //             width: "15px",
    //             height: "15px",
    //           }}
    //         />
    //       </IconButton>
    //     </Box>
    //   ),
    // },
  ];

  return (
    <Box sx={{ width: "100%", minHeight: "92vh", backgroundColor: "#f8f9f9" }}>
    <Box
      p={4}
      width="100%"
      height="92vh"
      sx={{
        "& .MuiDataGrid-root": {
          border: "none",
          fontSize: "14px",
          backgroundColor: "#fff",
          padding: "30px",
          borderRadius: "20px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        },

        "& .MuiDataGrid-columnHeaders": {
          backgroundColor: "#fff",
          fontWeight: "bold",
          borderTop: "3px solid #1c1c1c",
          color: "#1c1c1c",
          fontSize: "15px",
          minHeight: "56px !important",
          borderRadius: "0", // ✅ 헤더 radius 제거
        },

        "& .MuiDataGrid-iconSeparator": {
          display: "none !important", // ✅ 헤더 세로선 제거
        },

        "& .MuiDataGrid-columnHeaderTitle": {
          fontWeight: "bold",
        },

        "& .MuiDataGrid-cell": {
          color: "#1c1c1c",
          //borderBottom: "1px solid #ddd", // 행 구분선
          padding: "12px 8px",
        },

        "& .MuiDataGrid-row:hover": {
          backgroundColor: "#fafafa", // hover 효과
        },

        "& .MuiDataGrid-footerContainer": {
          borderTop: "1px solid #ddd",
          backgroundColor: "#fff",
          borderRadius: "0 0 8px 8px",
        },

        "& .MuiDataGrid-toolbarContainer": {
          backgroundColor: "#fff",
          //borderBottom: "1px solid #ddd",
        },
      }}
    >
      <DataGrid
        disableColumnSelector
        disableDensitySelector
        rows={Camera}
        columns={columns}
        components={{ Toolbar: CustomToolbar }}
        componentsProps={{
          panel: {
            anchorEl: filterButtonEl,
            placement: "bottom-end",
          },
          toolbar: {
            setFilterButtonEl,
            fetchCameras,
          },
        }}
      />
    </Box>
    </Box>
  );
};

export default CameraSettings;
