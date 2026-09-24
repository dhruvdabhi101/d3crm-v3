import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#252521", color: "white", fontSize: 103, fontWeight: 700, letterSpacing: -8, fontFamily: "Arial, sans-serif" }}>d3</div>,
    size,
  );
}
