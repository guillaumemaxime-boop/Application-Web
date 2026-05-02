import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Furniture } from '../models/furniture.model';
import { Exhibition } from '../models/exhibition.model';
import { Profile } from '../models/profile.model';

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
}
