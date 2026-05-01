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

  getAllExhibitions(): Observable<Exhibition[]> {
    return this.http.get<Exhibition[]>(`${API}/exhibitions`);
  }

  getFeaturedExhibitions(): Observable<Exhibition[]> {
    return this.http.get<Exhibition[]>(`${API}/exhibitions/featured`);
  }

  getExhibition(slug: string): Observable<Exhibition> {
    return this.http.get<Exhibition>(`${API}/exhibitions/${slug}`);
  }

  getProfile(): Observable<Profile> {
    return this.http.get<Profile>(`${API}/profile`);
  }
}
