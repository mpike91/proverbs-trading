import { useRef, useEffect, memo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

function SparklineComponent({
  data,
  width = 120,
  height = 30,
  color = '#2563eb',
  className = '',
}: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reverse data if in reverse chronological order (oldest should be first for left-to-right display)
    // API returns newest first, so we reverse to show oldest -> newest (left to right)
    const chartData = [...data].reverse();

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Calculate bounds
    const min = Math.min(...chartData);
    const max = Math.max(...chartData);
    const range = max - min || 1;

    // Clear and draw
    ctx.clearRect(0, 0, width, height);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const padding = 2;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;

    chartData.forEach((value, i) => {
      const x = padding + (i / (chartData.length - 1)) * drawWidth;
      const y = padding + drawHeight - ((value - min) / range) * drawHeight;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw end point (most recent price)
    const lastX = padding + drawWidth;
    const lastY =
      padding + drawHeight - ((chartData[chartData.length - 1] - min) / range) * drawHeight;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }, [data, width, height, color]);

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center text-gray-400 text-xs ${className}`}
        style={{ width, height }}
      >
        No data
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width, height }}
    />
  );
}

export const Sparkline = memo(SparklineComponent);
