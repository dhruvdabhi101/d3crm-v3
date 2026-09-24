import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "d3CRM — a quiet place for every hello";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#eeefe7", color: "#252521", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, fontWeight: 700 }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 16, background: "#252521", color: "white", letterSpacing: -2 }}>d3</span>
        <span>CRM</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 78, fontWeight: 600, lineHeight: 1.08, letterSpacing: -4 }}><span>A quiet place</span><span>for every hello.</span></div>
        <div style={{ color: "#6f7566", fontSize: 30 }}>Website forms and a thoughtful inbox.</div>
      </div>
      <div style={{ width: "100%", height: 2, background: "#d9ddcf" }} />
    </div>,
    size,
  );
}
