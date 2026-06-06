import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getJwtToken();

  // Si tenemos un token y la petición va dirigida a nuestro backend local
  // Y NO tiene ya un header de Authorization (como el /verify que usa Firebase ID Token)
  if (token && (req.url.startsWith('http://localhost') || req.url.includes('onrender.com')) && !req.headers.has('Authorization')) {
    const clonedReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(clonedReq);
  }

  return next(req);
};
