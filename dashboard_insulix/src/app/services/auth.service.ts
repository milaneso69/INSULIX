import { inject, Injectable, EnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, user, getIdToken } from '@angular/fire/auth';
import { HttpClient } from '@angular/common/http';
import { Observable, from, switchMap, take, lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private http = inject(HttpClient);
  private injector = inject(EnvironmentInjector);
  
  user$ = user(this.auth);
  private apiUrl = 'https://insulix-users.onrender.com';

  currentUser = signal<any>(null);

  constructor() {
    const token = this.getJwtToken();
    if (token) {
      this.decodeAndSetUser(token);
    }
  }

  registerMedico(email: string, pass: string, datosMedico: any) {
    return runInInjectionContext(this.injector, () => {
      return from(createUserWithEmailAndPassword(this.auth, email, pass)).pipe(
        switchMap(result => {
          const url = `${this.apiUrl}/users/medico/signup`; 
          const payload = {
            uid: result.user.uid,
            email: email,
            ...datosMedico
          };
          return this.http.post(url, payload);
        })
      );
    });
  }

  async login(email: string, pass: string) {
    // 1. Firebase Login (Siempre en contexto por precaución)
    const userCredential = await runInInjectionContext(this.injector, () => 
      signInWithEmailAndPassword(this.auth, email, pass)
    );
    
    const idToken = await runInInjectionContext(this.injector, () => 
      getIdToken(userCredential.user)
    );
    
    // 2. Obtener JWT personalizado de nuestro backend (localhost:3000)
    // El Interceptor lo ignorará porque detectará que ya lleva el header Authorization
    const response = await lastValueFrom(
      this.http.get<{ valid: boolean, access_token: string, user: any }>(
        'https://insulix-auth.onrender.com/verify',
        { headers: { Authorization: `Bearer ${idToken}` } }
      )
    );

    if (response && response.access_token) {
      this.setJwtToken(response.access_token);
    }
    
    return response;
  }

  setJwtToken(token: string) {
    localStorage.setItem('jwt_token', token);
    this.decodeAndSetUser(token);
  }

  getJwtToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  removeJwtToken() {
    localStorage.removeItem('jwt_token');
    this.currentUser.set(null);
  }

  private decodeAndSetUser(token: string) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const binaryString = window.atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const decoded = JSON.parse(new TextDecoder().decode(bytes));
      this.currentUser.set(decoded);
    } catch (e) {
      console.error('Error decoding JWT', e);
      this.currentUser.set(null);
    }
  }

  logout() {
    this.removeJwtToken();
    return runInInjectionContext(this.injector, () => {
      return from(signOut(this.auth));
    });
  }

  getToken(): Observable<string | null> {
    return this.user$.pipe(
      take(1),
      switchMap(async (user) => {
        if (!user) return null;
        return runInInjectionContext(this.injector, () => getIdToken(user));
      })
    );
  }

  // --- MÉTODOS 2FA ---
  generate2FACode(uid: string, email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/2fa/generate`, { uid, email });
  }

  verify2FACode(uid: string, code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/2fa/verify`, { uid, code });
  }

  // --- MÉTODOS 2FA PARA REGISTRO (SIN UID) ---
  generateRegistration2FA(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/2fa/generate-temp`, { email });
  }

  verifyRegistration2FA(email: string, code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/2fa/verify-temp`, { email, code });
  }


  // --- MÉTODOS DE SEGURIDAD (LOCKOUT) ---
  checkLockoutStatus(email: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/auth/status/${email}`);
  }

  logLoginFailure(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/auth/fail`, { email });
  }

  resetLoginAttempts(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/auth/reset`, { email });
  }
}