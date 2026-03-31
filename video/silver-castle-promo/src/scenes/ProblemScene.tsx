import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { FileWarning, PhoneOff, HelpCircle, AlertTriangle, MessageSquareX, FolderSearch } from "lucide-react";

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Scene enter via clip-path circle
  const clipProgress = interpolate(frame, [0, 25], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title
  const titleOpacity = interpolate(frame, [10, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = spring({
    frame: frame - 10,
    fps,
    from: -50,
    to: 0,
    config: { damping: 12 },
  });

  // Problem icons
  const problems = [
    { icon: FileWarning, label: "מסמכים אבודים", color: "#E74C3C" },
    { icon: PhoneOff, label: "שיחות אינסופיות", color: "#E67E22" },
    { icon: HelpCircle, label: "חוסר מידע", color: "#F39C12" },
    { icon: AlertTriangle, label: "עיכובים", color: "#E74C3C" },
    { icon: MessageSquareX, label: "תקשורת לקויה", color: "#E67E22" },
    { icon: FolderSearch, label: "בלגן מסמכים", color: "#F39C12" },
  ];

  // Exit
  const exitOpacity = interpolate(frame, [210, 240], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitScale = interpolate(frame, [210, 240], [1, 0.9], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Shake effect for drama
  const shakeX = frame > 40 && frame < 50 ? Math.sin(frame * 3) * 3 : 0;

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        clipPath: `circle(${clipProgress}% at 50% 50%)`,
        opacity: exitOpacity,
        transform: `scale(${exitScale}) translateX(${shakeX}px)`,
      }}
    >
      {/* Red-tinted overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, rgba(231,76,60,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Question title */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
          marginBottom: 60,
        }}
      >
        <h2
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#FFFFFF",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          הבניין שלכם מתחדש?
        </h2>
        <p
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.5)",
            marginTop: 10,
            fontWeight: 300,
          }}
        >
          בואו נדבר על מה שבאמת קורה...
        </p>
      </div>

      {/* Problem icons grid */}
      <div
        style={{
          display: "flex",
          gap: 40,
          flexWrap: "wrap",
          justifyContent: "center",
          maxWidth: 900,
        }}
      >
        {problems.map((problem, i) => {
          const delay = 40 + i * 12;
          const itemScale = spring({
            frame: frame - delay,
            fps,
            from: 0,
            to: 1,
            config: { damping: 10, stiffness: 300 },
          });
          const itemOpacity = interpolate(frame, [delay, delay + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          // Floating wobble
          const wobble =
            frame > delay + 15
              ? Math.sin((frame - delay) * 0.08 + i) * 4
              : 0;

          const Icon = problem.icon;

          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                opacity: itemOpacity,
                transform: `scale(${itemScale}) translateY(${wobble}px)`,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  backgroundColor: "rgba(231,76,60,0.12)",
                  border: `1px solid ${problem.color}33`,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Icon size={36} color={problem.color} strokeWidth={1.5} />
              </div>
              <span
                style={{
                  fontSize: 18,
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: 400,
                }}
              >
                {problem.label}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
