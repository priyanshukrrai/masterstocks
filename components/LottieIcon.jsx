"use client";
import Lottie from "lottie-react";
import pulse from "./pulse.json";

// Lottie micro-animation used as a live "pulse" indicator next to the market
// status label. Replace pulse.json with any Lottie animation you like.
export default function LottieIcon({ size = 22, animationData = pulse }) {
  const style = { width: size, height: size };
  return <Lottie animationData={animationData} loop autoplay style={style} />;
}
