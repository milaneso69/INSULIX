import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhysicalActivity } from './physical-activity';

describe('PhysicalActivity', () => {
  let component: PhysicalActivity;
  let fixture: ComponentFixture<PhysicalActivity>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhysicalActivity],
    }).compileComponents();

    fixture = TestBed.createComponent(PhysicalActivity);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
