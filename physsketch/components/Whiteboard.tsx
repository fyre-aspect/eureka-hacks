'use client';
import { useRef, forwardRef, useImperativeHandle } from 'react';
import { Tldraw, createTLStore, defaultShapeUtils } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';

export interface WhiteboardHandle {
  getImageBase64(): Promise<string>;
  clear(): void;
}

const Whiteboard = forwardRef<WhiteboardHandle>((_, ref) => {
  const editorRef = useRef<import('@tldraw/tldraw').Editor | null>(null);

  useImperativeHandle(ref, () => ({
    async getImageBase64() {
      const editor = editorRef.current;
      if (!editor) throw new Error('Editor not ready');
      const shapeIds = editor.getCurrentPageShapeIds();
      if (shapeIds.size === 0) {
        throw new Error('Canvas is empty');
      }
      const { blob } = await editor.toImage([...shapeIds], { type: 'png', background: true });
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    },
    clear() {
      editorRef.current?.selectAll();
      editorRef.current?.deleteShapes(editorRef.current.getSelectedShapeIds());
    },
  }));

  return (
    <div className="w-full h-full">
      <Tldraw
        onMount={(editor) => { editorRef.current = editor; }}
        hideUi={false}
      />
    </div>
  );
});

Whiteboard.displayName = 'Whiteboard';
export default Whiteboard;
