import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VideoPickerComponent } from './video-picker.component';
import { VideoSummary } from '../../../models/video.model';

const ready = (id: string): VideoSummary => ({
  id, status: 'READY', originalName: id + '.mp4', url: '/api/videos/files/' + id + '.mp4',
  poster: null, hls: null, durationSeconds: 65, width: 1920, height: 1080,
  createdAt: null, errorMessage: null, usedBy: [],
});

describe('VideoPickerComponent', () => {
  let fixture: ComponentFixture<VideoPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [VideoPickerComponent] }).compileComponents();
    fixture = TestBed.createComponent(VideoPickerComponent);
  });

  it('ne liste que les vidéos READY', () => {
    fixture.componentInstance.videos = [ready('vid-1'),
      { ...ready('vid-2'), status: 'PROCESSING' }];
    fixture.detectChanges();
    expect(fixture.componentInstance['readyVideos']().length).toBe(1);
  });

  it('émet selected(videoId) au choix', () => {
    let picked: string | undefined;
    fixture.componentInstance.selected.subscribe((id: string) => picked = id);
    fixture.componentInstance.select(ready('vid-9'));
    expect(picked).toBe('vid-9');
  });

  it('formate la durée en mm:ss', () => {
    expect(fixture.componentInstance.fmtDuration(65)).toBe('1:05');
    expect(fixture.componentInstance.fmtDuration(null)).toBe('');
  });
});
