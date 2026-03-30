import React from "react";
import { AbsoluteFill, interpolate } from "remotion";

export const AnimatedBackground: React.FC<{ frame: number }> = ({ frame }) => {
  // Slowly rotating gradient
  const rotation = interpolate(frame, [0, 1800], [0, 360]);
  const hueShift = interpolate(frame, [0, 1800], [0, 30]);

  return (
    <AbsoluteFill>
      {/* Deep base */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(${rotation}deg, #0D1B2A 0%, #1E3A5F 50%, #0D1B2A 100%)`,
        }}
      />

      {/* Floating orbs */}
      {[0, 1, 2, 3, 4].map((i) => {
        const speed = 0.3 + i * 0.15;
        const size = 300 + i * 100;
        const x = interpolate(
          frame,
          [0, 900, 1800],
          [
            -200 + i * 400,
            200 + i * 300 + Math.sin(i) * 200,
            -200 + i * 400,
          ]
        );
        const y = interpolate(
          frame,
          [0, 600, 1200, 1800],
          [
            100 + i * 150,
            300 + i * 100,
            50 + i * 200,
            100 + i * 150,
          ]
        );
        const opacity = interpolate(frame, [0, 300, 1500, 1800], [0, 0.08, 0.08, 0]);

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background:
                i % 2 === 0
                  ? `radial-gradient(circle, rgba(59,107,156,${opacity}) 0%, transparent 70%)`
                  : `radial-gradient(circle, rgba(139,111,71,${opacity}) 0%, transparent 70%)`,
              filter: "blur(60px)",
            }}
          />
        );
      })}

      {/* Grid pattern overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(90,141,184,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(90,141,184,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
          transform: `translateY(${interpolate(frame, [0, 1800], [0, -80])}px)`,
        }}
      />
    </AbsoluteFill>
  );
};
