import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { Building, Users, Star, Headphones } from "lucide-react";

const stats = [
  { icon: Building, value: "500+", label: "בניינים", color: "#3B82F6" },
  { icon: Users, value: "12,000+", label: "דיירים", color: "#8B5CF6" },
  { icon: Star, value: "98%", label: "שביעות רצון", color: "#F59E0B" },
  { icon: Headphones, value: "24/7", label: "תמיכה", color: "#10B981" },
];

// Animated counter component
const AnimatedNumber: React.FC<{
  value: string;
  frame: number;
  startFrame: number;
  fps: number;
}> = ({ value, frame, startFrame, fps }) => {
  // Extract numeric part
  const numMatch = value.match(/[\d,]+/);
  const prefix = value.match(/^[^\d]*/)?.[0] || "";
  const suffix = value.match(/[^\d,]*$/)?.[0] || "";

  if (!numMatch) return <>{value}</>;

  const targetNum = parseInt(numMatch[0].replace(/,/g, ""));
  const progress = interpolate(frame, [startFrame, startFrame + 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const currentNum = Math.round(targetNum * progress);
  const formatted = currentNum.toLocaleString();

  return (
    <>
      {prefix}
      {formatted}
      {suffix}
    </>
  );
};

export const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Enter
  const enterOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title
  const titleOpacity = interpolate(frame, [5, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exit
  const exitOpacity = interpolate(frame, [300, 330], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitScale = interpolate(frame, [300, 330], [1, 1.1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: enterOpacity * exitOpacity,
        transform: `scale(${exitScale})`,
      }}
    >
      {/* Title */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 80,
          opacity: titleOpacity,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: "#8B6F47",
            letterSpacing: "6px",
            marginBottom: 12,
          }}
        >
          המספרים מדברים
        </div>
        <h2
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#FFFFFF",
            margin: 0,
          }}
        >
          סומכים עלינו
        </h2>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "flex",
          gap: 50,
          justifyContent: "center",
        }}
      >
        {stats.map((stat, i) => {
          const delay = 25 + i * 18;

          const cardScale = spring({
            frame: frame - delay,
            fps,
            from: 0.5,
            to: 1,
            config: { damping: 12, stiffness: 180 },
          });
          const cardOpacity = interpolate(frame, [delay, delay + 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          // Pulse ring
          const ringScale = interpolate(
            frame,
            [delay + 20, delay + 50],
            [1, 1.5],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const ringOpacity = interpolate(
            frame,
            [delay + 20, delay + 50],
            [0.4, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          const Icon = stat.icon;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 20,
                opacity: cardOpacity,
                transform: `scale(${cardScale})`,
                width: 220,
              }}
            >
              {/* Icon with pulse ring */}
              <div style={{ position: "relative" }}>
                {/* Pulse ring */}
                <div
                  style={{
                    position: "absolute",
                    inset: -10,
                    borderRadius: "50%",
                    border: `2px solid ${stat.color}`,
                    opacity: ringOpacity,
                    transform: `scale(${ringScale})`,
                  }}
                />
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    backgroundColor: `${stat.color}18`,
                    border: `2px solid ${stat.color}40`,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Icon size={36} color={stat.color} strokeWidth={1.5} />
                </div>
              </div>

              {/* Animated number */}
              <div
                style={{
                  fontSize: 52,
                  fontWeight: 900,
                  color: "#FFFFFF",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <AnimatedNumber
                  value={stat.value}
                  frame={frame}
                  startFrame={delay + 10}
                  fps={fps}
                />
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: 22,
                  color: "rgba(255,255,255,0.6)",
                  fontWeight: 400,
                }}
              >
                {stat.label}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
