import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { UserPlus, Vote, Home } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: UserPlus,
    title: "הצטרף",
    desc: "הירשם לפלטפורמה בקליק",
    gradient: "linear-gradient(135deg, #3B82F6, #06B6D4)",
  },
  {
    num: "02",
    icon: Vote,
    title: "הצביע ועקוב",
    desc: "השפיע על ההחלטות",
    gradient: "linear-gradient(135deg, #8B5CF6, #A855F7)",
  },
  {
    num: "03",
    icon: Home,
    title: "קבל דירה חדשה",
    desc: "תהליך שקוף ויעיל",
    gradient: "linear-gradient(135deg, #F59E0B, #F97316)",
  },
];

export const ProcessScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title
  const titleOpacity = interpolate(frame, [5, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const titleY = spring({
    frame: frame - 5,
    fps,
    from: -40,
    to: 0,
    config: { damping: 12 },
  });

  // Exit
  const exitOpacity = interpolate(frame, [300, 330], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Enter
  const enterOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: enterOpacity * exitOpacity,
      }}
    >
      {/* Title */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 80,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
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
          איך זה עובד?
        </div>
        <h2
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#FFFFFF",
            margin: 0,
          }}
        >
          3 שלבים פשוטים
        </h2>
      </div>

      {/* Steps */}
      <div
        style={{
          display: "flex",
          gap: 50,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {steps.map((step, i) => {
          const delay = 30 + i * 30;

          // Card entrance
          const cardScale = spring({
            frame: frame - delay,
            fps,
            from: 0,
            to: 1,
            config: { damping: 12, stiffness: 200 },
          });
          const cardOpacity = interpolate(frame, [delay, delay + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const cardY = spring({
            frame: frame - delay,
            fps,
            from: 60,
            to: 0,
            config: { damping: 14 },
          });

          // Arrow between steps
          const arrowOpacity = interpolate(
            frame,
            [delay + 20, delay + 30],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const arrowWidth = interpolate(
            frame,
            [delay + 20, delay + 35],
            [0, 60],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          // Number counter animation
          const numOpacity = interpolate(
            frame,
            [delay + 5, delay + 15],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );

          const Icon = step.icon;

          return (
            <React.Fragment key={i}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                  opacity: cardOpacity,
                  transform: `translateY(${cardY}px) scale(${cardScale})`,
                }}
              >
                {/* Step number */}
                <div
                  style={{
                    fontSize: 80,
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.06)",
                    position: "absolute",
                    marginTop: -60,
                    opacity: numOpacity,
                  }}
                >
                  {step.num}
                </div>

                {/* Icon circle */}
                <div
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: "50%",
                    background: step.gradient,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    boxShadow: "0 15px 40px rgba(0,0,0,0.3)",
                  }}
                >
                  <Icon size={44} color="#FFFFFF" strokeWidth={1.5} />
                </div>

                {/* Title & desc */}
                <h3
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: 18,
                    color: "rgba(255,255,255,0.5)",
                    margin: 0,
                    textAlign: "center",
                    maxWidth: 200,
                  }}
                >
                  {step.desc}
                </p>
              </div>

              {/* Arrow connector (not after last) */}
              {i < steps.length - 1 && (
                <div
                  style={{
                    opacity: arrowOpacity,
                    display: "flex",
                    alignItems: "center",
                    marginBottom: 60,
                  }}
                >
                  <div
                    style={{
                      width: arrowWidth,
                      height: 2,
                      background: "linear-gradient(90deg, rgba(139,111,71,0.6), rgba(139,111,71,0.1))",
                    }}
                  />
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderTop: "6px solid transparent",
                      borderBottom: "6px solid transparent",
                      borderRight: "10px solid rgba(139,111,71,0.6)",
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
