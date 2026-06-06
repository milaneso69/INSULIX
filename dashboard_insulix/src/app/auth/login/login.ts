import { Component, signal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms'; 
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCheckboxModule,
    MatButtonModule
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login implements OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Estados
  hide = signal(true);
  email = signal('');
  password = signal('');
  isLoading = signal(false);
  
  // Lockout
  isLockedOut = signal(false);
  lockoutTimer = signal('00:00');
  timerInterval: any;

  // Messages
  errorMessage = signal('');
  warningMessage = signal('');

  togglePassword(event: MouseEvent) {
    this.hide.set(!this.hide());
    event.stopPropagation();
  }

  startLockoutTimer(seconds: number) {
    this.isLockedOut.set(true);
    let remaining = seconds;
    
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.updateTimerDisplay(remaining);
    
    this.timerInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        this.isLockedOut.set(false);
        clearInterval(this.timerInterval);
      } else {
        this.updateTimerDisplay(remaining);
      }
    }, 1000);
  }

  updateTimerDisplay(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    this.lockoutTimer.set(
      `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    );
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  async onLogin() {
    this.errorMessage.set('');
    this.warningMessage.set('');

    if (!this.email() || !this.password()) {
      this.errorMessage.set('Por favor, completa todos los campos.');
      return;
    }

    this.isLoading.set(true);
    
    try {
      // 1. Verificar si está bloqueado en el backend
      const status: any = await this.authService.checkLockoutStatus(this.email()).toPromise();
      
      if (status.locked) {
        this.startLockoutTimer(status.remainingSeconds || 300);
        this.errorMessage.set('Cuenta bloqueada por seguridad. Inténtalo más tarde.');
        this.isLoading.set(false);
        return;
      }

      // 2. Intentar login en Firebase
      const result = await this.authService.login(this.email(), this.password());
      const user = result.user;

      // Verificar que solo los médicos puedan acceder a este portal web
      if (user.role !== 'MEDICO') {
        await this.authService.logout();
        throw new Error('invalid_role');
      }

      // 3. Login exitoso -> Resetear intentos en backend
      await this.authService.resetLoginAttempts(this.email()).toPromise();

      console.log(`Firebase Login exitoso. Preferences - Tema Oscuro: ${user.tema_oscuro}, Idioma: ${user.idioma}`);

      // 4. Evaluar si requiere 2FA
      if (user.is_2fa_enabled) {
        console.log('2FA Activado. Generando código...');
        this.authService.generate2FACode(user.uid, user.email || '').subscribe({
          next: () => {
            this.router.navigate(['/verify-code']);
          },
          error: (err) => {
            console.error('Error al iniciar 2FA:', err);
            this.errorMessage.set('No se pudo enviar el código de verificación.');
          }
        });
      } else {
        console.log('2FA Desactivado. Entrando directamente...');
        this.router.navigate(['/dashboard']);
      }
    } catch (error: any) {
      console.error('Error en login:', error);
      
      if (error && error.message === 'invalid_role') {
        this.errorMessage.set('Credenciales inválidas.');
        this.isLoading.set(false);
        return;
      }

      // 4. Login fallido -> Registrar error en backend
      try {
        const failResult: any = await this.authService.logLoginFailure(this.email()).toPromise();
        if (failResult.locked) {
          this.startLockoutTimer(300);
          this.errorMessage.set('Has superado el límite de intentos. Cuenta bloqueada.');
        } else {
          this.warningMessage.set(`Credenciales inválidas. Intentalo de nuevo.`);
        }
      } catch (backendError) {
        this.errorMessage.set('Error: Credenciales inválidas o usuario no encontrado.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}