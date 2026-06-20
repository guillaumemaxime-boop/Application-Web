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

  it('affiche 5 cartes d\'action', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.action-card')).length).toBe(5);
  });

  it('a une carte « Nouvelle story » vers /admin/stories?new=1', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    const card = fixture.debugElement.queryAll(By.css('.action-card'))
      .find(de => (de.nativeElement as HTMLElement).textContent?.includes('Nouvelle story'));
    expect(card).toBeTruthy();
    expect((card!.nativeElement as HTMLElement).getAttribute('href')).toContain('/admin/stories');
  });
});
