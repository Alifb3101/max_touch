import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = SITE.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function Sparkle() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24">
      <path d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z" fill="#B08D57" />
    </svg>
  );
}

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(ellipse 70% 70% at 50% 45%, #FFFFFF 0%, #F3DCD4 55%, #FBF3EA 100%)",
          color: "#6B2737",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22, fontSize: 34, color: "#B08D57", letterSpacing: 14, textTransform: "uppercase" }}>
          <Sparkle />
          Max Touch
          <Sparkle />
        </div>
        <div style={{ marginTop: 28, fontSize: 92, fontStyle: "italic" }}>Makeup Kits</div>
        <div style={{ fontSize: 92, fontStyle: "italic" }}>&amp; Gift Kits</div>
        <div style={{ marginTop: 34, fontSize: 26, color: "#5A4A42", letterSpacing: 6, textTransform: "uppercase" }}>
          Big · Medium · Small
        </div>
      </div>
    ),
    size,
  );
}
