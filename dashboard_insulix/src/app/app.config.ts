import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

// Rutas de tu aplicación
import { routes } from './app.routes';

// Firebase imports
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';

// Tu interceptor para enviar el Token JWT Custom
import { jwtInterceptor } from './interceptors/jwt.interceptor';

// Tu configuración de Firebase
export const firebaseConfig = {
  apiKey: "AIzaSyBjn6Y_ueb4QVSFEpFDmQedOBJ3YTQ62WE",
  authDomain: "insulix-4c63c.firebaseapp.com",
  projectId: "insulix-4c63c",
  storageBucket: "insulix-4c63c.firebasestorage.app",
  messagingSenderId: "333667857568",
  appId: "1:333667857568:web:87a7f19c7c3135a46105c5"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    
    // 1. Configuramos el cliente HTTP con el interceptor que pega el Token JWT
    provideHttpClient(
      withInterceptors([jwtInterceptor])
    ),
    
    // 2. Inicializamos la App de Firebase
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    
    // 3. Inicializamos el módulo de Autenticación
    provideAuth(() => getAuth()),
  ]
};