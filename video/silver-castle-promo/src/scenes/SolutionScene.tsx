import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { User, Briefcase, Wrench, Building2 } from "lucide-react";

const roles = [
  {
    icon: User,
    title: "דייר",
    desc: "הצביע, עקוב, השפיע",
    gradient: "linear-gradient(135deg, #3B82F6, #06B6D4)",
  },
  {
    icon: Briefcase,
    title: "גורם מלווה",
    desc: "נהל את התהליך בקלות",
    gradient: "linear-gradient(135deg, #8B5CF6, #A855F7)",
  },
  {
    icon: Wrench,
    title: "נותן שירות",
    desc: "הגש הצעות, נהל פרויקטים",
    gradient: "linear-gradient(135deg, #F59E0B, #F97316)",
  },
  {
    icon: Building2,
    title: "יזם",
    desc: "ראה את התמונה המלאה",
    gradient: "linear-gradient(135deg, #10B981, #4A8C5C)",
  },
];

export const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Wipe transition enter
  const wipeProgress = interpolate(frame, [0, 20], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title
  const titleScale = spring({
    frame: frame - 5,
    fps,
    from: 0.8,
    to: 1,
    config: { damping: 12 },
  });
  const titleOpacity = interpolate(frame, [5, 20], [0, 1], {
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
        clipPath: `inset(0 ${wipeProgress}% 0 0)`,
        opacity: exitOpacity,
      }}
    >
      {/* Accent glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "30%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,107,156,0.15) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Title */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 60,
          opacity: titleOpacity,
          transform: `scale(${titleScale})`,
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: "#8B6F47",
            letterSpacing: "6px",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          הפתרון
        </div>
        <h2
          style={{
            fontSize: 60,
            fontWeight: 800,
            color: "#FFFFFF",
            margin: 0,
          }}
        >
          פלטפורמה אחת לכולם
        </h2>
      </div>

      {/* Role cards */}
      <div
        style={{
          display: "flex",
          gap: 30,
          justifyContent: "center",
        }}
      >
        {roles.map((role, i) => {
          const delay = 30 + i * 20;
          const cardY = spring({
            frame: frame - delay,
            fps,
            from: 80,
            to: 0,
            config: { damping: 12, stiffness: 180 },
          });
          const cardOpacity = interpolate(frame, [delay, delay + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const cardScale = spring({
            frame: frame - delay,
            fps,
            from: 0.85,
            to: 1,
            config: { damping: 14 },
          });

          // Hover-like float effect
          const floatY =
            frame > delay + 30
              ? Math.sin((frame - delay) * 0.05 + i * 1.5) * 5
              : 0;

          const Icon = role.icon;

          return (
            <div
              key={i}
              style={{
                width: 230,
                padding: "35px 25px",
                borderRadius: 24,
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(20px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                opacity: cardOpacity,
                transform: `translateY(${cardY + floatY}px) scale(${cardScale})`,
              }}
            >
              <div
                style={{
                  width: 70,
                  height: 70,
                  borderRadius: 18,
                  background: role.gradient,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                }}
              >
                <Icon size={32} color="#FFFFFF" strokeWidth={1.5} />
              </div>
              <h3
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  margin: 0,
                }}
              >
                {role.title}
              </h3>
              <p
                style={{
                  fontSize: 16,
                  color: "rgba(255,255,255,0.6)",
                  margin: 0,
                  textAlign: "center",
                  lineHeight: 1.5,
                }}
              >
                {role.desc}
              </p>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
