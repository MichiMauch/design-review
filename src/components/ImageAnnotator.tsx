"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

interface ImageAnnotatorProps {
  src: string;
  onExport: (dataUrl: string) => void;
}

type DrawingMode = "rectangle" | "circle" | "line";

interface Point {
  x: number;
  y: number;
}

interface Annotation {
  type: DrawingMode;
  startPoint: Point;
  endPoint: Point;
}

const ImageAnnotator: React.FC<ImageAnnotatorProps> = ({ src, onExport }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentMode, setCurrentMode] = useState<DrawingMode>("rectangle");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(
    null
  );
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const getMousePos = useCallback((e: MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const drawAnnotation = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: Annotation) => {
      ctx.strokeStyle = "#ff0000";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const { startPoint, endPoint, type } = annotation;

      switch (type) {
        case "rectangle":
          const width = endPoint.x - startPoint.x;
          const height = endPoint.y - startPoint.y;
          ctx.rect(startPoint.x, startPoint.y, width, height);
          break;

        case "circle":
          const centerX = (startPoint.x + endPoint.x) / 2;
          const centerY = (startPoint.y + endPoint.y) / 2;
          const radius =
            Math.sqrt(
              Math.pow(endPoint.x - startPoint.x, 2) +
                Math.pow(endPoint.y - startPoint.y, 2)
            ) / 2;
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          break;

        case "line":
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          break;
      }

      ctx.stroke();
    },
    []
  );

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    annotations.forEach((annotation) => drawAnnotation(ctx, annotation));

    if (currentAnnotation) {
      drawAnnotation(ctx, currentAnnotation);
    }
  }, [annotations, currentAnnotation, drawAnnotation]);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      const mousePos = getMousePos(e);
      setIsDrawing(true);
      setCurrentAnnotation({
        type: currentMode,
        startPoint: mousePos,
        endPoint: mousePos,
      });
    },
    [currentMode, getMousePos]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDrawing || !currentAnnotation) return;

      const mousePos = getMousePos(e);
      setCurrentAnnotation((prev) =>
        prev
          ? {
              ...prev,
              endPoint: mousePos,
            }
          : null
      );
    },
    [isDrawing, currentAnnotation, getMousePos]
  );

  const handleMouseUp = useCallback(() => {
    if (currentAnnotation && isDrawing) {
      setAnnotations((prev) => [...prev, currentAnnotation]);
      setCurrentAnnotation(null);
    }
    setIsDrawing(false);
  }, [currentAnnotation, isDrawing]);

  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const containerWidth = img.offsetWidth;
    const containerHeight = img.offsetHeight;

    setCanvasSize({ width: containerWidth, height: containerHeight });
    canvas.width = containerWidth;
    canvas.height = containerHeight;
  }, []);

  const handleExport = useCallback(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const exportCanvas = document.createElement("canvas");
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    exportCanvas.width = img.naturalWidth;
    exportCanvas.height = img.naturalHeight;

    const scaleX = img.naturalWidth / canvasSize.width;
    const scaleY = img.naturalHeight / canvasSize.height;

    ctx.drawImage(img, 0, 0);

    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 2 * Math.max(scaleX, scaleY);

    annotations.forEach((annotation) => {
      ctx.beginPath();
      const scaledStart = {
        x: annotation.startPoint.x * scaleX,
        y: annotation.startPoint.y * scaleY,
      };
      const scaledEnd = {
        x: annotation.endPoint.x * scaleX,
        y: annotation.endPoint.y * scaleY,
      };

      switch (annotation.type) {
        case "rectangle":
          const width = scaledEnd.x - scaledStart.x;
          const height = scaledEnd.y - scaledStart.y;
          ctx.rect(scaledStart.x, scaledStart.y, width, height);
          break;

        case "circle":
          const centerX = (scaledStart.x + scaledEnd.x) / 2;
          const centerY = (scaledStart.y + scaledEnd.y) / 2;
          const radius =
            Math.sqrt(
              Math.pow(scaledEnd.x - scaledStart.x, 2) +
                Math.pow(scaledEnd.y - scaledStart.y, 2)
            ) / 2;
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          break;

        case "line":
          ctx.moveTo(scaledStart.x, scaledStart.y);
          ctx.lineTo(scaledEnd.x, scaledEnd.y);
          break;
      }
      ctx.stroke();
    });

    const dataUrl = exportCanvas.toDataURL("image/jpeg", 0.9);
    onExport(dataUrl);
  }, [annotations, canvasSize, onExport]);

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
    setCurrentAnnotation(null);
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex space-x-2 flex-wrap">
        <button
          onClick={() => setCurrentMode("rectangle")}
          className={`px-4 py-2 rounded-lg border ${
            currentMode === "rectangle"
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Rechteck
        </button>
        <button
          onClick={() => setCurrentMode("circle")}
          className={`px-4 py-2 rounded-lg border ${
            currentMode === "circle"
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Kreis
        </button>
        <button
          onClick={() => setCurrentMode("line")}
          className={`px-4 py-2 rounded-lg border ${
            currentMode === "line"
              ? "bg-blue-500 text-white border-blue-500"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          Linie
        </button>
        <button
          onClick={clearAnnotations}
          className="px-4 py-2 rounded-lg border bg-red-500 text-white border-red-500 hover:bg-red-600"
        >
          Löschen
        </button>
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg border bg-green-500 text-white border-green-500 hover:bg-green-600"
        >
          Exportieren
        </button>
      </div>

      <div className="relative inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt="Screenshot"
          className="max-w-full h-auto block"
          onLoad={handleImageLoad}
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 cursor-crosshair"
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
          }}
        />
      </div>
    </div>
  );
};

export default ImageAnnotator;
