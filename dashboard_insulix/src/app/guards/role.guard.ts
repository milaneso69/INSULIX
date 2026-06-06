import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Revisamos en tiempo real si tiene sesión y qué rol tiene
  const user = authService.currentUser();
  
  if (user && user.role === 'MEDICO') {
    return true; // Acceso concedido a todas las rutas detrás de este guard
  }
  
  // Si no tiene sesión activa o su rol es Paciente/Otro, lo regresamos
  // a la puerta principal
  router.navigate(['/login']);
  return false;
};
