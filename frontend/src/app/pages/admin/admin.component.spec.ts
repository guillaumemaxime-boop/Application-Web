import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { AdminComponent } from './admin.component';
import { PortfolioService } from '../../services/portfolio.service';

describe('AdminComponent (legacy)', () => {
  let fixture: ComponentFixture<AdminComponent>;
  let httpMock: HttpTestingController;
  let portfolio: PortfolioService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    portfolio = TestBed.inject(PortfolioService);
    spyOn(portfolio, 'getContent').and.returnValue(of({}));
    spyOn(portfolio, 'getAllFurniture').and.returnValue(of([]));
    spyOn(portfolio, 'getAllExhibitions').and.returnValue(of([]));
    spyOn(portfolio, 'getAdminFeed').and.returnValue(of([]));
    fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('crée le composant', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('affiche 2 tabs (Accueil / Email)', () => {
    const tabs = fixture.debugElement.queryAll(By.css('.tabs button'));
    expect(tabs.length).toBe(2);
  });

  it('switchTab change l\'onglet actif', () => {
    const cmp = fixture.componentInstance as unknown as { tab: () => string; switchTab: (t: string) => void };
    cmp.switchTab('email');
    fixture.detectChanges();
    // MailSettingsComponent charge ses settings au mount — on les évacue
    httpMock.match(r => r.url.includes('/api/admin/mail-settings')).forEach(req => req.flush({}));
    expect(cmp.tab()).toBe('email');
  });

  it('toggleSidebar inverse l\'état ouvert', () => {
    const cmp = fixture.componentInstance as unknown as { sidebarOpen: () => boolean; toggleSidebar: () => void };
    expect(cmp.sidebarOpen()).toBeFalse();
    cmp.toggleSidebar();
    expect(cmp.sidebarOpen()).toBeTrue();
  });

  it('currentTabLabel reflète l\'onglet actif', () => {
    const cmp = fixture.componentInstance as unknown as { currentTabLabel: () => string; switchTab: (t: string) => void };
    expect(cmp.currentTabLabel()).toBe('Accueil');
    cmp.switchTab('email');
    fixture.detectChanges();
    httpMock.match(r => r.url.includes('/api/admin/mail-settings')).forEach(req => req.flush({}));
    expect(cmp.currentTabLabel()).toBe('Email');
  });

  describe('Home feed', () => {
    it('persiste l\'ordre via replaceAdminFeed après réordonnancement', () => {
      const cmp = fixture.componentInstance as unknown as {
        homeItems: { set: (v: unknown) => void };
        onFeedReorder: (order: number[]) => void;
      };
      const replaceSpy = spyOn(portfolio, 'replaceAdminFeed').and.returnValue(of([]));
      cmp.homeItems.set([
        { kind: 'furniture', slug: 'a', title: 'A', cover: '', included: true },
        { kind: 'exhibition', slug: 'b', title: 'B', cover: '', included: true },
      ]);
      cmp.onFeedReorder([1, 0]);
      expect(replaceSpy).toHaveBeenCalled();
    });

    it('toggleIncluded persiste le changement', () => {
      const cmp = fixture.componentInstance as unknown as {
        homeItems: { set: (v: unknown) => void };
        toggleIncluded: (item: unknown, event: Event) => void;
      };
      const replaceSpy = spyOn(portfolio, 'replaceAdminFeed').and.returnValue(of([]));
      const item = { kind: 'furniture', slug: 'a', title: 'A', cover: '', included: true };
      cmp.homeItems.set([item]);
      cmp.toggleIncluded(item, { target: { checked: false } } as unknown as Event);
      expect(replaceSpy).toHaveBeenCalled();
    });
  });

  describe('Navigation toggles', () => {
    it('toggleNavSection met à jour la valeur et persiste via updateContent', () => {
      const cmp = fixture.componentInstance as unknown as {
        navMobilierVisible: () => boolean;
        toggleNavSection: (section: string, event: Event) => void;
      };
      const updateSpy = spyOn(portfolio, 'updateContent').and.returnValue(of({}));
      cmp.toggleNavSection('mobilier', { target: { checked: false } } as unknown as Event);
      expect(cmp.navMobilierVisible()).toBeFalse();
      expect(updateSpy).toHaveBeenCalledWith({ 'nav.mobilier.visible': 'false' });
    });
  });

  describe('Toast stack', () => {
    it('flash ajoute un toast et l\'expire après 4s', fakeAsync(() => {
      const cmp = fixture.componentInstance as unknown as {
        toasts: () => unknown[];
        toggleNavSection: (s: string, e: Event) => void;
      };
      spyOn(portfolio, 'updateContent').and.returnValue(throwError(() => new Error('fail')));
      cmp.toggleNavSection('mobilier', { target: { checked: false } } as unknown as Event);
      expect(cmp.toasts().length).toBe(1);
      tick(4000);
      expect(cmp.toasts().length).toBe(0);
    }));
  });
});
