import Matter from 'matter-js';
import { PhysicsObject, PhysicsScene } from './types';

const { Engine, Render, Runner, Bodies, Body, Composite, Constraint, Events } = Matter;

let engine: Matter.Engine | null = null;
let render: Matter.Render | null = null;
let runner: Matter.Runner | null = null;

export function cleanup() {
  if (runner) Runner.stop(runner);
  if (render) {
    Render.stop(render);
  }
  if (engine) Engine.clear(engine);
  engine = null; render = null; runner = null;
}

function objectToBody(obj: PhysicsObject): Matter.Body | null {
  const opts: Matter.IBodyDefinition = {
    label: obj.id,
    isStatic: obj.isStatic ?? false,
    restitution: obj.restitution ?? 0.3,
    friction: obj.friction ?? 0.5,
    frictionAir: obj.frictionAir ?? 0.01,
    render: { fillStyle: obj.color ?? '#6366f1' },
  };

  let body: Matter.Body;

  switch (obj.shape) {
    case 'circle':
      body = Bodies.circle(obj.x, obj.y, obj.radius ?? 30, opts);
      break;
    case 'polygon':
      if (!obj.vertices?.length) return null;
      body = Bodies.fromVertices(obj.x, obj.y, [obj.vertices], opts);
      break;
    case 'rectangle':
    default:
      body = Bodies.rectangle(obj.x, obj.y, obj.width ?? 60, obj.height ?? 20, opts);
      if (obj.angleDeg) Body.setAngle(body, (obj.angleDeg * Math.PI) / 180);
      break;
  }

  return body;
}

export function buildWorld(scene: PhysicsScene, canvasEl: HTMLCanvasElement): void {
  cleanup();

  engine = Engine.create({ gravity: scene.gravity ?? { x: 0, y: 1 } });

  render = Render.create({
    canvas: canvasEl,
    engine,
    options: {
      width: scene.width,
      height: scene.height,
      wireframes: false,
      background: '#0f172a',
    },
  });

  const bodyMap = new Map<string, Matter.Body>();
  const bodies: Matter.Body[] = [];

  for (const obj of scene.objects) {
    const body = objectToBody(obj);
    if (body) {
      bodyMap.set(obj.id, body);
      bodies.push(body);
    }
  }

  Composite.add(engine.world, bodies);

  // Build constraints (pendulums, springs)
  for (const obj of scene.objects) {
    if (!obj.attachedTo) continue;
    const bodyA = bodyMap.get(obj.attachedTo);
    const bodyB = bodyMap.get(obj.id);
    if (!bodyA || !bodyB) continue;

    const constraint = Constraint.create({
      bodyA,
      bodyB,
      length: obj.restLength ?? 120,
      stiffness: obj.stiffness ?? 0.9,
      render: { strokeStyle: '#a5b4fc', lineWidth: 2 },
    });
    Composite.add(engine.world, constraint);
  }

  Render.run(render);
  runner = Runner.create();
  Runner.run(runner, engine);
}
