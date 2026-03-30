import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { HeroScene } from "./scenes/HeroScene";
import { ProblemScene } from "./scenes/ProblemScene";
import { SolutionScene } from "./scenes/SolutionScene";
import { FeaturesScene } from "./scenes/FeaturesScene";
import { ProcessScene } from "./scenes/ProcessScene";
import { StatsScene } from "./scenes/StatsScene";
import { CTAScene } from "./scenes/CTAScene";
import { AnimatedBackground } from "./scenes/AnimatedBackground";

// Scene timing (frames at 30fps)
// Scene 1: 0-5s = 0-150
// Scene 2: 5-12s = 150-360
// Scene 3: 12-22s = 360-660
// Scene 4: 22-32s = 660-960
// Scene 5: 32-42s = 960-1260
// Scene 6: 42-52s = 1260-1560
// Scene 7: 52-60s = 1560-1800

export const Promo: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0D1B2A",
        fontFamily: "'Heebo', sans-serif",
        direction: "rtl",
      }}
    >
      {/* Persistent animated background */}
      <AnimatedBackground frame={frame} />

      {/* Scene 1: Hero (0-5s) with overlap into scene 2 */}
      <Sequence from={0} durationInFrames={165}>
        <HeroScene />
      </Sequence>

      {/* Scene 2: Problem (5-12s) */}
      <Sequence from={135} durationInFrames={240}>
        <ProblemScene />
      </Sequence>

      {/* Scene 3: Solution (12-22s) */}
      <Sequence from={345} durationInFrames={330}>
        <SolutionScene />
      </Sequence>

      {/* Scene 4: Features (22-32s) */}
      <Sequence from={645} durationInFrames={330}>
        <FeaturesScene />
      </Sequence>

      {/* Scene 5: Process (32-42s) */}
      <Sequence from={945} durationInFrames={330}>
        <ProcessScene />
      </Sequence>

      {/* Scene 6: Stats (42-52s) */}
      <Sequence from={1245} durationInFrames={330}>
        <StatsScene />
      </Sequence>

      {/* Scene 7: CTA (52-60s) */}
      <Sequence from={1545} durationInFrames={255}>
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
