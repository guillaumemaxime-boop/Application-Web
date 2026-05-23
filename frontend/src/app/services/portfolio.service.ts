import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, tap, shareReplay } from 'rxjs';
import { Furniture } from '../models/furniture.model';
import { Exhibition } from '../models/exhibition.model';
import { Profile } from '../models/profile.model';
import { SiteContent } from '../models/site-content.model';
import { Photo } from '../models/photo.model';
import { HomePageData, AdminFeedEntry, AdminCategoryView, AdminExhibitionMetaView } from '../models/home.model';
import { Slide } from '../models/slide.model';
import { ContactRequestInput, ContactRequestAck } from '../models/contact.model';
import { MailSettingsView, MailSettingsInput, MailTestResult } from '../models/mail-settings.model';

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
    return this.http.put<SiteContent>(`${API}/content`, content).pipe(
      tap(() => { this.content$ = null; })
    );
  }

  getPhotos(): Observable<Photo[]> {
    return this.http.get<Photo[]>(`${API}/photos`);
  }

  uploadPhoto(file: File): Observable<Photo> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<Photo>(`${API}/photos`, fd);
  }

  deletePhoto(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/photos/${id}`);
  }

  getHome(): Observable<HomePageData> {
    this.home$ ??= this.http.get<HomePageData>(`${API}/home`).pipe(shareReplay(1));
    return this.home$;
  }

  getSlides(kind: 'furniture' | 'exhibition', ownerId: string): Observable<Slide[]> {
    return this.http.get<Slide[]>(`${API}/admin/slides/${kind}/${ownerId}`);
  }

  replaceSlides(kind: 'furniture' | 'exhibition', ownerId: string, slides: Slide[]): Observable<Slide[]> {
    return this.http.put<Slide[]>(`${API}/admin/slides/${kind}/${ownerId}`, slides);
  }

  getAdminFeed(): Observable<AdminFeedEntry[]> {
    return this.http.get<AdminFeedEntry[]>(`${API}/admin/home/feed`);
  }

  replaceAdminFeed(entries: AdminFeedEntry[]): Observable<AdminFeedEntry[]> {
    return this.http.put<AdminFeedEntry[]>(`${API}/admin/home/feed`, entries).pipe(
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
}
