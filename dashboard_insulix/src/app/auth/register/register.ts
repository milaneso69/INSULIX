import { Component, signal, inject, ViewChildren, QueryList, ElementRef, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register implements OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  // Signals de UI
  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
  currentStep = signal(1);
  totalSteps = 5;
  shakeError = signal<number>(0);
  isLoading = signal(false);

  // 2FA - Digit Boxes
  @ViewChildren('digitInput') digitInputs!: QueryList<ElementRef>;
  codeDigits = ['', '', '', '', '', ''];
  
  // 2FA - Timer
  timeLeft = signal(300);
  timerDisplay = signal('05:00');
  timerInterval: any;
  isExpired = signal(false);
  progressPercentage = computed(() => (this.timeLeft() / 300) * 100);

  errorMessage = signal('');
  successMessage = signal('');

  // Expresiones regulares
  private lettersRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  private phoneRegex = /^\d{3}-\d{3}-\d{4}$/;
  private passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

  registerForm: FormGroup;

  constructor() {
    this.registerForm = this.fb.group({
      step1: this.fb.group({
        email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]]
      }),
      step2: this.fb.group({
        codigo: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
      }),
      step3: this.fb.group({
        nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(this.lettersRegex)]],
        apellidoPaterno: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(40), Validators.pattern(this.lettersRegex)]],
        apellidoMaterno: ['', [Validators.minLength(3), Validators.maxLength(40), Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/)]]
      }),
      step4: this.fb.group({
        telefono: ['', [Validators.required, Validators.pattern(this.phoneRegex)]],
        cedula: ['', [Validators.required, Validators.maxLength(20)]]
      }),
      step5: this.fb.group({
        password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(16), Validators.pattern(this.passwordRegex)]],
        confirmPassword: ['', [Validators.required]]
      }, { validators: this.passwordMatchValidator })
    });
  }

  // Getters para acceso fácil a los grupos en HTML
  get step1() { return this.registerForm.get('step1') as FormGroup; }
  get step2() { return this.registerForm.get('step2') as FormGroup; }
  get step3() { return this.registerForm.get('step3') as FormGroup; }
  get step4() { return this.registerForm.get('step4') as FormGroup; }
  get step5() { return this.registerForm.get('step5') as FormGroup; }

  passwordMatchValidator(g: AbstractControl): ValidationErrors | null {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  togglePassword(event: MouseEvent) {
    this.hidePassword.set(!this.hidePassword());
    event.stopPropagation();
  }

  toggleConfirmPassword(event: MouseEvent) {
    this.hideConfirmPassword.set(!this.hideConfirmPassword());
    event.stopPropagation();
  }

  onPhoneInput(event: any) {
    let value = event.target.value.replace(/\D/g, ''); // Remover todo menos números
    if (value.length > 10) value = value.slice(0, 10);
    
    let formatted = '';
    if (value.length > 0) formatted += value.substring(0, 3);
    if (value.length > 3) formatted += '-' + value.substring(3, 6);
    if (value.length > 6) formatted += '-' + value.substring(6, 10);
    
    this.step4.get('telefono')?.setValue(formatted, { emitEvent: false });
  }

  sendCode() {
    if (this.step1.invalid) {
      this.step1.markAllAsTouched();
      this.shakeError.set(1);
      setTimeout(() => this.shakeError.set(0), 500);
      return;
    }

    this.isLoading.set(true);
    const email = this.step1.get('email')?.value;
    
    this.authService.generateRegistration2FA(email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.shakeError.set(0);
        this.currentStep.set(2);
        this.startTimer();
        this.snackBar.open('Código enviado a tu correo', 'Cerrar', { duration: 3000, panelClass: ['success-snackbar'] });
      },
      error: (err) => {
        this.isLoading.set(false);
        const errMsg = err.error?.message || 'Error al enviar el código.';
        this.snackBar.open(errMsg, 'Cerrar', { duration: 4000, panelClass: ['error-snackbar'] });
        this.shakeError.set(1);
        setTimeout(() => this.shakeError.set(0), 500);
      }
    });
  }

  verifyCode() {
    if (this.step2.invalid) {
      this.step2.markAllAsTouched();
      this.shakeError.set(2);
      setTimeout(() => this.shakeError.set(0), 500);
      return;
    }

    this.isLoading.set(true);
    const email = this.step1.get('email')?.value;
    const code = this.step2.get('codigo')?.value;

    this.authService.verifyRegistration2FA(email, code).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.shakeError.set(0);
        this.currentStep.set(3);
        if (this.timerInterval) clearInterval(this.timerInterval);
      },
      error: (err) => {
        this.isLoading.set(false);
        const errMsg = err.error?.message || 'Código inválido.';
        this.snackBar.open(errMsg, 'Cerrar', { duration: 4000, panelClass: ['error-snackbar'] });
        this.codeDigits = ['', '', '', '', '', ''];
        if(this.digitInputs.toArray()[0]) {
           this.digitInputs.toArray()[0].nativeElement.focus();
        }
      }
    });
  }

  nextStep() {
    if (this.currentStep() === 1) {
      this.sendCode();
      return;
    }
    if (this.currentStep() === 2) {
      this.verifyCode();
      return;
    }

    let currentGroup;
    if (this.currentStep() === 3) currentGroup = this.step3;
    else if (this.currentStep() === 4) currentGroup = this.step4;

    if (currentGroup?.valid) {
      this.shakeError.set(0);
      this.currentStep.set(this.currentStep() + 1);
    } else {
      currentGroup?.markAllAsTouched();
      this.shakeError.set(this.currentStep());
      setTimeout(() => this.shakeError.set(0), 500); // Reset animation class
    }
  }

  previousStep() {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
      // Limpiar timer si volvemos atrás desde el paso 2
      if (this.currentStep() === 1 && this.timerInterval) {
        clearInterval(this.timerInterval);
      }
    }
  }

  // --- LÓGICA DE DÍGITOS ---
  get fullCode() {
    return this.codeDigits.join('');
  }

  trackByIndex(index: number): number {
    return index;
  }

  onDigitInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^0-9]/g, '');
    
    if (value.length > 1) {
       value = value.charAt(value.length - 1);
    }

    this.codeDigits[index] = value;
    input.value = value;
    
    // Actualizar el valor en el formGroup para validación
    this.step2.get('codigo')?.setValue(this.fullCode);
    
    if (value && index < 5) {
      setTimeout(() => {
        const nextInput = this.digitInputs.toArray()[index + 1];
        if (nextInput) nextInput.nativeElement.focus();
      });
    }

    if (this.fullCode.length === 6) {
      this.verifyCode();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace') {
      if (!this.codeDigits[index] && index > 0) {
        setTimeout(() => {
          const prevInput = this.digitInputs.toArray()[index - 1];
          if (prevInput) prevInput.nativeElement.focus();
        });
      }
    } else if (event.key === 'Enter') {
      if (this.fullCode.length === 6) this.verifyCode();
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;
    
    const pastedText = clipboardData.getData('text').replace(/[^0-9]/g, '');
    if (!pastedText) return;

    for (let i = 0; i < 6; i++) {
       if (i < pastedText.length) {
         this.codeDigits[i] = pastedText[i];
       }
    }
    
    this.step2.get('codigo')?.setValue(this.fullCode);

    setTimeout(() => {
       const focusIndex = Math.min(5, pastedText.length);
       const targetInput = this.digitInputs.toArray()[focusIndex];
       if (targetInput) targetInput.nativeElement.focus();
       
       if (this.fullCode.length === 6) {
           this.verifyCode();
       }
    });
  }

  // --- LÓGICA DE TIMER ---
  startTimer() {
    this.isExpired.set(false);
    this.timeLeft.set(300);
    this.timerDisplay.set('05:00');
    
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timerInterval = setInterval(() => {
      if (this.timeLeft() > 0) {
        this.timeLeft.update(t => t - 1);
        this.updateTimerDisplay();
      } else {
        this.isExpired.set(true);
        this.snackBar.open('El código ha expirado. Solicita uno nuevo.', 'Cerrar', { duration: 4000, panelClass: ['error-snackbar'] });
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  updateTimerDisplay() {
    const minutes = Math.floor(this.timeLeft() / 60);
    const seconds = this.timeLeft() % 60;
    this.timerDisplay.set(
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    );
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  validateCedula() {
    if (this.step4.get('cedula')?.valid) {
      this.snackBar.open('Cédula validada correctamente (Simulación)', 'Cerrar', { duration: 2000, panelClass: ['success-snackbar'] });
    } else {
      this.step4.get('cedula')?.markAsTouched();
      this.shakeError.set(4);
      setTimeout(() => this.shakeError.set(0), 500);
    }
  }

  async onRegister() {
    if (this.step5.invalid || this.registerForm.invalid) {
      this.step5.markAllAsTouched();
      this.shakeError.set(5);
      setTimeout(() => this.shakeError.set(0), 500);
      return;
    }

    this.isLoading.set(true);

    const formValue = this.registerForm.value;
    const rawPhone = formValue.step4.telefono.replace(/\D/g, ''); // Eliminar guiones para DB

    const datosMedico = {
      nombre: formValue.step3.nombre,
      apellido_paterno: formValue.step3.apellidoPaterno,
      apellido_materno: formValue.step3.apellidoMaterno,
      cedula_profesional: formValue.step4.cedula,
      telefono: rawPhone
    };

    this.authService.registerMedico(formValue.step1.email, formValue.step5.password, datosMedico).subscribe({
      next: (res) => {
        this.snackBar.open('¡Registro exitoso! Redirigiendo al inicio de sesión...', 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        console.error('Error en registro:', err);
        this.isLoading.set(false);
        const errMsg = err.error?.message || err.error?.error || 'Credenciales no válidas, intenta con otro correo.';
        this.snackBar.open(errMsg, 'Cerrar', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }
}