import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { Castle, ArrowLeft, ExternalLink } from "lucide-react";

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Grand entrance
  const enterScale = spring({
    frame,
    fps,
    from: 0.6,
    to: 1,
    durationInFrames: 30,
    config: { damping: 12 },
  });
  const enterOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Logo
  const logoScale = spring({
    frame: frame - 10,
    fps,
    from: 0,
    to: 1,
    config: { damping: 10, stiffness: 200 },
  });

  // CTA button pulse
  const buttonDelay = 40;
  const buttonOpacity = interpolate(frame, [buttonDelay, buttonDelay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const buttonScale = spring({
    frame: frame - buttonDelay,
    fps,
    from: 0.8,
    to: 1,
    config: { damping: 10 },
  });

  // Pulse effect on button
  const pulseScale =
    frame > buttonDelay + 20
      ? 1 + Math.sin((frame - buttonDelay - 20) * 0.1) * 0.03
      : 1;

  // URL
  const urlDelay = 60;
  const urlOpacity = interpolate(frame, [urlDelay, urlDelay + 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const urlY = spring({
    frame: frame - urlDelay,
    fps,
    from: 20,
    to: 0,
    config: { damping: 12 },
  });

  // Tagline
  const tagDelay = 80;
  const tagOpacity = interpolate(frame, [tagDelay, tagDelay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glow animation
  const glowIntensity = interpolate(
    frame,
    [0, 60, 120, 180, 240],
    [0, 0.3, 0.5, 0.3, 0.5]
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: enterOpacity,
        transform: `scale(${enterScale})`,
      }}
    >
      {/* Big radial glow */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(139,111,71,${glowIntensity * 0.2}) 0%, rgba(59,107,156,${glowIntensity * 0.1}) 50%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      {/* Logo */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          marginBottom: 30,
        }}
      >
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 22,
            background: "linear-gradient(135deg, #8B6F47, #A6895F)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: "0 20px 60px rgba(139,111,71,0.4)",
          }}
        >
          <Castle size={52} color="#FFFFFF" strokeWidth={1.5} />
        </div>
      </div>

      {/* Silver Castle text */}
      <h2
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: "#FFFFFF",
          margin: 0,
          marginBottom: 10,
          opacity: interpolate(frame, [15, 30], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Silver Castle
      </h2>

      {/* CTA Button */}
      <div
        style={{
          marginTop: 30,
          opacity: buttonOpacity,
          transform: `scale(${buttonScale * pulseScale})`,
        }}
      >
        <div
          style={{
            padding: "20px 60px",
            borderRadius: 16,
            background: "linear-gradient(135deg, #8B6F47, #A6895F)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: "0 15px 40px rgba(139,111,71,0.4)",
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#FFFFFF",
            }}
          >
            הצטרף עכשיו
          </span>
          <ArrowLeft size={28} color="#FFFFFF" strokeWidth={2} />
        </div>
      </div>

      {/* URL */}
      <div
        style={{
          marginTop: 30,
          opacity: urlOpacity,
          transform: `translateY(${urlY}px)`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <ExternalLink size={18} color="#5A8DB8" strokeWidth={1.5} />
        <span
          style={{
            fontSize: 24,
            color: "#5A8DB8",
            fontWeight: 400,
            letterSpacing: "1px",
            direction: "ltr",
          }}
        >
          urbanflow.byclick.co.il
        </span>
      </div>

      {/* Tagline */}
      <div
        style={{
          marginTop: 50,
          opacity: tagOpacity,
          display: "flex",
          gap: 20,
          alignItems: "center",
        }}
      >
        {["פשוט", "שקוף", "יחד"].map((word, i) => (
          <React.Fragment key={word}>
            {i > 0 && (
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: "#8B6F47",
                }}
              />
            )}
            <span
              style={{
                fontSize: 22,
                fontWeight: 300,
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "3px",
              }}
            >
              {word}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Bottom decorative line */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          width: interpolate(frame, [100, 150], [0, 300], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          height: 2,
          background: "linear-gradient(90deg, transparent, #8B6F47, transparent)",
        }}
      />
    </AbsoluteFill>
  );
};
