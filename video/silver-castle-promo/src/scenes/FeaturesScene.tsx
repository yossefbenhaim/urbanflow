import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { Vote, Gavel, FileText, Bell, MessageCircle, ShieldCheck } from "lucide-react";

const features = [
  { icon: Vote, label: "הצבעות דיגיטליות", color: "#3B82F6" },
  { icon: Gavel, label: "ניהול מכרזים", color: "#8B5CF6" },
  { icon: FileText, label: "מסמכים חכמים", color: "#06B6D4" },
  { icon: Bell, label: "עדכונים בזמן אמת", color: "#F59E0B" },
  { icon: MessageCircle, label: "צ'אט מובנה", color: "#10B981" },
  { icon: ShieldCheck, label: "אבטחה מתקדמת", color: "#8B6F47" },
];

export const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Zoom-in transition
  const enterScale = interpolate(frame, [0, 20], [0.8, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const enterOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title
  const titleOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exit
  const exitOpacity = interpolate(frame, [300, 330], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: enterOpacity * exitOpacity,
        transform: `scale(${enterScale})`,
      }}
    >
      {/* Title */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 70,
          opacity: titleOpacity,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: "#5A8DB8",
            letterSpacing: "6px",
            marginBottom: 12,
          }}
        >
          הפיצ'רים
        </div>
        <h2
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#FFFFFF",
            margin: 0,
          }}
        >
          הכל במקום אחד
        </h2>
      </div>

      {/* Feature grid - 3x2 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 280px)",
          gap: "30px",
          justifyContent: "center",
        }}
      >
        {features.map((feature, i) => {
          const row = Math.floor(i / 3);
          const col = i % 3;
          const delay = 25 + (row * 3 + col) * 10;

          const itemScale = spring({
            frame: frame - delay,
            fps,
            from: 0,
            to: 1,
            config: { damping: 12, stiffness: 200 },
          });
          const itemOpacity = interpolate(frame, [delay, delay + 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          // Reveal line under each card
          const lineWidth = interpolate(
            frame,
            [delay + 15, delay + 35],
            [0, 100],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          const Icon = feature.icon;

          return (
            <div
              key={i}
              style={{
                padding: "28px 24px",
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                gap: 18,
                opacity: itemOpacity,
                transform: `scale(${itemScale})`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Bottom accent line */}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  height: 3,
                  width: `${lineWidth}%`,
                  background: `linear-gradient(90deg, ${feature.color}, transparent)`,
                }}
              />

              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  backgroundColor: `${feature.color}18`,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <Icon size={28} color={feature.color} strokeWidth={1.5} />
              </div>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  color: "#FFFFFF",
                }}
              >
                {feature.label}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
