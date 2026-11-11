import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { jeuGuard } from './jeu.guard';

describe('jeuGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => jeuGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
