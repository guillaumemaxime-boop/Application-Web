import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { StoryCreateModalComponent } from './story-create-modal.component';
import { PortfolioService } from '../../../services/portfolio.service';

describe('StoryCreateModalComponent', () => {
  let fixture: ComponentFixture<StoryCreateModalComponent>;
  let portfolio: jasmine.SpyObj<PortfolioService>;

  beforeEach(async () => {
    portfolio = jasmine.createSpyObj('PortfolioService',
      ['getAllFurniture', 'getAllExhibitions', 'getAdminSliders', 'createStory', 'replaceSliderStories']);
    portfolio.getAllFurniture.and.returnValue(of([{ id: 'f-1', slug: 'f1', title: 'Meuble 1' } as any]));
    portfolio.getAllExhibitions.and.returnValue(of([{ id: 'e-1', slug: 'e1', title: 'Expo 1' } as any]));
    portfolio.getAdminSliders.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [StoryCreateModalComponent],
      providers: [provideHttpClient(), { provide: PortfolioService, useValue: portfolio }],
    }).compileComponents();
    fixture = TestBed.createComponent(StoryCreateModalComponent);
    fixture.detectChanges();
  });

  it('création : appelle createStory avec owner + titre', () => {
    const emitted: string[] = [];
    portfolio.createStory.and.returnValue(of({ id: 'st-new' } as any));
    fixture.componentInstance.created.subscribe((id: string) => emitted.push(id));
    const c = fixture.componentInstance;
    c.ownerKey.set('furniture::f-1'); c.title.set('Ma story');
    c.submit();
    expect(portfolio.createStory).toHaveBeenCalled();
    expect(emitted).toEqual(['st-new']);
  });
});
