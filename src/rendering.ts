import data from '../constellations.json';
import {
  forceSimulation,
  forceManyBody,
  forceCenter,
  forceLink,
} from 'd3-force';
import { randomNormal } from 'd3-random';
const l = data.length;
const r = Math.ceil(Math.sqrt(l));
const cellWidth = 48;
const cellCount = 10;
const ctsSize = cellCount * cellWidth;
const imageRadius = r * ctsSize;
const canvas = document.createElement('canvas');
canvas.width = imageRadius * 2 + cellWidth;
canvas.height = imageRadius + cellWidth;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d')!;
ctx.fillStyle = '#00072E';
ctx.fillRect(0, 0, canvas.width, imageRadius);
ctx.translate(cellWidth, cellWidth);
const offsetRnd = randomNormal(0, cellWidth / 6);
const dot = (x: number, y: number, rad: number) => {
  ctx.beginPath();
  ctx.ellipse(x, y, rad, rad, 0, 0, Math.PI * 2);
};
for (const [i, constellation] of data.entries()) {
  const xOff = (i % r) * ctsSize * 2;
  const yOff = Math.floor(i / r) * ctsSize;
  const keyID = constellation.key_id;
  ctx.save();
  ctx.translate(xOff, yOff);
  ctx.fillStyle = '#fff';
  ctx.font = '16px sans-serif';
  ctx.fillText(constellation.name, ctsSize / 2, 0 - 20, ctsSize);
  for (const node of constellation.nodes) {
    const x = node.x * cellWidth;
    const y = node.y * cellWidth;
    const rad = node.id === keyID ? cellWidth / 4 : cellWidth / 8;
    dot(x, y, rad);
    ctx.fill();
  }
  for (const link of constellation.links) {
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    const fx = link.points[0][0] * cellWidth;
    const fy = link.points[0][1] * cellWidth;
    ctx.moveTo(fx, fy);
    for (let i = 1; i < link.points.length; i++) {
      const x = link.points[i][0] * cellWidth;
      const y = link.points[i][1] * cellWidth;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#3BF0F0';
    const first = link.points;
    const lx = ((first[1][0] - first[0][0]) / 2 + first[0][0]) * cellWidth;
    const ly = ((first[1][1] - first[0][1]) / 2 + first[0][1]) * cellWidth;
    dot(lx, ly, cellWidth / 10);
    ctx.fill();
  }

  const simNodes = constellation.nodes.map((node) => {
    return {
      x: node.x * cellWidth + offsetRnd(),
      y: node.y * cellWidth + offsetRnd(),
      id: node.id,
    };
  });
  ctx.fillStyle = '#fff';

  const simLinks = constellation.links.map((link) => {
    const source = link.data[0];
    const target = link.data[1];
    return { source, target };
  });
  const mbForce = forceManyBody()
    .distanceMin(1)
    .distanceMax(3 * cellWidth)
    .strength(-80);
  const squishForce = forceManyBody()
    .distanceMin(2 * cellWidth)
    .strength(60);
  const linkForce = forceLink(simLinks)
    .id((n) => (n as any).id)
    .distance(cellWidth)
    .iterations(1);
  const centeringForce = forceCenter(cellWidth / 2, 0);
  const sim = forceSimulation(simNodes)
    .force('charge', mbForce)
    .force('link', linkForce)
    .force('squish', squishForce)
    .force('center', centeringForce);
  sim.stop();
  sim.tick(2000);
  sim.alphaTarget(0.1);
  ctx.save();
  const yHat = Math.min(...simNodes.map((n) => n.y));
  ctx.translate(ctsSize, -1 * yHat);
  for (const node of simNodes) {
    dot(node.x, node.y, node.id === keyID ? cellWidth / 3 : cellWidth / 5);
    ctx.fill();
  }
  for (const l of simLinks) {
    const start = simNodes.find((n) => n.id === l.source)!;
    const end = simNodes.find((n) => n.id === l.target)!;
    if (!l.source || !l.target) continue;

    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(l.source.x, l.source.y);
    ctx.lineTo(l.target.x, l.target.y);
    ctx.stroke();
    ctx.fillStyle = '#3BF0F0';
    const { x: sx, y: sy } = l.source as unknown as (typeof simNodes)[number];
    const { x: ex, y: ey } = l.target as unknown as (typeof simNodes)[number];
    const lx = (ex - sx) / 2 + sx;
    const ly = (ey - sy) / 2 + sy;
    dot(lx, ly, cellWidth / 10);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}
