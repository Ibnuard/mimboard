"use client";

import React, { useEffect, useState, useRef } from "react";
import { Stage, Layer, Line, Image as KonvaImage, Rect } from "react-konva";
import useImage from "use-image";
import {
  GRID_SIZE,
  GRID_STEP,
  MAX_ZOOM,
  ZOOM_SPEED,
  DRAG_VISIBLE_RATIO,
  APP_NAME,
  APP_TAGLINE,
} from "@/lib/constants";

// Check if a URL points to a GIF
const isGifUrl = (url: string) => {
  try {
    const pathname = new URL(url).pathname;
    return pathname.toLowerCase().endsWith(".gif");
  } catch {
    return url.toLowerCase().includes(".gif");
  }
};

// Custom Image Component for Konva
const MemeImage = ({
  src,
  x,
  y,
  width,
  height,
  title,
  opacity = 1,
}: {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  opacity?: number;
}) => {
  const [image] = useImage(src, "anonymous");
  return (
    <KonvaImage
      image={image}
      x={x}
      y={y}
      width={width}
      height={height}
      title={title}
      opacity={opacity}
    />
  );
};

interface MemeCanvasProps {
  memes: any[];
  onCanvasClick: (x: number, y: number) => void;
  selectedCoords: { x: number; y: number } | null;
}

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
  const minScaleRef = useRef(1); // Minimum zoom-out scale (fit-to-screen)
  const containerRef = useRef<HTMLDivElement>(null);

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
      setIsReady(true);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
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
    >
      {/* Watermark - always centered */}
      <div className="fixed inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        <h1
          className="font-bold text-gray-300/40 select-none font-mono whitespace-nowrap"
          style={{ fontSize: "clamp(1.2rem, 6vw, 4.5rem)" }}
        >
          {APP_NAME}
        </h1>
        <p className="font-mono text-gray-400/60 font-medium select-none tracking-widest uppercase text-xs md:text-sm text-center px-4 mt-2">
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
        onDragStart={() => setIsDragging(true)}
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
          setIsDragging(false);
        }}
        dragBoundFunc={(pos) => {
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

          {/* Selection Indicator */}
          {selectedCoords && (
            <Rect
              x={selectedCoords.x}
              y={selectedCoords.y}
              width={GRID_STEP}
              height={GRID_STEP}
              fill="rgba(251, 191, 36, 0.6)"
              stroke="#fbbf24"
              strokeWidth={2}
            />
          )}

          {/* All Memes — GIFs hidden when not dragging (HTML overlay takes over) */}
          {memes.map((meme) => {
            const isGif = isGifUrl(meme.image_url);
            return (
              <MemeImage
                key={meme.id}
                src={meme.image_url}
                x={meme.x}
                y={meme.y}
                width={meme.width}
                height={meme.height}
                title={meme.title}
                opacity={isGif && !isDragging ? 0 : 1}
              />
            );
          })}
        </Layer>
      </Stage>

      {/* Animated GIF Overlays — only visible when not dragging */}
      {!isDragging &&
        memes
          .filter((meme) => isGifUrl(meme.image_url))
          .map((meme) => {
            const screenX = stageSpec.x + meme.x * stageSpec.scale;
            const screenY = stageSpec.y + meme.y * stageSpec.scale;
            const screenW = meme.width * stageSpec.scale;
            const screenH = meme.height * stageSpec.scale;

            return (
              <img
                key={meme.id}
                src={meme.image_url}
                alt={meme.title || ""}
                className="pointer-events-none"
                style={{
                  position: "absolute",
                  left: screenX,
                  top: screenY,
                  width: screenW,
                  height: screenH,
                  objectFit: "fill",
                  opacity: isReady ? 1 : 0,
                }}
              />
            );
          })}
    </div>
  );
};

export default MemeCanvas;
