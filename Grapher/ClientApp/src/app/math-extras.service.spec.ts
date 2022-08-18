import { TestBed } from '@angular/core/testing';

import { MathExtrasService } from './math-extras.service';

describe('MathExtrasService', () => {
  let service: MathExtrasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MathExtrasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
