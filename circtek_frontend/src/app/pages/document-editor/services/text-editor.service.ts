import { Injectable } from '@angular/core';
import Konva from 'konva';
import { TextEditorConfig } from '../types/editor.types';
import { TEXT_EDITOR_CONFIG, DEFAULT_VALUES } from '../constants/editor.constants';

@Injectable({
  providedIn: 'root'
})
export class TextEditorService {
  constructor() {}

  startTextEditing(
    textNode: Konva.Text, 
    stage: Konva.Stage, 
    transformer: Konva.Transformer, 
    layer: Konva.Layer,
    onTextUpdate?: (node: Konva.Text) => void
  ): void {
    if (!textNode || !(textNode instanceof Konva.Text)) {
      console.warn('Cannot edit: not a text node');
      return;
    }

    // Store original values
    const originalText = textNode.text();
    const originalWidth = textNode.width();
    const originalHeight = textNode.height();
    const originalFontWeight = textNode.fontStyle();
    const originalFontSize = textNode.fontSize();
    const originalColor = textNode.fill();

    // Hide the text node and transformer
    textNode.hide();
    transformer.nodes([]);
    layer.draw();

    // Create editor container
    const editorContainer = this.createEditorContainer(textNode, stage);
    const toolbar = this.createToolbar(originalFontWeight, originalFontSize, originalColor);
    const textarea = this.createTextarea(textNode, originalColor);
    const footer = this.createFooter();

    // Assemble the editor
    const titleBar = this.createTitleBar();
    editorContainer.appendChild(titleBar);
    editorContainer.appendChild(toolbar);
    editorContainer.appendChild(textarea);
    editorContainer.appendChild(footer);

    document.body.appendChild(editorContainer);
    textarea.focus();

    // Event handlers
    this.setupEventHandlers(
      textNode, 
      textarea, 
      toolbar, 
      footer, 
      editorContainer, 
      transformer,
      layer,
      onTextUpdate
    );
  }

  private createEditorContainer(textNode: Konva.Text, stage: Konva.Stage): HTMLDivElement {
    const editorContainer = document.createElement('div');
    const textPosition = textNode.absolutePosition();
    const stageBox = stage.container().getBoundingClientRect();
    const scale = stage.scaleX();

    const editorPosition = {
      x: stageBox.left + textPosition.x * scale,
      y: stageBox.top + textPosition.y * scale,
    };

    // Ensure editor is within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const editorWidth = textNode.width() * scale + 20;

    if (editorPosition.x + editorWidth > viewportWidth) {
      editorPosition.x = Math.max(0, viewportWidth - editorWidth);
    }
    if (editorPosition.y < 0) {
      editorPosition.y = 0;
    } else if (editorPosition.y > viewportHeight - 100) {
      editorPosition.y = Math.max(0, viewportHeight - 200);
    }

    editorContainer.className = 'text-editor-container';
    editorContainer.style.position = 'fixed';
    editorContainer.style.top = editorPosition.y + 'px';
    editorContainer.style.left = editorPosition.x + 'px';
    editorContainer.style.width = textNode.width() * scale + 10 + 'px';
    editorContainer.style.zIndex = TEXT_EDITOR_CONFIG.Z_INDEX;
    editorContainer.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    editorContainer.style.borderRadius = TEXT_EDITOR_CONFIG.CONTAINER_STYLE.borderRadius;
    editorContainer.style.background = TEXT_EDITOR_CONFIG.CONTAINER_STYLE.background;
    editorContainer.style.border = TEXT_EDITOR_CONFIG.CONTAINER_STYLE.border;

    return editorContainer;
  }

  private createTitleBar(): HTMLDivElement {
    const titleBar = document.createElement('div');
    titleBar.style.backgroundColor = '#3a86ff';
    titleBar.style.color = 'white';
    titleBar.style.padding = '4px 8px';
    titleBar.style.fontSize = '12px';
    titleBar.style.fontWeight = 'bold';
    titleBar.style.borderTopLeftRadius = '2px';
    titleBar.style.borderTopRightRadius = '2px';
    titleBar.textContent = 'Edit Text';
    return titleBar;
  }

  private createToolbar(originalFontWeight: any, originalFontSize: number, originalColor: any): HTMLDivElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'text-editor-toolbar';
    toolbar.style.display = 'flex';
    toolbar.style.alignItems = 'center';
    toolbar.style.padding = '4px';
    toolbar.style.borderBottom = '1px solid #eee';
    toolbar.style.backgroundColor = '#f8f9fa';
    toolbar.style.borderTopLeftRadius = '4px';
    toolbar.style.borderTopRightRadius = '4px';

    // Bold button
    const boldButton = document.createElement('button');
    boldButton.innerHTML = '<b>B</b>';
    boldButton.title = 'Bold';
    boldButton.style.margin = '0 2px';
    boldButton.style.border = 'none';
    boldButton.style.background = originalFontWeight === 'bold' ? '#ddd' : 'transparent';
    boldButton.style.borderRadius = '2px';
    boldButton.style.padding = '2px 6px';
    boldButton.style.cursor = 'pointer';
    boldButton.style.fontSize = '12px';

    // Font size dropdown
    const fontSizeSelector = document.createElement('select');
    fontSizeSelector.title = 'Font Size';
    fontSizeSelector.style.margin = '0 2px';
    fontSizeSelector.style.border = '1px solid #ddd';
    fontSizeSelector.style.borderRadius = '2px';
    fontSizeSelector.style.padding = '2px';
    fontSizeSelector.style.fontSize = '12px';
    
    TEXT_EDITOR_CONFIG.FONT_SIZES.forEach(size => {
      const option = document.createElement('option');
      option.value = size.toString();
      option.textContent = size.toString();
      option.selected = size === originalFontSize;
      fontSizeSelector.appendChild(option);
    });

    // Color picker
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.title = 'Text Color';
    colorPicker.style.margin = '0 2px';
    colorPicker.style.border = 'none';
    colorPicker.style.width = '24px';
    colorPicker.style.height = '24px';
    colorPicker.style.padding = '0';
    colorPicker.style.cursor = 'pointer';
    if (typeof originalColor === 'string') {
      colorPicker.value = originalColor;
    }

    toolbar.appendChild(boldButton);
    toolbar.appendChild(fontSizeSelector);
    toolbar.appendChild(colorPicker);

    return toolbar;
  }

  private createTextarea(textNode: Konva.Text, originalColor: any): HTMLTextAreaElement {
    const textarea = document.createElement('textarea');
    textarea.value = textNode.text();
    textarea.style.width = '100%';
    textarea.style.minHeight = textNode.height() + 'px';
    textarea.style.height = 'auto';
    textarea.style.fontSize = textNode.fontSize() + 'px';
    textarea.style.fontFamily = textNode.fontFamily();
    textarea.style.border = 'none';
    textarea.style.padding = '8px';
    textarea.style.margin = '0';
    textarea.style.outline = 'none';
    textarea.style.resize = 'vertical';
    textarea.style.overflowY = 'auto';
    textarea.style.overflowWrap = 'break-word';
    textarea.style.whiteSpace = 'pre-wrap';
    textarea.style.lineHeight = textNode.lineHeight().toString();
    textarea.style.boxSizing = 'border-box';
    textarea.style.fontWeight = textNode.fontStyle() === 'bold' ? 'bold' : 'normal';
    
    if (typeof originalColor === 'string') {
      textarea.style.color = originalColor;
    } else {
      textarea.style.color = 'black';
    }

    return textarea;
  }

  private createFooter(): HTMLDivElement {
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.justifyContent = 'flex-end';
    footer.style.padding = '4px';
    footer.style.borderTop = '1px solid #eee';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Close';
    cancelBtn.className = 'btn btn-sm btn-outline-secondary';
    cancelBtn.style.marginRight = '4px';
    cancelBtn.style.fontSize = '12px';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.className = 'btn btn-sm btn-primary';
    saveBtn.style.fontSize = '12px';

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    return footer;
  }

  private setupEventHandlers(
    textNode: Konva.Text,
    textarea: HTMLTextAreaElement,
    toolbar: HTMLDivElement,
    footer: HTMLDivElement,
    editorContainer: HTMLDivElement,
    transformer: Konva.Transformer,
    layer: Konva.Layer,
    onTextUpdate?: (node: Konva.Text) => void
  ): void {
    const boldButton = toolbar.querySelector('button') as HTMLButtonElement;
    const fontSizeSelector = toolbar.querySelector('select') as HTMLSelectElement;
    const colorPicker = toolbar.querySelector('input[type="color"]') as HTMLInputElement;
    const cancelBtn = footer.children[0] as HTMLButtonElement;
    const saveBtn = footer.children[1] as HTMLButtonElement;

    // Function to apply changes
    const applyChanges = () => {
      console.log(`[TextEdit] Applying changes to text node. New text: "${textarea.value}"`);
      
      textNode.text(textarea.value);

      const newSize = parseInt(fontSizeSelector.value, 10);
      if (!isNaN(newSize)) {
        textNode.fontSize(newSize);
      }

      if (boldButton.style.background === 'rgb(221, 221, 221)' || boldButton.style.background === '#ddd') {
        textNode.fontStyle('bold');
      } else {
        textNode.fontStyle('normal');
      }

      textNode.fill(colorPicker.value);
      textNode.wrap('word');
      textNode.ellipsis(false);
      
      if (onTextUpdate) {
        onTextUpdate(textNode);
      }
    };

    // Function to remove editor
    const removeEditor = () => {
      document.body.removeChild(editorContainer);
      textNode.show();
      transformer.nodes([textNode]);
      layer.draw();
    };

    // Bold button event
    boldButton.addEventListener('click', () => {
      if (boldButton.style.background === 'transparent' || boldButton.style.background === '') {
        boldButton.style.background = '#ddd';
        textarea.style.fontWeight = 'bold';
      } else {
        boldButton.style.background = 'transparent';
        textarea.style.fontWeight = 'normal';
      }
    });

    // Font size change event
    fontSizeSelector.addEventListener('change', () => {
      const newSize = parseInt(fontSizeSelector.value, 10);
      if (!isNaN(newSize)) {
        textarea.style.fontSize = newSize + 'px';
      }
    });

    // Color picker event
    colorPicker.addEventListener('input', () => {
      textarea.style.color = colorPicker.value;
    });

    // Button events
    cancelBtn.addEventListener('click', () => {
      removeEditor();
    });

    saveBtn.addEventListener('click', () => {
      applyChanges();
      removeEditor();
    });

    // Keyboard shortcuts
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        applyChanges();
        removeEditor();
        e.preventDefault();
      }
      if (e.key === 'Escape') {
        removeEditor();
      }
    });

    // Auto-resize textarea
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    });

    // Initial auto-resize
    setTimeout(() => {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }, 0);
  }

  autoResizeTextNode(textNode: Konva.Text, adjustWidth: boolean = false): void {
    console.log(`[AutoResize] Starting auto-resize for text node. adjustWidth: ${adjustWidth}, current text: "${textNode.text()}"`);
    
    textNode.wrap('word');
    textNode.ellipsis(false);

    if (adjustWidth) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (context) {
        const fontSize = textNode.fontSize() || 16;
        const fontFamily = textNode.fontFamily() || 'Arial';
        const fontStyle = textNode.fontStyle() || 'normal';
        const fontWeight = fontStyle.includes('bold') ? 'bold' : 'normal';
        
        context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        
        const textMetrics = context.measureText(textNode.text() || '');
        const textWidth = textMetrics.width;
        const padding = textNode.padding() || 5;
        const calculatedWidth = textWidth + (padding * 2);
        const finalWidth = Math.max(calculatedWidth, DEFAULT_VALUES.TEXT_MIN_WIDTH);
        
        textNode.width(finalWidth);
        console.log(`[AutoResize] Text node width set to ${finalWidth}px`);
      } else {
        const textLength = (textNode.text() || '').length;
        const fontSize = textNode.fontSize() || 16;
        const estimatedWidth = textLength * fontSize * 0.6;
        const padding = textNode.padding() || 5;
        const finalWidth = Math.max(estimatedWidth + (padding * 2), DEFAULT_VALUES.TEXT_MIN_WIDTH);
        textNode.width(finalWidth);
      }
    }

    // Create a hidden div to measure wrapped text height
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.visibility = 'hidden';
    container.style.fontFamily = textNode.fontFamily();
    container.style.fontSize = textNode.fontSize() + 'px';
    container.style.lineHeight = textNode.lineHeight().toString();
    container.style.fontStyle = textNode.fontStyle();
    container.style.fontWeight = textNode.fontStyle() === 'bold' ? 'bold' : 'normal';
    container.style.paddingRight = textNode.padding() + 'px';
    container.style.paddingLeft = textNode.padding() + 'px';
    container.style.whiteSpace = 'pre-wrap';
    container.style.wordWrap = 'break-word';
    container.style.width = textNode.width() - textNode.padding() * 2 + 'px';
    container.innerText = textNode.text() || ' ';

    document.body.appendChild(container);
    const wrappedHeight = container.offsetHeight;
    document.body.removeChild(container);

    const finalHeight = Math.max(wrappedHeight, DEFAULT_VALUES.TEXT_MIN_HEIGHT);
    textNode.height(finalHeight);

    textNode.getLayer()?.batchDraw();
  }
} 