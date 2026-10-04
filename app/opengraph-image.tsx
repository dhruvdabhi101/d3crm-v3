import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "d3CRM: From enquiry to opportunity";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#f2f6f5", color: "#202927", fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, fontWeight: 700 }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 12, background: "#087f72", color: "white" }}>d3</span>
        <span>CRM</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 78, fontWeight: 600, lineHeight: 1.08 }}><span>From enquiry</span><span>to opportunity.</span></div>
        <div style={{ color: "#53645f", fontSize: 30 }}>Website forms. Shared inbox. Clear next steps.</div>
      </div>
      <div style={{ width: "100%", height: 3, background: "#ed8068" }} />
    </div>,
    size,
  );
}
