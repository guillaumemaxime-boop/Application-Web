import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { AdminLayoutComponent } from './admin-layout.component';

describe('AdminLayoutComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('crée le composant', () => {
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('affiche le bouton sidebar (mobile)', () => {
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.sidebar-toggle'))).toBeTruthy();
  });

  it('toggleSidebar inverse sidebarOpen', () => {
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as any;
    expect(cmp.sidebarOpen()).toBeFalse();
    cmp.toggleSidebar();
    expect(cmp.sidebarOpen()).toBeTrue();
  });

  it('contient la sidebar groupée (CONTENU / SITE / MESURES)', () => {
    const fixture = TestBed.createComponent(AdminLayoutComponent);
    fixture.detectChanges();
    const html = fixture.nativeElement.textContent as string;
    expect(html).toContain('CONTENU');
    expect(html).toContain('SITE');
    expect(html).toContain('MESURES');
  });
});
