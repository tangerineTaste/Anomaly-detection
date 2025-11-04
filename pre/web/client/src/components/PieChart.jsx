import React from "react";
import { ResponsivePie } from "@nivo/pie";
import { tokens } from "../theme";

const CenterText = ({ dataWithArc, centerX, centerY, data }) => {
  const total = dataWithArc.reduce((sum, data) => sum + data.value, 0);

  return (
    <text
      x={centerX}
      y={centerY}
      textAnchor="middle"
      dominantBaseline="central"
    >
      <tspan fontSize={36} fontWeight="bold" x={centerX} dy="-0.2em" fill="#2563EB">
        {total}%
      </tspan>
      <tspan fontSize={13} x={centerX} dy="1.8em" fill="#94A3B8">
        Total Sales
      </tspan>
    </text>
  );
};

const PieChart = ({ data, isDashboard = false }) => {
  const colors = tokens;
  return (
    <ResponsivePie
      data={data}
      layers={["arcs", CenterText]}
      colors={{ datum: "data.color" }}
      theme={{
        axis: {
          domain: {
            line: {
              stroke: colors.secondary[500],
            },
          },
          legend: {
            text: {
              fill: colors.secondary[100],
            },
          },
          ticks: {
            line: {
              stroke: colors.secondary[100],
              strokeWidth: 1,
            },
            text: {
              fill: colors.secondary[100],
            },
          },
        },
        legends: {
          text: {
            fill: colors.orangeAccents[100],
          },
        },
      }}
      margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
      innerRadius={0.6}
      padAngle={2}
      cornerRadius={3}
      activeOuterRadiusOffset={8}
      borderWidth={0}
      borderColor={{
        from: "color",
        modifiers: [["darker", 0.2]],
      }}
      enableArcLinkLabels={false}
      arcLinkLabelsSkipAngle={10}
      arcLinkLabelsTextColor={colors.orangeAccents[100]}
      arcLinkLabelsThickness={2}
      arcLinkLabelsColor={{ from: "color" }}
      enableArcLabels={false}
      arcLabelsRadiusOffset={0.4}
      arcLabelsSkipAngle={7}
      arcLabelsTextColor={{
        from: "color",
        modifiers: [["darker", 2]],
      }}
    />
  );
};

export default PieChart;