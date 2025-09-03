import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type EditorContext = 'text' | 'image' | 'placeholder' | 'shape' | 'none';

@Injectable({ providedIn: 'root' })
export class EditorContextService {
  private readonly contextTypeSubject = new BehaviorSubject<EditorContext>('none');
  readonly contextType$ = this.contextTypeSubject.asObservable();

  setContextType(type: EditorContext): void {
    this.contextTypeSubject.next(type);
  }
}


