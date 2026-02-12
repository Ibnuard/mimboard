"use client";

import React, { useState, useEffect } from "react";
import {
  ONBOARDING_STORAGE_KEY,
  ONBOARDING_DELAY_MS,
  ONBOARDING_STEPS,
} from "@/lib/constants";

const Onboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!done) {
      const timer = setTimeout(() => setVisible(true), ONBOARDING_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  };

  if (!visible) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const isLast = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleDismiss}
        style={{ animation: "fadeIn 0.3s ease-out" }}
      />

      {/* Card */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center"
        style={{ animation: "scaleIn 0.3s ease-out" }}
      >
        {/* Skip button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
        >
          Skip
        </button>

        {/* Step indicator dots */}
        <div className="flex justify-center gap-2 mb-6">
          {ONBOARDING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "w-6 bg-yellow-500"
                  : i < currentStep
                    ? "w-1.5 bg-yellow-300"
                    : "w-1.5 bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div
          className="text-5xl mb-4"
          style={{ animation: "bounceIn 0.4s ease-out" }}
          key={currentStep} // Re-trigger animation
        >
          {step.icon}
        </div>

        {/* Title */}
        <h2 className="text-xl font-black text-gray-900 tracking-tight mb-2 font-mono">
          {step.title}
        </h2>

        {/* Description */}
        <p className="text-gray-500 text-sm mb-8">{step.desc}</p>

        {/* Action button */}
        <button
          onClick={handleNext}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-full transition-all active:scale-95 text-sm uppercase tracking-widest border-2 border-black"
        >
          {isLast ? "Mulai!" : "Lanjut"}
        </button>

        {/* Step count */}
        <p className="text-gray-400 text-xs mt-3 font-mono">
          {currentStep + 1} / {ONBOARDING_STEPS.length}
        </p>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          60% {
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default Onboarding;
