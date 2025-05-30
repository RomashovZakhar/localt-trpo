// Type declarations for Editor.js and plugins

declare module '@editorjs/editorjs';
declare module '@editorjs/header';
declare module '@editorjs/list';
declare module '@editorjs/checklist';
declare module '@editorjs/image';

interface NestedDocumentData {
  id: string;
  title: string;
}

interface EditorJSInstance {
  isReady: Promise<void>;
  save: () => Promise<any>;
  destroy: () => void;
  clear: () => void;
  render: (data: any) => void;
  blocks: {
    insert: (toolName: string, data?: any, config?: any) => void;
    delete: (blockIndex: number) => void;
    get: (blockIndex: number) => any;
    getAll: () => any[];
  };
} 