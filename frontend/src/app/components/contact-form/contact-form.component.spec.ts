import { TestBed } from '@angular/core/testing';
import { ContactFormComponent } from './contact-form.component';
import { PortfolioService } from '../../services/portfolio.service';
import { of, throwError } from 'rxjs';
import { ContactRequestAck } from '../../models/contact.model';

describe('ContactFormComponent', () => {
  let portfolioSpy: jasmine.SpyObj<PortfolioService>;

  function setup(input: { id?: string; slug?: string; title?: string } = {}) {
    portfolioSpy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['submitContact']);
    TestBed.configureTestingModule({
      imports: [ContactFormComponent],
      providers: [{ provide: PortfolioService, useValue: portfolioSpy }],
    });
    const fixture = TestBed.createComponent(ContactFormComponent);
    fixture.componentRef.setInput('furnitureId', input.id ?? null);
    fixture.componentRef.setInput('furnitureSlug', input.slug ?? null);
    fixture.componentRef.setInput('furnitureTitle', input.title ?? null);
    fixture.detectChanges();
    return fixture;
  }

  function fillForm(fixture: ReturnType<typeof setup>, overrides: Partial<{
    name: string; email: string; phone: string; interest: string; message: string;
  }> = {}) {
    const c = fixture.componentInstance as any;
    c.form.name = overrides.name ?? 'Jean';
    c.form.email = overrides.email ?? 'jean@example.com';
    c.form.phone = overrides.phone ?? '';
    c.form.interest = overrides.interest ?? 'acquisition';
    c.form.message = overrides.message ?? 'Bonjour, je suis intéressé.';
    fixture.detectChanges();
  }

  it('should render the contextual title when furnitureTitle is provided', () => {
    const fixture = setup({ title: 'Onde' });
    expect(fixture.nativeElement.textContent).toContain('Demande — Onde');
  });

  it('should render a generic title when no furniture is in context', () => {
    const fixture = setup();
    expect(fixture.nativeElement.textContent).toContain('Contacter le studio');
    expect(fixture.nativeElement.textContent).not.toContain('Demande —');
  });

  it('should emit closed when the close button is clicked', () => {
    const fixture = setup();
    const c = fixture.componentInstance as any;
    spyOn(c.closed, 'emit');
    (fixture.nativeElement.querySelector('.close') as HTMLButtonElement).click();
    expect(c.closed.emit).toHaveBeenCalled();
  });

  it('should emit closed when the backdrop is clicked', () => {
    const fixture = setup();
    const c = fixture.componentInstance as any;
    spyOn(c.closed, 'emit');
    const backdrop = fixture.nativeElement.querySelector('.backdrop');
    const event = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: backdrop, enumerable: true });
    backdrop.dispatchEvent(event);
    expect(c.closed.emit).toHaveBeenCalled();
  });

  it('should send the form including furniture context when submitted', () => {
    portfolioSpy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['submitContact']);
    const ack: ContactRequestAck = { id: 'c-1', createdAt: '2026-05-16T00:00:00Z', status: 'NEW' };
    portfolioSpy.submitContact.and.returnValue(of(ack));
    TestBed.configureTestingModule({
      imports: [ContactFormComponent],
      providers: [{ provide: PortfolioService, useValue: portfolioSpy }],
    });
    const fixture = TestBed.createComponent(ContactFormComponent);
    fixture.componentRef.setInput('furnitureId', 'f-1');
    fixture.componentRef.setInput('furnitureSlug', 'onde');
    fixture.componentRef.setInput('furnitureTitle', 'Onde');
    fixture.detectChanges();

    const c = fixture.componentInstance as any;
    c.form.name = 'Jean';
    c.form.email = 'jean@example.com';
    c.form.message = 'Bonjour.';
    c.form.interest = 'acquisition';
    fixture.detectChanges();

    c.submit();

    expect(portfolioSpy.submitContact).toHaveBeenCalledWith({
      name: 'Jean',
      email: 'jean@example.com',
      phone: '',
      interest: 'acquisition',
      message: 'Bonjour.',
      furnitureId: 'f-1',
      furnitureSlug: 'onde',
      furnitureTitle: 'Onde',
    });
    expect(c.status()).toBe('success');
  });

  it('should switch to success state and show thanks message after success', () => {
    portfolioSpy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['submitContact']);
    portfolioSpy.submitContact.and.returnValue(of({ id: 'c-1', createdAt: 't', status: 'NEW' } as ContactRequestAck));
    TestBed.configureTestingModule({
      imports: [ContactFormComponent],
      providers: [{ provide: PortfolioService, useValue: portfolioSpy }],
    });
    const fixture = TestBed.createComponent(ContactFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    c.form.email = 'a@b.fr';
    c.form.name = 'Test';
    c.form.message = 'Hello';
    c.submit();
    fixture.detectChanges();
    expect(c.status()).toBe('success');
    expect(fixture.nativeElement.textContent).toContain('Demande envoyée');
    expect(fixture.nativeElement.textContent).toContain('a@b.fr');
  });

  it('should switch to error state when the service fails', () => {
    portfolioSpy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['submitContact']);
    portfolioSpy.submitContact.and.returnValue(throwError(() => new Error('boom')));
    TestBed.configureTestingModule({
      imports: [ContactFormComponent],
      providers: [{ provide: PortfolioService, useValue: portfolioSpy }],
    });
    const fixture = TestBed.createComponent(ContactFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    c.form.email = 'a@b.fr';
    c.form.name = 'Test';
    c.form.message = 'Hello';
    c.submit();
    fixture.detectChanges();
    expect(c.status()).toBe('error');
    expect(fixture.nativeElement.textContent).toContain('échoué');
  });

  it('renders inline mode without backdrop or close button', () => {
    portfolioSpy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['submitContact']);
    TestBed.configureTestingModule({
      imports: [ContactFormComponent],
      providers: [{ provide: PortfolioService, useValue: portfolioSpy }],
    });
    const fixture = TestBed.createComponent(ContactFormComponent);
    fixture.componentRef.setInput('inline', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.backdrop')).toBeNull();
    expect(fixture.nativeElement.querySelector('.close')).toBeNull();
    expect(fixture.nativeElement.querySelector('.inline-wrap')).not.toBeNull();
  });

  it('close() is a no-op when inline', () => {
    portfolioSpy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['submitContact']);
    TestBed.configureTestingModule({
      imports: [ContactFormComponent],
      providers: [{ provide: PortfolioService, useValue: portfolioSpy }],
    });
    const fixture = TestBed.createComponent(ContactFormComponent);
    fixture.componentRef.setInput('inline', true);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    spyOn(c.closed, 'emit');
    c.close();
    expect(c.closed.emit).not.toHaveBeenCalled();
  });

  it('onBackdropClick is a no-op when inline', () => {
    portfolioSpy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['submitContact']);
    TestBed.configureTestingModule({
      imports: [ContactFormComponent],
      providers: [{ provide: PortfolioService, useValue: portfolioSpy }],
    });
    const fixture = TestBed.createComponent(ContactFormComponent);
    fixture.componentRef.setInput('inline', true);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    spyOn(c.closed, 'emit');
    c.onBackdropClick({ target: document.createElement('div') } as unknown as MouseEvent);
    expect(c.closed.emit).not.toHaveBeenCalled();
  });

  it('onBackdropClick does not close when target is not the backdrop', () => {
    const fixture = setup();
    const c = fixture.componentInstance as any;
    spyOn(c.closed, 'emit');
    c.onBackdropClick({ target: document.createElement('span') } as unknown as MouseEvent);
    expect(c.closed.emit).not.toHaveBeenCalled();
  });

  it('onEscape closes when not submitting', () => {
    const fixture = setup();
    const c = fixture.componentInstance as any;
    spyOn(c.closed, 'emit');
    c.onEscape();
    expect(c.closed.emit).toHaveBeenCalled();
  });

  it('onEscape is a no-op while submitting', () => {
    const fixture = setup();
    const c = fixture.componentInstance as any;
    c.status.set('submitting');
    spyOn(c.closed, 'emit');
    c.onEscape();
    expect(c.closed.emit).not.toHaveBeenCalled();
  });

  it('onEscape is a no-op when inline', () => {
    portfolioSpy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['submitContact']);
    TestBed.configureTestingModule({
      imports: [ContactFormComponent],
      providers: [{ provide: PortfolioService, useValue: portfolioSpy }],
    });
    const fixture = TestBed.createComponent(ContactFormComponent);
    fixture.componentRef.setInput('inline', true);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    spyOn(c.closed, 'emit');
    c.onEscape();
    expect(c.closed.emit).not.toHaveBeenCalled();
  });

  it('resetForm() resets the form fields and the status', () => {
    const fixture = setup();
    const c = fixture.componentInstance as any;
    c.form.name = 'X';
    c.form.email = 'x@y.fr';
    c.form.message = 'hello';
    c.status.set('success');
    c.resetForm();
    expect(c.form.name).toBe('');
    expect(c.form.email).toBe('');
    expect(c.form.message).toBe('');
    expect(c.status()).toBe('idle');
  });

  it('submit() omits furniture context when no inputs are set', () => {
    portfolioSpy = jasmine.createSpyObj<PortfolioService>('PortfolioService', ['submitContact']);
    portfolioSpy.submitContact.and.returnValue(of({ id: 'c', createdAt: 't', status: 'NEW' } as ContactRequestAck));
    TestBed.configureTestingModule({
      imports: [ContactFormComponent],
      providers: [{ provide: PortfolioService, useValue: portfolioSpy }],
    });
    const fixture = TestBed.createComponent(ContactFormComponent);
    fixture.detectChanges();
    const c = fixture.componentInstance as any;
    c.form.email = 'a@b.fr';
    c.form.name = 'X';
    c.form.message = 'hello';
    c.submit();
    expect(portfolioSpy.submitContact).toHaveBeenCalledWith(jasmine.objectContaining({
      furnitureId: '', furnitureSlug: '', furnitureTitle: '',
    }));
  });
});
