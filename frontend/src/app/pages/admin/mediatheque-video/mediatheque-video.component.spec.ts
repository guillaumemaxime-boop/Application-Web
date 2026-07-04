import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { MediathequeVideoComponent } from './mediatheque-video.component';
import { PortfolioService } from '../../../services/portfolio.service';
import { ToastService } from '../shared/toast.service';
import { VideoSummary } from '../../../models/video.model';

const used: VideoSummary = { id: 'vid-u', status: 'READY', originalName: 'u.mp4', url: null,
  poster: null, hls: null, durationSeconds: null, width: null, height: null, createdAt: null,
  errorMessage: null, usedBy: [{ type: 'furniture', label: 'Chaise', slug: 'chaise' }] };
const orphan: VideoSummary = { ...used, id: 'vid-o', originalName: 'o.mp4', usedBy: [] };

describe('MediathequeVideoComponent', () => {
  let fixture: ComponentFixture<MediathequeVideoComponent>;
  let portfolio: jasmine.SpyObj<PortfolioService>;

  beforeEach(async () => {
    portfolio = jasmine.createSpyObj('PortfolioService',
      ['getVideos', 'deleteVideoById', 'uploadVideo', 'getVideoStatus', 'retryVideo']);
    portfolio.getVideos.and.returnValue(of([used, orphan]));
    portfolio.deleteVideoById.and.returnValue(of(void 0));
    await TestBed.configureTestingModule({
      imports: [MediathequeVideoComponent],
      providers: [
        provideRouter([]),
        { provide: PortfolioService, useValue: portfolio },
        { provide: ToastService, useValue: jasmine.createSpyObj('ToastService', ['success', 'error']) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(MediathequeVideoComponent);
    fixture.detectChanges();
  });

  it('charge les vidéos au démarrage', () => {
    expect(fixture.componentInstance['videos']().length).toBe(2);
  });

  it('canDelete=false si la vidéo est utilisée', () => {
    expect(fixture.componentInstance.canDelete(used)).toBeFalse();
    expect(fixture.componentInstance.canDelete(orphan)).toBeTrue();
  });

  it('remove ne supprime pas une vidéo utilisée', () => {
    fixture.componentInstance.remove(used);
    expect(portfolio.deleteVideoById).not.toHaveBeenCalled();
  });

  it('play() active le lecteur en place de la carte', () => {
    fixture.componentInstance.play(orphan);
    expect(fixture.componentInstance['activePlayerId']()).toBe('vid-o');
  });
});
