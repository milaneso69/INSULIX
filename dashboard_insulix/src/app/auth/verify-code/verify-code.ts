import { Component, signal, inject, OnInit, OnDestroy, computed, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { take } from 'rxjs';

@Component({
  selector: 'app-verify-code',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './verify-code.html',
  styleUrls: ['./verify-code.scss']
})
export class VerifyCode implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);

  @ViewChildren('digitInput') digitInputs!: QueryList<ElementRef>;
  codeDigits = ['', '', '', '', '', ''];

  get fullCode() {
    return this.codeDigits.join('');
  }

  trackByIndex(index: number): number {
    return index;
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

    setTimeout(() => {
       const focusIndex = Math.min(5, pastedText.length);
       if(this.digitInputs.toArray()[focusIndex]) {
           this.digitInputs.toArray()[focusIndex].nativeElement.focus();
       }
       if (this.fullCode.length === 6) {
           this.onVerify();
       }
    });
  }

  onDigitInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/[^0-9]/g, '');
    
    if (value.length > 1) {
       value = value.charAt(value.length - 1);
    }

    this.codeDigits[index] = value;
    input.value = value; 
    
    if (value && index < 5) {
      setTimeout(() => {
        if(this.digitInputs.toArray()[index + 1]) {
            this.digitInputs.toArray()[index + 1].nativeElement.focus();
        }
      });
    }

    setTimeout(() => {
      if (this.fullCode.length === 6) this.onVerify();
    }, 50);
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace') {
      if (!this.codeDigits[index] && index > 0) {
        setTimeout(() => {
          if(this.digitInputs.toArray()[index - 1]) {
              this.digitInputs.toArray()[index - 1].nativeElement.focus();
          }
        });
      }
    } else if (event.key === 'Enter') {
      if (this.fullCode.length === 6) this.onVerify();
    }
  }

  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  userEmail = signal('');
  userUid = signal('');
  
  // Timer
  timeLeft = signal(300);
  timerDisplay = signal('05:00');
  timerInterval: any;
  isExpired = signal(false);
  
  // Computed for circular spinner (100 to 0)
  progressPercentage = computed(() => (this.timeLeft() / 300) * 100);

  ngOnInit() {
    this.authService.user$.pipe(take(1)).subscribe(user => {
      if (user) {
        this.userEmail.set(user.email || '');
        this.userUid.set(user.uid);
        this.startTimer();
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  startTimer() {
    this.isExpired.set(false);
    this.timeLeft.set(300);
    this.timerDisplay.set('05:00');
    this.errorMessage.set('');
    this.successMessage.set('');
    
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timerInterval = setInterval(() => {
      if (this.timeLeft() > 0) {
        this.timeLeft.update(t => t - 1);
        this.updateTimerDisplay();
      } else {
        this.isExpired.set(true);
        this.errorMessage.set('El código ha expirado. Solicita uno nuevo.');
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

  async onVerify() {
    this.errorMessage.set('');
    this.successMessage.set('');

    const code = this.fullCode;

    if (code.length !== 6) {
      this.errorMessage.set('El código debe ser de 6 dígitos.');
      return;
    }

    this.isLoading.set(true);
    
    this.authService.verify2FACode(this.userUid(), code).subscribe({
      next: (res) => {
        if (res.valid) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage.set(res.message || 'Código inválido.');
          this.isLoading.set(false);
          this.codeDigits = ['', '', '', '', '', ''];
          if(this.digitInputs.toArray()[0]) {
             this.digitInputs.toArray()[0].nativeElement.focus();
          }
        }
      },
      error: (err) => {
        console.error(err);
        this.errorMessage.set(err.error?.message || 'Error al verificar el código.');
        this.isLoading.set(false);
      }
    });
  }

  resendCode() {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.isLoading.set(true);
    
    this.codeDigits = ['', '', '', '', '', ''];
    if(this.digitInputs.toArray()[0]) {
      this.digitInputs.toArray()[0].nativeElement.focus();
    }

    this.authService.generate2FACode(this.userUid(), this.userEmail()).subscribe({
      next: () => {
        this.successMessage.set('Código re-enviado exitosamente.');
        this.startTimer();
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('Error al re-enviar el código.');
        this.isLoading.set(false);
      }
    });
  }
}
