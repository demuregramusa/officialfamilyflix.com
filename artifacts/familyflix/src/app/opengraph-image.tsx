import { ImageResponse } from "next/og";

export const alt = "FamilyFlix — Free movies and TV for the whole family";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #08060f 0%, #1b1038 58%, #3a1b7a 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              width: 84,
              height: 84,
              borderRadius: 20,
              background: "#6d28ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                marginLeft: 7,
                borderTop: "17px solid transparent",
                borderBottom: "17px solid transparent",
                borderLeft: "27px solid #ffffff",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 62,
              fontWeight: 900,
              letterSpacing: "-0.05em",
            }}
          >
            family
            <span style={{ color: "#b79dff" }}>flix</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              maxWidth: 900,
              fontSize: 58,
              fontWeight: 900,
              lineHeight: 1.04,
              letterSpacing: "-0.04em",
            }}
          >
            Free movies and TV for the whole family.
          </div>
          <div style={{ display: "flex", fontSize: 27, color: "rgba(255,255,255,0.66)" }}>
            No subscription. No credit card. Always free.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <span>familyflix.demuregram.com</span>
          <span>© 2026 FamilyFlix Media, Inc.</span>
        </div>
      </div>
    ),
    size,
  );
}
