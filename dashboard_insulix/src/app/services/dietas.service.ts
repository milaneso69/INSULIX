import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface DietaCatalogo {
  _id?: string;
  nombre_platillo: string;
  categoria: 'Desayuno' | 'Comida' | 'Cena' | 'Colación';
  platillo: string;
  bebida: string;
  createdAt?: string;
}

export interface AsignacionDieta {
  _id?: string;
  paciente_id: string; 
  dieta_id: string | DietaCatalogo;
  fecha_asignacion: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DietasService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = 'https://insulix-dietas.onrender.com/dietas';

  private getHeaders() {
    const token = this.authService.getJwtToken();
    return { Authorization: `Bearer ${token}` };
  }

  // --- Catálogo ---
  getCatalogo(): Observable<DietaCatalogo[]> {
    return this.http.get<DietaCatalogo[]>(`${this.apiUrl}/catalogo`, { headers: this.getHeaders() });
  }

  createPlatillo(datos: DietaCatalogo): Observable<DietaCatalogo> {
    return this.http.post<DietaCatalogo>(`${this.apiUrl}/catalogo`, datos, { headers: this.getHeaders() });
  }

  updatePlatillo(id: string, datos: Partial<DietaCatalogo>): Observable<DietaCatalogo> {
    return this.http.put<DietaCatalogo>(`${this.apiUrl}/catalogo/${id}`, datos, { headers: this.getHeaders() });
  }

  deletePlatillo(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/catalogo/${id}`, { headers: this.getHeaders() });
  }

  // --- Asignaciones ---
  getAsignaciones(pacienteId?: string): Observable<any[]> {
    let url = `${this.apiUrl}/asignaciones`;
    if (pacienteId) url += `?paciente_id=${pacienteId}`;
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }

  assignDieta(pacienteId: string, dietaId: string): Observable<AsignacionDieta> {
    const payload = {
      paciente_id: pacienteId,
      dieta_id: dietaId,
      fecha_asignacion: new Date().toISOString()
    };
    return this.http.post<AsignacionDieta>(`${this.apiUrl}/asignaciones`, payload, { headers: this.getHeaders() });
  }
}

