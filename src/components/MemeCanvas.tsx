"use client";

import React, { useEffect, useState, useRef } from "react";
import { Stage, Layer, Line, Rect } from "react-konva";
import {
  GRID_SIZE,
  GRID_STEP,
  MAX_ZOOM,
  ZOOM_SPEED,
  DRAG_VISIBLE_RATIO,
  APP_NAME,
  APP_TAGLINE,
} from "@/lib/constants";

interface MemeCanvasProps {
  memes: any[];
  onCanvasClick: (x: number, y: number) => void;
  selectedCoords: { x: number; y: number } | null;
}

// ---- HoverTooltip: fixed-position tooltip, rendered outside transformed container ----
interface HoverTooltipProps {
  meme: any;
  screenX: number;
  screenY: number;
}

const HoverTooltip: React.FC<HoverTooltipProps> = ({
  meme,
  screenX,
  screenY,
}) => (
  <div
    style={{
      position: "fixed",
      left: screenX,
      top: screenY - 16,
      transform: "translate(-50%, -100%)",
      pointerEvents: "none",
      zIndex: 9999,
      whiteSpace: "nowrap",
    }}
  >
    <div
      style={{
        background: "rgba(0,0,0,0.88)",
        color: "#fbbf24",
        fontFamily: "monospace",
        fontSize: "12px",
        fontWeight: "bold",
        padding: "5px 10px",
        borderRadius: "8px",
        backdropFilter: "blur(6px)",
        border: "1px solid rgba(251,191,36,0.35)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        letterSpacing: "0.02em",
      }}
    >
      {meme.message}
    </div>
    {/* Arrow */}
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        borderTop: "6px solid rgba(0,0,0,0.88)",
        margin: "0 auto",
      }}
    />
  </div>
);

// ---- MemeCanvas ----
const MemeCanvas: React.FC<MemeCanvasProps> = ({
  memes,
  onCanvasClick,
  selectedCoords,
}) => {
  const [stageSpec, setStageSpec] = useState({
    width: 0,
    height: 0,
    scale: 0, // Start at 0 (hidden) until we calculate proper fill scale
    x: 0,
    y: 0,
  });
  const [isReady, setIsReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const minScaleRef = useRef(1); // Minimum zoom-out scale (fit-to-screen)
  const containerRef = useRef<HTMLDivElement>(null);
  const memesContainerRef = useRef<HTMLDivElement>(null);

  // Hover tooltip state (message memes only, no pointer-events needed)
  const [hoveredMeme, setHoveredMeme] = useState<any | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  // Keep stageSpec in a ref so mousemove handler always has fresh values
  const stageSpecRef = useRef(stageSpec);

  // Sync the HTML overlay container with Stage transform
  const syncOverlayTransform = (x: number, y: number, scale: number) => {
    if (memesContainerRef.current) {
      memesContainerRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }
  };

  // Keep stageSpecRef in sync
  useEffect(() => {
    stageSpecRef.current = stageSpec;
  }, [stageSpec]);

  // Mousemove handler: convert screen coords → board coords, find hovered meme
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { x: stX, y: stY, scale } = stageSpecRef.current;
    if (scale === 0) return;
    // Board coordinates of the cursor
    const boardX = (e.clientX - stX) / scale;
    const boardY = (e.clientY - stY) / scale;

    // Find topmost meme with a message that contains this point
    // Iterate in reverse so the visually topmost (last rendered) wins
    const memesWithMsg = memes.filter((m) => !!m.message);
    let found: any = null;
    for (let i = memesWithMsg.length - 1; i >= 0; i--) {
      const m = memesWithMsg[i];
      if (
        boardX >= m.x &&
        boardX <= m.x + m.width &&
        boardY >= m.y &&
        boardY <= m.y + m.height
      ) {
        found = m;
        break;
      }
    }
    setHoveredMeme(found);
    if (found) setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => setHoveredMeme(null);

  // Calculate the "fit-to-screen" scale
  const calcFitScale = (w: number, h: number) => {
    return Math.min(w / GRID_SIZE, h / GRID_SIZE);
  };

  // Initial Center & Fit - zoom IN to fill viewport
  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Use Math.max so the board FILLS the viewport (covers it entirely)
      const fillScale = Math.max(w / GRID_SIZE, h / GRID_SIZE);
      // Use Math.min as the minimum zoom-out (board fits inside viewport)
      const fitScale = calcFitScale(w, h);
      minScaleRef.current = fitScale;

      const x = (w - GRID_SIZE * fillScale) / 2;
      const y = (h - GRID_SIZE * fillScale) / 2;

      setStageSpec({
        width: w,
        height: h,
        scale: fillScale,
        x: x,
        y: y,
      });
      // Initial sync
      syncOverlayTransform(x, y, fillScale);
      setIsReady(true);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    if (!hasInteracted) setHasInteracted(true);
    const stage = e.target.getStage();
    const scaleBy = ZOOM_SPEED;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // Limit zoom: can't zoom out beyond fit-to-screen, can't zoom in beyond 10x
    const minScale = minScaleRef.current;
    if (newScale < minScale) newScale = minScale;
    if (newScale > MAX_ZOOM) newScale = MAX_ZOOM;

    const newX = pointer.x - mousePointTo.x * newScale;
    const newY = pointer.y - mousePointTo.y * newScale;

    // Apply drag bounds to the new position after zoom
    const bounded = clampPosition(
      newX,
      newY,
      newScale,
      stageSpec.width,
      stageSpec.height,
    );

    setStageSpec((prev) => ({
      ...prev,
      scale: newScale,
      x: bounded.x,
      y: bounded.y,
    }));
    // Sync immediately for smooth zoom
    syncOverlayTransform(bounded.x, bounded.y, newScale);
  };

  // Clamp position so at least 30% of the board is visible
  const clampPosition = (
    x: number,
    y: number,
    scale: number,
    viewW: number,
    viewH: number,
  ) => {
    const scaledW = GRID_SIZE * scale;
    const scaledH = GRID_SIZE * scale;
    const marginX = scaledW * DRAG_VISIBLE_RATIO;
    const marginY = scaledH * DRAG_VISIBLE_RATIO;

    const minX = -(scaledW - marginX);
    const maxX = viewW - marginX;
    const minY = -(scaledH - marginY);
    const maxY = viewH - marginY;

    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  };

  const handleStageClick = (e: any) => {
    if (!hasInteracted) setHasInteracted(true);
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();

    if (pointerPos) {
      const rawX = (pointerPos.x - stageSpec.x) / stageSpec.scale;
      const rawY = (pointerPos.y - stageSpec.y) / stageSpec.scale;

      const snappedX = Math.floor(rawX / GRID_STEP) * GRID_STEP;
      const snappedY = Math.floor(rawY / GRID_STEP) * GRID_STEP;

      if (
        snappedX >= 0 &&
        snappedX <= GRID_SIZE - GRID_STEP &&
        snappedY >= 0 &&
        snappedY <= GRID_SIZE - GRID_STEP
      ) {
        onCanvasClick(snappedX, snappedY);
      }
    }
  };

  // Generate Grid Lines
  const gridLines = [];
  for (let i = 0; i <= GRID_SIZE; i += GRID_STEP) {
    gridLines.push(
      <Line
        key={`v-${i}`}
        points={[i, 0, i, GRID_SIZE]}
        stroke="#e5e7eb"
        strokeWidth={1}
        opacity={0.5}
      />,
    );
    gridLines.push(
      <Line
        key={`h-${i}`}
        points={[0, i, GRID_SIZE, i]}
        stroke="#e5e7eb"
        strokeWidth={1}
        opacity={0.5}
      />,
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-screen bg-gray-50 overflow-hidden relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Watermark - dynamic positioning */}
      <div
        className={`fixed z-10 pointer-events-none transition-all duration-700 ease-in-out flex flex-col ${
          hasInteracted
            ? "top-6 left-6 items-start opacity-100" // Fully opaque in top-left
            : "inset-0 items-center justify-center opacity-100" // Fully opaque in center
        }`}
      >
        <h1
          className={`font-bold select-none font-mono whitespace-nowrap transition-all duration-700 ${
            hasInteracted ? "text-gray-400" : "text-gray-300/40"
          }`}
          style={{
            fontSize: hasInteracted ? "1.5rem" : "clamp(1.2rem, 6vw, 4.5rem)",
          }}
        >
          {APP_NAME}
        </h1>
        <p
          className={`font-mono font-medium select-none tracking-widest uppercase transition-all duration-700 ${
            hasInteracted
              ? "text-[10px] text-left mt-0 ml-1 text-gray-500"
              : "text-xs md:text-sm text-center px-4 mt-2 text-gray-400/60"
          }`}
        >
          {APP_TAGLINE}
        </p>
      </div>

      <Stage
        width={stageSpec.width}
        height={stageSpec.height}
        draggable
        x={stageSpec.x}
        y={stageSpec.y}
        scaleX={stageSpec.scale}
        scaleY={stageSpec.scale}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onDragStart={() => {
          setIsDragging(true);
          if (!hasInteracted) setHasInteracted(true);
        }}
        onDragMove={(e) => {
          // Direct DOM manipulation for zero-lag syncing
          syncOverlayTransform(e.target.x(), e.target.y(), e.target.scaleX());
        }}
        onDragEnd={(e) => {
          const bounded = clampPosition(
            e.target.x(),
            e.target.y(),
            stageSpec.scale,
            stageSpec.width,
            stageSpec.height,
          );
          e.target.x(bounded.x);
          e.target.y(bounded.y);
          setStageSpec((prev) => ({
            ...prev,
            x: bounded.x,
            y: bounded.y,
          }));
          // Final sync to snapped state
          syncOverlayTransform(bounded.x, bounded.y, stageSpec.scale);
          setIsDragging(false);
        }}
        dragBoundFunc={(pos) => {
          // We can sync here too for ultra-smooth bounds, but onDragMove is usually enough
          return clampPosition(
            pos.x,
            pos.y,
            stageSpec.scale,
            stageSpec.width,
            stageSpec.height,
          );
        }}
        style={{
          cursor: "grab",
          opacity: isReady ? 1 : 0,
          transition: "opacity 0.2s ease-in",
        }}
      >
        <Layer>
          {/* The Board Background (Paper) */}
          <Rect
            x={0}
            y={0}
            width={GRID_SIZE}
            height={GRID_SIZE}
            fill="white"
            shadowColor="black"
            shadowBlur={50}
            shadowOpacity={0.1}
            shadowOffsetX={0}
            shadowOffsetY={10}
          />

          {/* Grid Lines */}
          {gridLines}
        </Layer>
      </Stage>

      {/* Memes Container — Synced via ref for performance */}
      <div
        ref={memesContainerRef}
        className="absolute top-0 left-0 origin-top-left pointer-events-none"
        style={{
          // Initial transform from state (will be overridden by direct manipulation)
          transform: `translate(${stageSpec.x}px, ${stageSpec.y}px) scale(${stageSpec.scale})`,
          width: GRID_SIZE,
          height: GRID_SIZE,
        }}
      >
        {/* All Memes (HTML) — pointer-events:none so drag is never blocked */}
        {memes.map((meme) => (
          <img
            key={meme.id}
            src={meme.image_url}
            alt={meme.title || ""}
            className="pointer-events-none select-none"
            style={{
              position: "absolute",
              left: meme.x,
              top: meme.y,
              width: meme.width,
              height: meme.height,
              objectFit: "fill",
              opacity: isReady ? 1 : 0,
              backfaceVisibility: "hidden",
              transform: "translateZ(0)",
            }}
            decoding="async"
            loading="lazy"
          />
        ))}

        {/* Selection Indicator Overlay */}
        {selectedCoords && (
          <div
            className="pointer-events-none z-20"
            style={{
              position: "absolute",
              left: selectedCoords.x,
              top: selectedCoords.y,
              width: GRID_STEP,
              height: GRID_STEP,
              backgroundColor: "rgba(251, 191, 36, 0.6)",
              border: "2px solid #fbbf24",
              boxSizing: "border-box",
              opacity: isReady ? 1 : 0,
            }}
          />
        )}
      </div>

      {/* Hover Tooltip — hidden while dragging for smooth performance */}
      {hoveredMeme && !isDragging && (
        <HoverTooltip
          meme={hoveredMeme}
          screenX={tooltipPos.x}
          screenY={tooltipPos.y}
        />
      )}
    </div>
  );
};

export default MemeCanvas;
