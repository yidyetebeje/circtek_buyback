import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MultiOutputNodeComponent } from './multi-output-node.component';

describe('MultiOutputNodeComponent', () => {
  let component: MultiOutputNodeComponent;
  let fixture: ComponentFixture<MultiOutputNodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MultiOutputNodeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MultiOutputNodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
