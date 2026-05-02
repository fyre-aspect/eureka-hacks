import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { PhysicsScene } from './types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const SYSTEM_PROMPT = `
You are a physics scene parser. The user has drawn a rough sketch of a physics scenario on a whiteboard.
Your job is to identify every physical object in the sketch and return a JSON object that conforms exactly
to the PhysicsScene schema below.

Rules:
- Map the entire sketch into an 800×600 coordinate space (origin top-left).
- Every scene MUST have at least one floor (isStatic: true, role: "floor") at y=560 spanning the full width.
- Infer missing properties from context: a ramp is a static rectangle rotated at an angle; a pendulum ball hangs from a pivot.
- Be generous in detection — prefer false-positives over missing objects.
- If you see a circle, it is a "ball". If you see a tilted rectangle, it is a "ramp". A rectangle at the bottom is the "floor".
- Use the color field to assign visually distinct hex colors to each object.
- The notes field should be one plain-English sentence describing what the scene depicts.
- Return ONLY the JSON object. No markdown fences, no explanation text.
`;

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    objects: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id:          { type: SchemaType.STRING },
          role:        { type: SchemaType.STRING },
          shape:       { type: SchemaType.STRING },
          label:       { type: SchemaType.STRING },
          x:           { type: SchemaType.NUMBER },
          y:           { type: SchemaType.NUMBER },
          width:       { type: SchemaType.NUMBER },
          height:      { type: SchemaType.NUMBER },
          radius:      { type: SchemaType.NUMBER },
          angleDeg:    { type: SchemaType.NUMBER },
          isStatic:    { type: SchemaType.BOOLEAN },
          restitution: { type: SchemaType.NUMBER },
          friction:    { type: SchemaType.NUMBER },
          frictionAir: { type: SchemaType.NUMBER },
          color:       { type: SchemaType.STRING },
          attachedTo:  { type: SchemaType.STRING },
          restLength:  { type: SchemaType.NUMBER },
          stiffness:   { type: SchemaType.NUMBER },
        },
        required: ['id', 'role', 'shape', 'x', 'y'],
      },
    },
    gravity: {
      type: SchemaType.OBJECT,
      properties: {
        x: { type: SchemaType.NUMBER },
        y: { type: SchemaType.NUMBER },
      },
    },
    width:  { type: SchemaType.NUMBER },
    height: { type: SchemaType.NUMBER },
    notes:  { type: SchemaType.STRING },
  },
  required: ['objects', 'width', 'height'],
};

export async function parseSketch(imageBase64: string): Promise<PhysicsScene> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA as any,
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent([
    { inlineData: { mimeType: 'image/png', data: imageBase64 } },
    'Parse this physics sketch.',
  ]);

  const raw = result.response.text();
  const scene = JSON.parse(raw) as PhysicsScene;

  // Ensure defaults
  scene.width  = 800;
  scene.height = 600;
  scene.gravity ??= { x: 0, y: 1 };

  // Guarantee a floor exists
  const hasFloor = scene.objects.some(o => o.role === 'floor');
  if (!hasFloor) {
    scene.objects.push({
      id: 'auto-floor',
      role: 'floor',
      shape: 'rectangle',
      label: 'floor',
      x: 400, y: 570,
      width: 800, height: 20,
      isStatic: true,
      color: '#374151',
    });
  }

  return scene;
}
