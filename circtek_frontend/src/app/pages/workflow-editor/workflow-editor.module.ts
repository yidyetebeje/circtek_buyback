import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// No @angular/forms needed; component uses signals for form state
 // Corrected Import Foblex Flow module name again

import { WorkflowEditorComponent } from './workflow-editor.component';
import { NodePaletteComponent } from './components/node-palette/node-palette.component';
import { DecisionNodeComponent } from './decision-node/decision-node.component'; // Import DecisionNodeComponent (standalone)
import { TripleDecisionNodeComponent } from './triple-decision-node/triple-decision-node.component'; // Import TripleDecisionNodeComponent (standalone)
import { StandardNodeComponent } from './standard-node/standard-node.component';
import { YesNoDecisionNodeComponent } from './yes-no-decision-node/yes-no-decision-node.component';
import { GenericModalComponent } from '../../shared/components/generic-modal/generic-modal.component';
import { LucideAngularModule, ArrowLeft, Unlink, Trash2, Maximize2, Home, Grid, Minus, Plus, Save, ChevronDown, ChevronRight } from 'lucide-angular';
// Import other components used within this module if any

@NgModule({
  imports: [
    CommonModule,
    LucideAngularModule.pick({ ArrowLeft, Unlink, Trash2, Maximize2, Home, Grid, Minus, Plus, Save, ChevronDown, ChevronRight }),
    WorkflowEditorComponent,
    DecisionNodeComponent,
    TripleDecisionNodeComponent,
    StandardNodeComponent,
    YesNoDecisionNodeComponent,
    GenericModalComponent,
    NodePaletteComponent
  ],
  exports: [
    WorkflowEditorComponent
  ]
})
export class WorkflowEditorModule { }
