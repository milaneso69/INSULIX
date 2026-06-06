import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface ActividadCatalogo {
  _id?: string;
  nombre_ejercicio: string;
  duracion_min: number;
  intensidad: string;
  medico_id?: string;
}

export interface AsignacionActividad {
  _id?: string;
  paciente_id: string;
  medico_id?: string;
  actividad_id: ActividadCatalogo | string;
  notas_medicas: string;
  fecha: string;
  paciente_nombre?: string; // Campo virtual para UI
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = 'https://insulix-actividad.onrender.com/actividad';

  private getHeaders(): HttpHeaders {
    const token = this.authService.getJwtToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // --- Catálogo ---
  getCatalogo(): Observable<ActividadCatalogo[]> {
    return this.http.get<ActividadCatalogo[]>(`${this.apiUrl}/catalogo`, { headers: this.getHeaders() });
  }

  createActividad(actividad: ActividadCatalogo): Observable<ActividadCatalogo> {
    return this.http.post<ActividadCatalogo>(`${this.apiUrl}/catalogo`, actividad, { headers: this.getHeaders() });
  }

  deleteActividad(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/catalogo/${id}`, { headers: this.getHeaders() });
  }

  // --- Asignaciones ---
  getAsignaciones(pacienteId?: string): Observable<AsignacionActividad[]> {
    let url = `${this.apiUrl}/asignaciones`;
    if (pacienteId) url += `?paciente_id=${pacienteId}`;
    return this.http.get<AsignacionActividad[]>(url, { headers: this.getHeaders() });
  }

  assignActividad(asignacion: any): Observable<AsignacionActividad> {
    return this.http.post<AsignacionActividad>(`${this.apiUrl}/asignaciones`, asignacion, { headers: this.getHeaders() });
  }

  deleteAsignacion(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/asignaciones/${id}`, { headers: this.getHeaders() });
  }
}
