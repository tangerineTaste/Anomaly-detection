import React from "react";
import { useEffect } from "react";
import { Box, useTheme, Toolbar } from "@mui/material";
import {
  DataGrid,
  GridToolbarQuickFilter,
  GridToolbarContainer,
  GridToolbarFilterButton,
} from "@mui/x-data-grid";
import { tokens } from "../../theme";
import { mockDataIncidents } from "../../data/mockData";
import { AiFillFire } from "react-icons/ai";
import { FaGun } from "react-icons/fa6";
import { FaRegEye } from "react-icons/fa";
import { Typography } from "@mui/material";
import { useState } from "react";
import { useSelector } from "react-redux";

import { Modal, Button } from "@mui/material";

// Custom toolbar for the data grid
function CustomToolbar({ setFilterButtonEl }) {
  return (
    <Box
      sx={{ flexGrow: 1, borderRadius: "8px 8px 0 0" }}
      backgroundColor={"#fefffe"}
    >
      <Toolbar variant="dense" disableGutters>
        <Box p={2} display={"flex"} alignItems={"center"}>
          <FaRegEye style={{ fontSize: "2rem" }} />
          <Typography variant="h6" p={2} fontWeight={"bold"}>
            All Incidents
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />
        <GridToolbarContainer
          sx={{ p: 1, display: "flex", alignItems: "center" }}
        >
          <Box p={2}>
            <GridToolbarQuickFilter
              variant="outlined"
              size={"small"}
              sx={{ padding: "4", borderColor: "#DCDDDD", color: "#202020" }}
            />
          </Box>
          <Box p={2}>
            <GridToolbarFilterButton
              variant="outlined"
              sx={{
                padding: "4",
                height: "3.125em",
                borderColor: "#bcbdbd",
                color: "#202020",
                "&:hover": { borderColor: "black" },
              }}
              ref={setFilterButtonEl}
            />
          </Box>
        </GridToolbarContainer>
      </Toolbar>
    </Box>
  );
}

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5000/user/incidents");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
          const incidentsWithId = data.incidents.map((incident) => ({
            ...incident,
            id: incident.incidents_id,
          }));
          setIncidents(incidentsWithId);
        } else {
          throw new Error("Fetching incidents failed");
        }
      } catch (error) {
        console.error("Error fetching incidents:", error);
      }
    };

    fetchIncidents();
  }, []);
  const theme = useTheme(); // Access theme and colors from Material-UI
  const colors = tokens;

  // const approvedIncidents = useSelector(
  //   (state) => state.incidents.approvedIncidents
  // );

  const [filterButtonEl, setFilterButtonEl] = useState(null); // State to track the filter button element
  // Combine mock data with the approved incidents from the Redux store
  // const allIncidents = [...mockDataIncidents, ...approvedIncidents];

  // Columns configuration for the data grid
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewClick = (incident) => {
    setSelectedIncident(incident);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedIncident(null);
  };

  const columns = [

    {
      field: "date",
      headerName: "Date/Time",
      flex: 1,
      disableColumnMenu: true,
      cellClassName: "name-column--cell",
    },
    {
      field: "type",
      headerName: "Type",
      type: "number",
      headerAlign: "left",
      align: "left",
      disableColumnMenu: true,
      cellClassName: "name-column--cell",
    },


    {
      field: "camera",
      headerName: "Camera Location",
      flex: 1,
      disableColumnMenu: true,
      cellClassName: "name-column--cell",
    },
    {
      field: "status",
      headerName: "Status",
      renderCell: (params) => (
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              color:
                params.value === "Active"
                  ? "green"
                  : params.value === "Reviewed"
                  ? "blue"
                  : "inherit", // Use the default color if none of the conditions match
            }}
          >
            {params.value}
          </span>
        </div>
      ),
      flex: 1,
      disableColumnMenu: true,
      cellClassName: "name-column--cell",
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          variant="contained"
          color="primary"
          size="small"
          onClick={() => handleViewClick(params.row)}
        >
          View
        </Button>
      ),
      flex: 0.5,
      disableColumnMenu: true,
    },
  ];
  return (
    <Box backgroundColor={colors.primary[500]} p={3} minHeight={"100vh"}>
      <Box
        p={1}
        m="8px 0 0 0"
        width="100%"
        height="80vh"
        sx={{
          "& .MuiDataGrid-root": {
            border: "none",
            fontSize: "14px",
            "& .MuiDataGrid-cell:focus": {
              outline: "none", // Remove the focus outline
            },
          },

          "& .MuiDataGrid-cell": {
            borderBottom: "none",
          },
          "& .name-column--cell": {
            backgroundColor: colors.secondary[500],
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.secondary[500],
            borderBottom: "none",
            color: colors.blackAccents[300],
          },
          "& .MuiDataGrid-columnHeaderTitle": {
            fontSize: "15px",
          },
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: colors.secondary[500],
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "none",
            backgroundColor: colors.secondary[500],
            borderRadius: "0 0 8px 8px",
          },
          "& .MuiCheckbox-root": {
            color: `${colors.primary[500]} !important`,
          },
          "& .MuiDataGrid-toolbarContainer .MuiButton-text": {
            color: `${colors.blackAccents[100]} !important`,
            fontSize: "14px",
          },
        }}
      >
        <DataGrid
          disableColumnSelector
          disableDensitySelector
          rows={incidents}
          columns={columns}
          components={{ Toolbar: CustomToolbar }}
          componentsProps={{
            panel: {
              anchorEl: filterButtonEl,
              placement: "bottom-end",
            },
            toolbar: {
              setFilterButtonEl,
            },
          }}
        />
      </Box>

      {selectedIncident && (
        <Modal
          open={isModalOpen}
          onClose={handleCloseModal}
          aria-labelledby="incident-details-title"
        >
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 400,
              bgcolor: 'background.paper',
              border: '2px solid #000',
              boxShadow: 24,
              p: 4,
            }}
          >
            <Typography id="incident-details-title" variant="h6" component="h2">
              Incident Details
            </Typography>
            {selectedIncident.image_path && (
              <img
                src={`http://127.0.0.1:5000/${selectedIncident.image_path}`}
                alt="Incident"
                style={{ width: '100%', marginTop: '16px' }}
              />
            )}
            <Typography sx={{ mt: 2 }}>
              <strong>ID:</strong> {selectedIncident.id}
            </Typography>
            <Typography>
              <strong>Date:</strong> {selectedIncident.date}
            </Typography>
            <Typography>
              <strong>Type:</strong> {selectedIncident.type}
            </Typography>
            <Typography>
              <strong>Module:</strong> {selectedIncident.module}
            </Typography>
            <Typography>
              <strong>Camera:</strong> {selectedIncident.camera}
            </Typography>
            <Typography>
              <strong>Status:</strong> {selectedIncident.status}
            </Typography>
            <Button onClick={handleCloseModal} sx={{ mt: 2 }}>
              Close
            </Button>
          </Box>
        </Modal>
      )}
    </Box>
  );
};

export default Incidents;
