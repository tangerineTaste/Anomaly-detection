import React, { useState, createContext, useContext } from "react";
import { ProSidebarProvider } from "react-pro-sidebar";
import { Box } from "@mui/material";
import MyProSidebar from "./MyProSidebar";

const SidebarContext = createContext({});

export const MyProSidebarProvider = ({ children }) => {
  const [sidebarRTL, setSidebarRTL] = useState(false);
  const [sidebarBackgroundColor, setSidebarBackgroundColor] = useState(undefined);
  const [sidebarImage, setSidebarImage] = useState(undefined);
  
  return (
    <ProSidebarProvider>
      <SidebarContext.Provider
        value={{
          sidebarBackgroundColor,
          setSidebarBackgroundColor,
          sidebarImage,
          setSidebarImage,
          sidebarRTL,
          setSidebarRTL,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          {/* Main content wrapper below topbar */}
          <Box
            sx={{
              display: "flex",
              flexDirection: sidebarRTL ? "row-reverse" : "row",
              marginTop: "70px", // Topbar 높이
              height: "calc(100vh - 76px)",
            }}
          >
            <MyProSidebar />
            <Box
              sx={{
                flex: 1,
                marginLeft: sidebarRTL ? 0 : "280px", // Sidebar 너비
                marginRight: sidebarRTL ? "280px" : 0,
                overflowY: "auto",
              }}
            >
              {children}
            </Box>
          </Box>
        </Box>
      </SidebarContext.Provider>
    </ProSidebarProvider>
  );
};

export const useSidebarContext = () => useContext(SidebarContext);