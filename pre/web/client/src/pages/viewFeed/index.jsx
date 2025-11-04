// import React, { useState, useEffect} from "react";
// import { Grid, Paper} from "@mui/material";
import { Box } from "@mui/material";
import { tokens } from "../../theme";
import CameraFeedProcessor from "./CameraFeedProcessor";

const CameraList = () => {
  // const [cameras, setCameras] = useState([]);

  // const fetchCameras = async () => {
  //   try {
  //     const response = await fetch(
  //       "http://127.0.0.1:5000/user/settings/camsettings"
  //     );
  //     if (!response.ok) {
  //       throw new Error(`HTTP error! status: ${response.status}`);
  //     }

  //     const result = await response.json();
  //     console.log(result);
  //     if (result.success && Array.isArray(result.camera)) {
  //       setCameras(result.camera);
  //     } else {
  //       throw new Error("Invalid data structure");
  //     }
  //   } catch (error) {
  //     console.error("There was an error fetching camera:", error);
  //   }
  // };

  // useEffect(() => {
  //   fetchCameras();
  // }, []); // Dependencies array

  const colors = tokens;
  return (
    <Box backgroundColor={colors.primary[500]} p={3} minHeight={"100vh"}>
     {/* 
     <Grid container spacing={2}>
        {cameras.map((camera) => (
          <Grid item key={camera.id} xs={12} sm={6} md={4} lg={3}>
            <Paper
              elevation={3}
              style={{ padding: "20px", textAlign: "center" }}
            >
              <strong>{camera.CameraName}</strong>
              <br />
              {camera.Description}
              <br />
              */}
              {/* CameraFeedProcessor 컴포넌트를 렌더링하고 camera 데이터를 prop으로 전달 */}
              <CameraFeedProcessor />
              {/* 
            </Paper>
          </Grid>
        ))}
      </Grid>
      */}
    </Box>
  );
};

export default CameraList;
