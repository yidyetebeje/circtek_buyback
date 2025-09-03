import { Injectable } from '@angular/core';
import Konva from 'konva';
import { ShapeType } from '../types/editor.types';
import { SHAPE_DEFAULTS } from '../constants/editor.constants';

@Injectable({
  providedIn: 'root'
})
export class ShapeService {
  constructor() {}

  createFilledRectangle(
    x: number, 
    y: number, 
    width?: number, 
    height?: number, 
    color?: string
  ): Konva.Rect {
    const rect = new Konva.Rect({
      x,
      y,
      width: width || SHAPE_DEFAULTS.RECTANGLE.width,
      height: height || SHAPE_DEFAULTS.RECTANGLE.height,
      fill: color || '#000000',
      name: 'shape',
      draggable: true,
      shapeType: 'filled-rectangle'
    });

    console.log('Created filled rectangle at', x, y);
    return rect;
  }

  createOutlinedRectangle(
    x: number, 
    y: number, 
    width?: number, 
    height?: number, 
    strokeColor?: string,
    strokeWidth?: number
  ): Konva.Rect {
    const rect = new Konva.Rect({
      x,
      y,
      width: width || SHAPE_DEFAULTS.RECTANGLE.width,
      height: height || SHAPE_DEFAULTS.RECTANGLE.height,
      stroke: strokeColor || '#000000',
      strokeWidth: strokeWidth || SHAPE_DEFAULTS.RECTANGLE.strokeWidth,
      name: 'shape',
      draggable: true,
      shapeType: 'outlined-rectangle'
    });

    console.log('Created outlined rectangle at', x, y);
    return rect;
  }

  createLine(
    x: number, 
    y: number, 
    length?: number, 
    strokeColor?: string,
    strokeWidth?: number
  ): Konva.Line {
    const line = new Konva.Line({
      points: [0, 0, length || SHAPE_DEFAULTS.LINE.length, 0],
      x,
      y,
      stroke: strokeColor || '#000000',
      strokeWidth: strokeWidth || SHAPE_DEFAULTS.LINE.strokeWidth,
      name: 'shape',
      draggable: true,
      shapeType: 'line',
      lineCap: 'round',
      lineJoin: 'round'
    });

    // Add transform handler for the line
    line.on('transform', () => {
      const scaleX = line.scaleX();
      const scaleY = line.scaleY();
      const oldPoints = line.points();

      let newEndX = oldPoints[2] * scaleX;
      let newEndY = oldPoints[3] * scaleY;

      line.points([0, 0, newEndX, newEndY]);
      line.scaleX(1);
      line.scaleY(1);
    });

    console.log('Created line at', x, y);
    return line;
  }

  createText(
    x: number,
    y: number,
    text?: string,
    fontSize?: number,
    fontFamily?: string,
    color?: string
  ): Konva.Text {
    const textNode = new Konva.Text({
      x,
      y,
      text: text || 'Click to edit text',
      fontSize: fontSize || 20,
      fontFamily: fontFamily || 'Calibri',
      fill: color || 'black',
      draggable: true,
      name: 'text',
      padding: 5,
      width: 200,
      height: 30,
      wrap: 'word',
      ellipsis: false,
    });

    console.log('Created text node at', x, y);
    return textNode;
  }

  createImage(
    x: number,
    y: number,
    src: string,
    width?: number,
    height?: number,
    isClientLogo?: boolean
  ): Promise<Konva.Image> {
    return new Promise((resolve, reject) => {
      Konva.Image.fromURL(src, (imageNode) => {
        imageNode.setAttrs({
          x,
          y,
          width: width || 50,
          height: height || 50,
          draggable: true,
          name: 'image',
          src,
          isClientLogo: !!isClientLogo
        });
        
        console.log('Created image node at', x, y);
        resolve(imageNode);
      }, (error) => {
        console.error('Error creating image:', error);
        reject(error);
      });
    });
  }

  // Shape property getters and setters
  getShapeStrokeWidth(shape: Konva.Node): number {
    if (shape && shape.attrs.strokeWidth) {
      return shape.attrs.strokeWidth;
    }
    return SHAPE_DEFAULTS.RECTANGLE.strokeWidth;
  }

  setShapeStrokeWidth(shape: Konva.Node, width: number): void {
    if (shape && shape.attrs.stroke && width >= 1 && width <= 20) {
      shape.setAttr('strokeWidth', width);
    }
  }

  getShapeType(shape: Konva.Node): string {
    if (shape && shape.attrs.shapeType) {
      return shape.attrs.shapeType;
    }
    return '';
  }

  getShapeWidth(shape: Konva.Node): number {
    if (shape instanceof Konva.Shape) {
      return shape.width();
    }
    return 0;
  }

  setShapeWidth(shape: Konva.Node, width: number): void {
    if (shape instanceof Konva.Shape && width > 0) {
      shape.width(width);
    }
  }

  getShapeHeight(shape: Konva.Node): number {
    if (shape instanceof Konva.Shape) {
      return shape.height();
    }
    return 0;
  }

  setShapeHeight(shape: Konva.Node, height: number): void {
    if (shape instanceof Konva.Shape && height > 0) {
      shape.height(height);
    }
  }

  getShapeFill(shape: Konva.Node, defaultColor = '#000000'): string {
    if (shape instanceof Konva.Shape) {
      const fill = shape.fill();
      return typeof fill === 'string' ? fill : defaultColor;
    }
    return defaultColor;
  }

  setShapeFill(shape: Konva.Node, color: string): void {
    if (shape instanceof Konva.Shape) {
      shape.fill(color);
    }
  }

  getShapeStroke(shape: Konva.Node, defaultColor = '#000000'): string {
    if (shape instanceof Konva.Shape) {
      const stroke = shape.stroke();
      return typeof stroke === 'string' ? stroke : defaultColor;
    }
    return defaultColor;
  }

  setShapeStroke(shape: Konva.Node, color: string): void {
    if (shape instanceof Konva.Shape) {
      shape.stroke(color);
    }
  }

  getShapeDisplayColor(shape: Konva.Node, defaultColor = '#000000'): string {
    if (shape instanceof Konva.Shape) {
      const fill = shape.fill();
      const stroke = shape.stroke();
      // Prioritize fill, then stroke, then default
      if (typeof fill === 'string') return fill;
      if (typeof stroke === 'string') return stroke;
    }
    return defaultColor;
  }

  updateShapeColor(shape: Konva.Node, color: string): void {
    if (!shape) return;

    // Update the shape color based on its type
    if (shape.attrs.fill && shape.attrs.shapeType === 'filled-rectangle') {
      // Update fill color for filled shapes
      shape.setAttr('fill', color);
    } else if (shape.attrs.stroke) {
      // Update stroke color for outlined shapes and lines
      shape.setAttr('stroke', color);
    }
  }

  // Text-specific methods for text nodes
  getTextFontSize(textNode: Konva.Text): number {
    return textNode.fontSize();
  }

  setTextFontSize(textNode: Konva.Text, fontSize: number): void {
    if (fontSize > 0 && fontSize <= 200) {
      textNode.fontSize(fontSize);
    }
  }

  getTextFontFamily(textNode: Konva.Text): string {
    return textNode.fontFamily();
  }

  setTextFontFamily(textNode: Konva.Text, fontFamily: string): void {
    textNode.fontFamily(fontFamily);
  }

  getTextFill(textNode: Konva.Text, defaultColor = '#000000'): string {
    const fill = textNode.fill();
    return typeof fill === 'string' ? fill : defaultColor;
  }

  setTextFill(textNode: Konva.Text, color: string): void {
    textNode.fill(color);
  }

  getTextFontStyle(textNode: Konva.Text): string {
    return textNode.fontStyle() || 'normal';
  }

  setTextFontStyle(textNode: Konva.Text, fontStyle: 'bold' | 'normal'): void {
    textNode.fontStyle(fontStyle);
  }

  isTextBold(textNode: Konva.Text): boolean {
    const fontStyle = textNode.fontStyle();
    const fontWeight = textNode.attrs.fontWeight;
    return fontStyle === 'bold' || fontWeight === 'bold' || (typeof fontWeight === 'number' && fontWeight >= 700);
  }

  // Image-specific methods
  getImageWidth(imageNode: Konva.Image): number {
    return imageNode.width();
  }

  setImageWidth(imageNode: Konva.Image, width: number): void {
    if (width > 0) {
      imageNode.width(width);
    }
  }

  getImageHeight(imageNode: Konva.Image): number {
    return imageNode.height();
  }

  setImageHeight(imageNode: Konva.Image, height: number): void {
    if (height > 0) {
      imageNode.height(height);
    }
  }

  // Generic node position methods
  getNodePosition(node: Konva.Node): { x: number; y: number } {
    return {
      x: node.x(),
      y: node.y()
    };
  }

  setNodePosition(node: Konva.Node, x: number, y: number): void {
    node.x(x);
    node.y(y);
  }

  // Node dimensions for any type of node
  getNodeDimensions(node: Konva.Node): { width: number; height: number } {
    const rect = node.getClientRect();
    return { width: rect.width, height: rect.height };
  }
} 