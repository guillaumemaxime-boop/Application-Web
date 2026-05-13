import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Furniture } from '../models/furniture.model';
import { Exhibition } from '../models/exhibition.model';
import { Profile } from '../models/profile.model';
import { SiteContent } from '../models/site-content.model';
import { Photo } from '../models/photo.model';
import { HomePageData, AdminFeedEntry, AdminCategoryView } from '../models/home.model';
import { Slide } from '../models/slide.model';

const API = '/api';

@Injectable({ providedIn: 'root' })
export class PortfolioService {
  private readonly http = inject(HttpClient);

  getAllFurniture(): Observable<Furniture[]> {
    return this.http.get<Furniture[]>(`${API}/furniture`);
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
    return this.http.post<Furniture>(`${API}/furniture`, input);
  }

  updateFurniture(slug: string, input: Partial<Furniture>): Observable<Furniture> {
    return this.http.put<Furniture>(`${API}/furniture/${slug}`, input);
  }

  deleteFurniture(slug: string): Observable<void> {
    return this.http.delete<void>(`${API}/furniture/${slug}`);
  }

  getAllExhibitions(): Observable<Exhibition[]> {
    return this.http.get<Exhibition[]>(`${API}/exhibitions`);
  }

  getFeaturedExhibitions(): Observable<Exhibition[]> {
    return this.http.get<Exhibition[]>(`${API}/exhibitions/featured`);
  }

  getExhibition(slug: string): Observable<Exhibition> {
    return this.http.get<Exhibition>(`${API}/exhibitions/${slug}`);
  }

  createExhibition(input: Partial<Exhibition>): Observable<Exhibition> {
    return this.http.post<Exhibition>(`${API}/exhibitions`, input);
  }

  updateExhibition(slug: string, input: Partial<Exhibition>): Observable<Exhibition> {
    return this.http.put<Exhibition>(`${API}/exhibitions/${slug}`, input);
  }

  deleteExhibition(slug: string): Observable<void> {
    return this.http.delete<void>(`${API}/exhibitions/${slug}`);
  }

  getProfile(): Observable<Profile> {
    return this.http.get<Profile>(`${API}/profile`);
  }

  getContent(): Observable<SiteContent> {
    return this.http.get<SiteContent>(`${API}/content`);
  }

  updateContent(content: SiteContent): Observable<SiteContent> {
    return this.http.put<SiteContent>(`${API}/content`, content);
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
    return this.http.get<HomePageData>(`${API}/home`);
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
    return this.http.put<AdminFeedEntry[]>(`${API}/admin/home/feed`, entries);
  }

  getAdminCategories(): Observable<AdminCategoryView[]> {
    return this.http.get<AdminCategoryView[]>(`${API}/admin/categories`);
  }

  updateAdminCategory(category: string, input: AdminCategoryView): Observable<AdminCategoryView> {
    return this.http.put<AdminCategoryView>(`${API}/admin/categories/${encodeURIComponent(category)}`, input);
  }
}
