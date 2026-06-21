import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap, shareReplay } from 'rxjs';
import { Furniture } from '../models/furniture.model';
import { Exhibition } from '../models/exhibition.model';
import { Profile } from '../models/profile.model';
import { SiteContent } from '../models/site-content.model';
import { Photo } from '../models/photo.model';
import { HomePageData, AdminFeedEntry, AdminCategoryView, AdminExhibitionMetaView } from '../models/home.model';
import { Crop } from '../models/crop.model';
import { Slide } from '../models/slide.model';
import { ContactRequestInput, ContactRequestAck } from '../models/contact.model';
import { MailSettingsView, MailSettingsInput, MailTestResult } from '../models/mail-settings.model';
import { Story, StoryInput, StoryWithSlides, StoryAdminView } from '../models/story.model';
import { NewsSlider, NewsSliderInput, NewsSliderView } from '../models/news-slider.model';
import { VideoStatus, VideoStatusDto } from '../models/video.model';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly http = inject(HttpClient);

  private home$: Observable<HomePageData> | null = null;
  private allFurniture$: Observable<Furniture[]> | null = null;
  private allExhibitions$: Observable<Exhibition[]> | null = null;
  private profile$: Observable<Profile> | null = null;
  private content$: Observable<SiteContent> | null = null;

  private invalidateCatalog(): void {
    this.home$ = null;
    this.allFurniture$ = null;
    this.allExhibitions$ = null;
  }

  getAllFurniture(): Observable<Furniture[]> {
    this.allFurniture$ ??= this.http.get<Furniture[]>(`${API}/furniture`).pipe(shareReplay(1));
    return this.allFurniture$;
  }

  getFeaturedFurniture(): Observable<Furniture[]> {
    return this.http.get<Furniture[]>(`${API}/furniture/featured`);
  }

  getFurnitureCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${API}/furniture/categories`);
  }

  getFurniture(slug: string): Observable<Furniture> {
    return this.http.get<Furniture>(`${API}/furniture/${slug}`);
  }

  createFurniture(input: Partial<Furniture>): Observable<Furniture> {
    return this.http.post<Furniture>(`${API}/furniture`, input).pipe(
      tap(() => this.invalidateCatalog())
    );
  }

  updateFurniture(slug: string, input: Partial<Furniture>): Observable<Furniture> {
    return this.http.put<Furniture>(`${API}/furniture/${slug}`, input).pipe(
      tap(() => this.invalidateCatalog())
    );
  }

  deleteFurniture(slug: string): Observable<void> {
    return this.http.delete<void>(`${API}/furniture/${slug}`).pipe(
      tap(() => this.invalidateCatalog())
    );
  }

  getAllExhibitions(): Observable<Exhibition[]> {
    this.allExhibitions$ ??= this.http.get<Exhibition[]>(`${API}/exhibitions`).pipe(shareReplay(1));
    return this.allExhibitions$;
  }

  getFeaturedExhibitions(): Observable<Exhibition[]> {
    return this.http.get<Exhibition[]>(`${API}/exhibitions/featured`);
  }

  getExhibition(slug: string): Observable<Exhibition> {
    return this.http.get<Exhibition>(`${API}/exhibitions/${slug}`);
  }

  createExhibition(input: Partial<Exhibition>): Observable<Exhibition> {
    return this.http.post<Exhibition>(`${API}/exhibitions`, input).pipe(
      tap(() => this.invalidateCatalog())
    );
  }

  updateExhibition(slug: string, input: Partial<Exhibition>): Observable<Exhibition> {
    return this.http.put<Exhibition>(`${API}/exhibitions/${slug}`, input).pipe(
      tap(() => this.invalidateCatalog())
    );
  }

  deleteExhibition(slug: string): Observable<void> {
    return this.http.delete<void>(`${API}/exhibitions/${slug}`).pipe(
      tap(() => this.invalidateCatalog())
    );
  }

  getProfile(): Observable<Profile> {
    this.profile$ ??= this.http.get<Profile>(`${API}/profile`).pipe(shareReplay(1));
    return this.profile$;
  }

  getContent(): Observable<SiteContent> {
    this.content$ ??= this.http.get<SiteContent>(`${API}/content`).pipe(shareReplay(1));
    return this.content$;
  }

  updateContent(content: SiteContent): Observable<SiteContent> {
    return this.http.put<SiteContent>(`${API}/admin/content`, content).pipe(
      tap(() => { this.content$ = null; })
    );
  }

  getPhotos(): Observable<Photo[]> {
    return this.http.get<Photo[]>(`${API}/photos`);
  }

  uploadPhoto(file: File): Observable<Photo> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<Photo>(`${API}/admin/photos`, fd);
  }

  deletePhoto(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/admin/photos/${id}`);
  }

  uploadVideo(file: File): Observable<{ id: string; status: VideoStatus; filename: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ id: string; status: VideoStatus; filename: string }>(`${API}/admin/videos`, fd);
  }

  uploadCaptions(file: File): Observable<{ url: string; filename: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string; filename: string }>(`${API}/admin/videos`, fd);
  }

  getVideoStatus(id: string): Observable<VideoStatusDto> {
    return this.http.get<VideoStatusDto>(`${API}/admin/videos/${id}`);
  }

  retryVideo(id: string): Observable<void> {
    return this.http.post<void>(`${API}/admin/videos/${id}/retry`, null);
  }

  deleteVideo(filename: string): Observable<void> {
    return this.http.delete<void>(`${API}/admin/videos/files/${filename}`);
  }

  generateVideoHls(): Observable<{ count: number; generated: number }> {
    return this.http.post<{ count: number; generated: number }>(`${API}/admin/videos/hls`, {});
  }

  updatePhotoTags(id: string, tags: string[]): Observable<Photo> {
    return this.http.put<Photo>(`${API}/admin/photos/${id}/tags`, { tags });
  }

  optimizeAllPhotos(): Observable<{ count: number; optimized: number; bytesSaved: number }> {
    return this.http.post<{ count: number; optimized: number; bytesSaved: number }>(`${API}/admin/photos/optimize`, {});
  }

  getHome(): Observable<HomePageData> {
    this.home$ ??= this.http.get<HomePageData>(`${API}/home`).pipe(shareReplay(1));
    return this.home$;
  }

  getAdminFeed(): Observable<AdminFeedEntry[]> {
    return this.http.get<AdminFeedEntry[]>(`${API}/admin/home/feed`);
  }

  replaceAdminFeed(entries: AdminFeedEntry[]): Observable<AdminFeedEntry[]> {
    return this.http.put<AdminFeedEntry[]>(`${API}/admin/home/feed`, entries).pipe(
      tap(() => { this.home$ = null; })
    );
  }

  updateHomeFeedCoverCrop(kind: 'furniture' | 'exhibition', slug: string, crop: Crop | null): Observable<void> {
    return this.http.put<void>(`${API}/admin/home/feed/cover-crop`, { kind, slug, crop }).pipe(
      tap(() => { this.home$ = null; })
    );
  }

  getAdminCategories(): Observable<AdminCategoryView[]> {
    return this.http.get<AdminCategoryView[]>(`${API}/admin/categories`);
  }

  updateAdminCategory(category: string, input: AdminCategoryView): Observable<AdminCategoryView> {
    return this.http.put<AdminCategoryView>(`${API}/admin/categories/${encodeURIComponent(category)}`, input).pipe(
      tap(() => { this.home$ = null; })
    );
  }

  getAdminExhibitionsMeta(): Observable<AdminExhibitionMetaView[]> {
    return this.http.get<AdminExhibitionMetaView[]>(`${API}/admin/exhibitions-meta`);
  }

  updateAdminExhibitionMeta(slug: string, input: AdminExhibitionMetaView): Observable<AdminExhibitionMetaView> {
    return this.http.put<AdminExhibitionMetaView>(`${API}/admin/exhibitions-meta/${encodeURIComponent(slug)}`, input).pipe(
      tap(() => { this.home$ = null; })
    );
  }

  submitContact(input: ContactRequestInput): Observable<ContactRequestAck> {
    return this.http.post<ContactRequestAck>(`${API}/contact`, input);
  }

  getMailSettings(): Observable<MailSettingsView> {
    return this.http.get<MailSettingsView>(`${API}/admin/mail-settings`);
  }

  saveMailSettings(input: MailSettingsInput): Observable<MailSettingsView> {
    return this.http.put<MailSettingsView>(`${API}/admin/mail-settings`, input);
  }

  testMail(): Observable<MailTestResult> {
    return this.http.post<MailTestResult>(`${API}/admin/mail-settings/test`, {});
  }

  // --- Stories ---

  getStories(ownerKind: 'furniture' | 'exhibition', ownerId: string): Observable<Story[]> {
    return this.http.get<Story[]>(`${API}/stories`, { params: { ownerKind, ownerId } });
  }

  getStoryBySlug(slug: string): Observable<StoryWithSlides> {
    return this.http.get<StoryWithSlides>(`${API}/stories/${slug}`);
  }

  getAdminStories(ownerKind: 'furniture' | 'exhibition', ownerId: string): Observable<Story[]> {
    return this.http.get<Story[]>(`${API}/admin/stories`, { params: { ownerKind, ownerId } });
  }

  getStoriesForManagement(): Observable<StoryAdminView[]> {
    return this.http.get<StoryAdminView[]>(`${API}/admin/stories/manage`);
  }

  createStory(input: StoryInput): Observable<Story> {
    return this.http.post<Story>(`${API}/admin/stories`, input);
  }

  updateStory(id: string, input: StoryInput): Observable<Story> {
    return this.http.put<Story>(`${API}/admin/stories/${id}`, input);
  }

  updateStoryPosition(id: string, position: number): Observable<void> {
    return this.http.put<void>(`${API}/admin/stories/${id}/position`, null, { params: { position: String(position) } });
  }

  deleteStory(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/admin/stories/${id}`);
  }

  getStorySlides(storyId: string): Observable<Slide[]> {
    return this.http.get<Slide[]>(`${API}/admin/stories/${storyId}/slides`);
  }

  replaceStorySlides(storyId: string, slides: Slide[]): Observable<Slide[]> {
    return this.http.put<Slide[]>(`${API}/admin/stories/${storyId}/slides`, slides);
  }

  getAllAdminStories(): Observable<Story[]> {
    return this.http.get<Story[]>(`${API}/admin/stories/all`);
  }

  // --- Tags ---

  getAllTags(): Observable<string[]> {
    return this.http.get<string[]>(`${API}/tags`);
  }

  // --- Sliders ---

  getPublicSliders(): Observable<NewsSliderView[]> {
    return this.http.get<NewsSliderView[]>(`${API}/sliders`);
  }

  getAdminSliders(): Observable<NewsSlider[]> {
    return this.http.get<NewsSlider[]>(`${API}/admin/sliders`);
  }

  createSlider(input: NewsSliderInput): Observable<NewsSlider> {
    return this.http.post<NewsSlider>(`${API}/admin/sliders`, input);
  }

  updateSlider(id: string, input: NewsSliderInput): Observable<NewsSlider> {
    return this.http.put<NewsSlider>(`${API}/admin/sliders/${id}`, input);
  }

  deleteSlider(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/admin/sliders/${id}`);
  }

  replaceSliderStories(id: string, storyIds: string[]): Observable<NewsSlider> {
    return this.http.put<NewsSlider>(`${API}/admin/sliders/${id}/stories`, { storyIds });
  }
}
