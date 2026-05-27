import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { DashboardComponent } from './dashboard.component';

describe('DashboardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('crée le composant', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('affiche 4 cartes d\'action', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.action-card')).length).toBe(4);
  });
});
