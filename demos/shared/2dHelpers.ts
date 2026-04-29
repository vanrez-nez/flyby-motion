import * as PIXI from 'pixi.js';
import { Vector2Fn } from '../../src/index';

import { demoColors } from './colors';
export { demoColors };

export type Point = readonly [number, number] | readonly number[];

export type AgentDotStyle = {
  radius: number;
  fill: number;
  stroke?: number;
  strokeWidth?: number;
  dotRadius?: number;
  dotColor?: number;
};

export function drawAgentDot(
  graphics: PIXI.Graphics,
  point: Point,
  style: AgentDotStyle
): void {
  graphics
    .circle(point[0], point[1], style.radius)
    .fill(style.fill)
    .stroke({
      color: style.stroke ?? 0xffffff,
      width: style.strokeWidth ?? 2
    });
}

export function drawMarker(
  graphics: PIXI.Graphics,
  x: number,
  y: number,
  color: number
): void {
  graphics
    .circle(x, y, 18)
    .fill({ color, alpha: 0.12 })
    .stroke({ color, width: 4, alpha: 0.95 });
}

export function drawRadiusRing(
  graphics: PIXI.Graphics,
  x: number,
  y: number,
  radius: number,
  color: number = demoColors.radiusRing
): void {
  graphics
    .circle(x, y, radius)
    .stroke({ color, width: 1, alpha: 0.28 });
}

export function drawTrail(
  graphics: PIXI.Graphics,
  points: Point[],
  options: {
    color?: number;
    width?: number;
    maxAlpha?: number;
  } = {}
): void {
  const color = options.color ?? demoColors.trail;
  const width = options.width ?? 2;
  const maxAlpha = options.maxAlpha ?? 0.45;

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    graphics
      .moveTo(a[0], a[1])
      .lineTo(b[0], b[1])
      .stroke({
        color,
        width,
        alpha: (i / points.length) * maxAlpha
      });
  }
}

export function drawMotionVectors(
  graphics: PIXI.Graphics,
  position: Point,
  radius: number,
  velocity: Point,
  force: Point,
  options: {
    velocityColor?: number;
    forceColor?: number;
    velocityScale?: number;
    forceScale?: number;
    velocityMaxLength?: number;
    forceMaxLength?: number;
  } = {}
): void {
  drawVectorFromEdge(graphics, position, radius, velocity, {
    color: options.velocityColor ?? demoColors.velocity,
    scale: options.velocityScale ?? 0.22,
    maxLength: options.velocityMaxLength ?? 140
  });

  drawVectorFromEdge(graphics, position, radius, force, {
    color: options.forceColor ?? demoColors.force,
    scale: options.forceScale ?? 0.08,
    maxLength: options.forceMaxLength ?? 120
  });
}

export function drawArrow(
  graphics: PIXI.Graphics,
  origin: Point,
  vector: Point,
  color: number,
  scale: number,
  maxLength: number
): void {
  const len = Vector2Fn.length(vector as number[]);
  if (len < 0.01) return;

  const length = Math.min(len * scale, maxLength);
  const nx = vector[0] / len;
  const ny = vector[1] / len;
  const endX = origin[0] + nx * length;
  const endY = origin[1] + ny * length;
  const sideX = -ny;
  const sideY = nx;

  const arrowSize = 8;
  const arrowWidth = 4;

  graphics
    .moveTo(origin[0], origin[1])
    .lineTo(endX, endY)
    .stroke({ color, width: 2, alpha: 0.8 });

  graphics
    .poly([
      endX, endY,
      endX - nx * arrowSize + sideX * arrowWidth, endY - ny * arrowSize + sideY * arrowWidth,
      endX - nx * arrowSize - sideX * arrowWidth, endY - ny * arrowSize - sideY * arrowWidth
    ])
    .fill({ color, alpha: 0.9 });
}

function drawVectorFromEdge(
  graphics: PIXI.Graphics,
  position: Point,
  radius: number,
  vector: Point,
  options: {
    color: number;
    scale: number;
    maxLength: number;
  }
): void {
  const len = Vector2Fn.length(vector as number[]);
  if (len < 0.01) return;

  const nx = vector[0] / len;
  const ny = vector[1] / len;
  const origin: [number, number] = [
    position[0] + nx * radius,
    position[1] + ny * radius
  ];

  drawArrow(graphics, origin, vector, options.color, options.scale, options.maxLength);
}
