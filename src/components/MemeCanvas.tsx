"use client";

import React, { useEffect, useState, useRef } from "react";
import { Stage, Layer, Line, Image as KonvaImage, Rect } from "react-konva";
import useImage from "use-image";

const GRID_SIZE = 1000;
const GRID_STEP = 10; // Draw lines every 10px to simulate a pixel-like reference

// Custom Image Component for Konva
const MemeImage = ({
  src,
  x,
  y,
  width,
  height,
  title,
}: {
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
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
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({
    width: GRID_SIZE,
    height: GRID_SIZE,
  });

  useEffect(() => {
    const handleResize = () => {
      const viewportWidth = window.innerWidth;
      // Mobile & Desktop: Always fit width (scroll vertically on desktop if needed)
      // This matches the "full screen" behavior requested initially
      const newScale = viewportWidth / GRID_SIZE;

      setScale(newScale);
      setStageSize({
        width: GRID_SIZE * newScale,
        height: GRID_SIZE * newScale,
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleStageClick = (e: any) => {
    // Get mouse position relative to the stage
    const stage = e.target.getStage();
    const pointerPos = stage.getPointerPosition();

    if (pointerPos) {
      // Convert to logical 1000x1000 coordinates
      const x = Math.round(pointerPos.x / scale);
      const y = Math.round(pointerPos.y / scale);

      // Snap to nearest grid step
      const snappedX = Math.floor(x / GRID_STEP) * GRID_STEP;
      const snappedY = Math.floor(y / GRID_STEP) * GRID_STEP;

      // Keep within bounds
      const boundedX = Math.max(0, Math.min(snappedX, GRID_SIZE - GRID_STEP));
      const boundedY = Math.max(0, Math.min(snappedY, GRID_SIZE - GRID_STEP));

      onCanvasClick(boundedX, boundedY);
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
        strokeWidth={1 / scale} // Keep lines thin regardless of scale
      />,
    );
    gridLines.push(
      <Line
        key={`h-${i}`}
        points={[0, i, GRID_SIZE, i]}
        stroke="#e5e7eb"
        strokeWidth={1 / scale}
      />,
    );
  }

  return (
    <div ref={containerRef} className="w-full relative cursor-crosshair">
      {/* Header (Mobile) / Watermark (Desktop) */}
      <div className="w-full flex flex-col items-center justify-center py-8 z-10 bg-gray-100 md:fixed md:inset-0 md:bg-transparent md:pointer-events-none md:justify-center md:h-screen md:items-center md:py-0">
        <h1
          className="font-bold text-gray-300 select-none font-mono whitespace-nowrap md:text-gray-300/40"
          style={{ fontSize: "clamp(2rem, 10vw, 10rem)" }}
        >
          PapanMeme
        </h1>
        <p className="font-mono text-gray-400 font-medium select-none tracking-widest uppercase text-xs text-center px-4 mt-2 md:text-sm md:text-gray-400/60">
          Setiap pixel adalah milikmu, pilih pixel mu sekarang
        </p>
      </div>

      {/* Canvas — sits on top of the watermark */}
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        onClick={handleStageClick}
        onTap={handleStageClick}
        style={{ position: "relative", zIndex: 1 }}
      >
        <Layer>{gridLines}</Layer>

        <Layer>
          {/* Visual Indicator of selection */}
          {selectedCoords && (
            <Rect
              x={selectedCoords.x}
              y={selectedCoords.y}
              width={GRID_STEP}
              height={GRID_STEP}
              fill="rgba(251, 191, 36, 0.6)"
              stroke="#fbbf24"
              strokeWidth={1 / scale}
            />
          )}

          {memes.map((meme) => (
            <MemeImage
              key={meme.id}
              src={meme.image_url}
              x={meme.x}
              y={meme.y}
              width={meme.width}
              height={meme.height}
              title={meme.title}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default MemeCanvas;
