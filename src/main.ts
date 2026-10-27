import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Modest hardware (<= 4 cores or <= 4 GB): lighter effects (styles.css "fx-lite"), decided once at start.
const nav = navigator as Navigator & { deviceMemory?: number };
if ((nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4) document.documentElement.classList.add('fx-lite');

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
