import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { Castle, Sparkles } from "lucide-react";

export const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo entrance - dramatic scale from center
  const logoScale = spring({
    frame,
    fps,
    from: 0,
    to: 1,
    durationInFrames: 25,
    config: { damping: 12, stiffness: 200 },
  });

  const logoRotate = spring({
    frame,
    fps,
    from: -15,
    to: 0,
    durationInFrames: 30,
    config: { damping: 15 },
  });

  // Title slide in
  const titleX = spring({
    frame: frame - 15,
    fps,
    from: 100,
    to: 0,
    durationInFrames: 25,
    config: { damping: 14 },
  });

  const titleOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtitle stagger
  const subtitleOpacity = interpolate(frame, [40, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtitleY = spring({
    frame: frame - 40,
    fps,
    from: 40,
    to: 0,
    durationInFrames: 25,
    config: { damping: 12 },
  });

  // Sparkle particles
  const sparkleOpacity = interpolate(frame, [50, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Exit animation
  const exitScale = interpolate(frame, [130, 165], [1, 1.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitOpacity = interpolate(frame, [130, 165], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Glow pulse
  const glowPulse = interpolate(frame, [0, 30, 60, 90, 120], [0, 0.6, 0.3, 0.5, 0.3]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        opacity: exitOpacity,
        transform: `scale(${exitScale})`,
      }}
    >
      {/* Radial glow behind logo */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(139,111,71,${glowPulse * 0.3}) 0%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />

      {/* Logo icon */}
      <div
        style={{
          transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
          marginBottom: 30,
          position: "relative",
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 24,
            background: "linear-gradient(135deg, #8B6F47 0%, #A6895F 50%, #8B6F47 100%)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            boxShadow: "0 20px 60px rgba(139,111,71,0.4)",
          }}
        >
          <Castle size={64} color="#FFFFFF" strokeWidth={1.5} />
        </div>

        {/* Sparkle decorations */}
        {sparkleOpacity > 0 && (
          <>
            <Sparkles
              size={24}
              color="#A6895F"
              style={{
                position: "absolute",
                top: -20,
                right: -25,
                opacity: sparkleOpacity,
              }}
            />
            <Sparkles
              size={18}
              color="#5A8DB8"
              style={{
                position: "absolute",
                bottom: -15,
                left: -20,
                opacity: sparkleOpacity * 0.7,
              }}
            />
          </>
        )}
      </div>

      {/* Title */}
      <div
        style={{
          transform: `translateX(${titleX}px)`,
          opacity: titleOpacity,
        }}
      >
        <h1
          style={{
            fontSize: 88,
            fontWeight: 800,
            color: "#FFFFFF",
            margin: 0,
            letterSpacing: "-2px",
            textAlign: "center",
            textShadow: "0 4px 30px rgba(0,0,0,0.3)",
          }}
        >
          Silver Castle
        </h1>
      </div>

      {/* Subtitle tagline */}
      <div
        style={{
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          marginTop: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 30,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {["פשוט", "שקוף", "יחד"].map((word, i) => {
            const wordDelay = 45 + i * 8;
            const wordOpacity = interpolate(
              frame,
              [wordDelay, wordDelay + 15],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            const wordScale = spring({
              frame: frame - wordDelay,
              fps,
              from: 0.5,
              to: 1,
              config: { damping: 10 },
            });

            return (
              <React.Fragment key={word}>
                {i > 0 && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: "#8B6F47",
                      opacity: wordOpacity,
                    }}
                  />
                )}
                <span
                  style={{
                    fontSize: 36,
                    fontWeight: 300,
                    color: "#A6895F",
                    opacity: wordOpacity,
                    transform: `scale(${wordScale})`,
                    display: "inline-block",
                    letterSpacing: "4px",
                  }}
                >
                  {word}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Decorative line */}
      <div
        style={{
          marginTop: 40,
          height: 2,
          background: "linear-gradient(90deg, transparent, #8B6F47, transparent)",
          width: interpolate(frame, [60, 90], [0, 400], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      />
    </AbsoluteFill>
  );
};
