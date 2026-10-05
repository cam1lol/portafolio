import { Component, OnDestroy, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { noControlCharsValidator } from '../../../shared/validators/no-control-chars.validator';

const MAX_ATTEMPTS = 3;
const COOLDOWN_SECONDS = 10;

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-login.component.html',
  styleUrl: './admin-login.component.css',
})
export class AdminLoginComponent implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(254), noControlCharsValidator()],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(72), noControlCharsValidator()],
    }),
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly cooldownSeconds = signal(0);

  private failedAttempts = 0;
  private cooldownTimer: ReturnType<typeof setInterval> | undefined;

  protected get isLocked(): boolean {
    return this.cooldownSeconds() > 0;
  }

  submit(): void {
    if (this.isLocked || this.submitting()) {
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const email = this.form.controls.email.value.trim();
    const password = this.form.controls.password.value.trim();

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService.login(email, password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.failedAttempts = 0;
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        this.router.navigateByUrl(returnUrl || '/admin');
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set('Credenciales inválidas');
        this.registerFailedAttempt();
      },
    });
  }

  private registerFailedAttempt(): void {
    this.failedAttempts += 1;
    if (this.failedAttempts >= MAX_ATTEMPTS) {
      this.startCooldown();
      this.failedAttempts = 0;
    }
  }

  private startCooldown(): void {
    this.cooldownSeconds.set(COOLDOWN_SECONDS);
    this.cooldownTimer = setInterval(() => {
      const next = this.cooldownSeconds() - 1;
      if (next <= 0) {
        this.cooldownSeconds.set(0);
        this.clearCooldownTimer();
      } else {
        this.cooldownSeconds.set(next);
      }
    }, 1000);
  }

  private clearCooldownTimer(): void {
    if (this.cooldownTimer !== undefined) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = undefined;
    }
  }

  ngOnDestroy(): void {
    this.clearCooldownTimer();
  }
}
