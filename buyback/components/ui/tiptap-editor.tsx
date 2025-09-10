"use client";

import { useState, useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Minus,
  Quote,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
}

export function TipTapEditor({
  content,
  onChange,
  placeholder = 'Write something...',
  disabled = false,
  className,
  minHeight = '200px',
}: TipTapEditorProps) {
  const [isMounted, setIsMounted] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: true,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: true,
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-4',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'mx-auto max-w-full rounded-md',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'listItem'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content,
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Ensure the component is mounted before rendering the editor
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Set content when it changes externally or on editor initialization
  useEffect(() => {
    if (editor && (content !== editor.getHTML() || !editor.getHTML())) {
      editor.commands.setContent(content || '');
    }
  }, [editor, content]);

  // Ensure editor gets focused when interacting with toolbar buttons
  const handleButtonClick = (callback: () => void) => {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      if (!editor) return;
      callback();
    };
  };

  if (!isMounted) {
    return null;
  }

  return (
    <div className={cn("border border-input rounded-md overflow-hidden", className)}>
      {!disabled && (
        <div className="flex items-center px-2 py-1.5 border-b gap-0.5">
          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleButtonClick(() => editor?.chain().focus().toggleBold().run())}
            className={cn("h-8 w-8 p-0", editor?.isActive('bold') ? "bg-muted/30" : "")}
            aria-label="Bold"
            disabled={disabled}
          >
            <Bold className="w-4 h-4" />
          </Button>
          
          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleButtonClick(() => editor?.chain().focus().toggleItalic().run())}
            className={cn("h-8 w-8 p-0", editor?.isActive('italic') ? "bg-muted/30" : "")}
            aria-label="Italic"
            disabled={disabled}
          >
            <Italic className="w-4 h-4" />
          </Button>
          
          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleButtonClick(() => editor?.chain().focus().toggleCode().run())}
            className={cn("h-8 w-8 p-0", editor?.isActive('code') ? "bg-muted/30" : "")}
            aria-label="Code"
            disabled={disabled}
          >
            <Code className="w-4 h-4" />
          </Button>
          
          <div className="mx-1 h-4 w-px bg-border" />
          
          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleButtonClick(() => editor?.chain().focus().toggleBulletList().run())}
            className={cn("h-8 w-8 p-0", editor?.isActive('bulletList') ? "bg-muted/30" : "")}
            aria-label="Bullet List"
            disabled={disabled}
          >
            <List className="w-4 h-4" />
          </Button>
          
          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleButtonClick(() => editor?.chain().focus().toggleOrderedList().run())}
            className={cn("h-8 w-8 p-0", editor?.isActive('orderedList') ? "bg-muted/30" : "")}
            aria-label="Ordered List"
            disabled={disabled}
          >
            <ListOrdered className="w-4 h-4" />
          </Button>

          <div className="mx-1 h-4 w-px bg-border" />

          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleButtonClick(() => editor?.chain().focus().setTextAlign('left').run())}
            className={cn("h-8 w-8 p-0", editor?.isActive({ textAlign: 'left' }) ? "bg-muted/30" : "")}
            aria-label="Align Left"
            disabled={disabled}
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          
          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleButtonClick(() => editor?.chain().focus().setTextAlign('center').run())}
            className={cn("h-8 w-8 p-0", editor?.isActive({ textAlign: 'center' }) ? "bg-muted/30" : "")}
            aria-label="Align Center"
            disabled={disabled}
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          
          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleButtonClick(() => editor?.chain().focus().setTextAlign('right').run())}
            className={cn("h-8 w-8 p-0", editor?.isActive({ textAlign: 'right' }) ? "bg-muted/30" : "")}
            aria-label="Align Right"
            disabled={disabled}
          >
            <AlignRight className="w-4 h-4" />
          </Button>
          
          <div className="mx-1 h-4 w-px bg-border" />

          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleButtonClick(() => editor?.chain().focus().setHorizontalRule().run())}
            className="h-8 w-8 p-0"
            aria-label="Horizontal Rule"
            disabled={disabled}
          >
            <Minus className="w-4 h-4" />
          </Button>
          
          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => { 
              e.preventDefault();
              if (!editor) return;
              const url = window.prompt('Enter URL');
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
            className={cn("h-8 w-8 p-0", editor?.isActive('link') ? "bg-muted/30" : "")}
            aria-label="Add Link"
            disabled={disabled}
          >
            <LinkIcon className="w-4 h-4" />
          </Button>
          
          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleButtonClick(() => editor?.chain().focus().toggleBlockquote().run())}
            className={cn("h-8 w-8 p-0", editor?.isActive('blockquote') ? "bg-muted/30" : "")}
            aria-label="Quote"
            disabled={disabled}
          >
            <Quote className="w-4 h-4" />
          </Button>
          
          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={(e) => { 
              e.preventDefault();
              if (!editor) return;
              const url = window.prompt('Enter image URL');
              if (url) editor.chain().focus().setImage({ src: url }).run();
            }}
            className="h-8 w-8 p-0"
            aria-label="Add Image"
            disabled={disabled}
          >
            <ImageIcon className="w-4 h-4" />
          </Button>

          <div className="mx-1 h-4 w-px bg-border" />

          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleButtonClick(() => editor?.chain().focus().undo().run())}
            className="h-8 w-8 p-0"
            aria-label="Undo"
            disabled={!editor?.can().undo() || disabled}
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          
          <Button 
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleButtonClick(() => editor?.chain().focus().redo().run())}
            className="h-8 w-8 p-0"
            aria-label="Redo"
            disabled={!editor?.can().redo() || disabled}
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>
      )}
      <EditorContent 
        editor={editor} 
        className={cn(
          "prose prose-sm max-w-none prose-neutral dark:prose-invert p-4 focus:outline-none",
          "[&_.is-editor-empty]:before:text-muted-foreground [&_.is-editor-empty]:before:content-[attr(data-placeholder)] [&_.is-editor-empty]:before:float-left [&_.is-editor-empty]:before:pointer-events-none",
          "[&_ul]:list-disc [&_ol]:list-decimal [&_ul,&_ol]:pl-10",
          "[&_p]:my-2 [&_h1,&_h2,&_h3]:mt-6 [&_h1,&_h2,&_h3]:mb-4",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:italic",
          "[&_.text-left]:text-left [&_.text-center]:text-center [&_.text-right]:text-right",
          { "opacity-50": disabled }
        )}
        style={{ minHeight }}
      />
    </div>
  );
}
