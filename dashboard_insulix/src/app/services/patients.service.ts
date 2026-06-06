import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PatientsService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private apiUrl = 'https://insulix-users.onrender.com/users';

  // Obtener todos los pacientes del médico
  getPacientes(): Observable<any[]> {
    const medId = this.authService.currentUser()?.uid || this.authService.currentUser()?.usuario_id;
    const url = `${this.apiUrl}/paciente?medico_id=${medId}`;
    
    // Es vital enviar el token para que el backend autorice la petición
    const token = this.authService.getJwtToken();
    const headers = { Authorization: `Bearer ${token}` };
    
    return this.http.get<any[]>(url, { headers });
  }

  // Crear un nuevo paciente pasándole el UID real de Firebase
  createPaciente(datosPaciente: any): Observable<any> {
    const medId = this.authService.currentUser()?.uid || this.authService.currentUser()?.usuario_id;
    console.log('Medico ID detectado para registro:', medId);

    const payload = {
      ...datosPaciente,
      medico_id: medId
    };

    const token = this.authService.getJwtToken();
    const headers = { Authorization: `Bearer ${token}` };
    return this.http.post<any>(`${this.apiUrl}/paciente`, payload, { headers });
  }
}
