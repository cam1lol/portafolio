import { Component } from '@angular/core';

@Component({
  selector: 'app-ticker',
  standalone: true,
  templateUrl: './ticker.component.html',
  styleUrl: './ticker.component.css',
})
export class TickerComponent {
  readonly technologies: readonly string[] = [
    'Angular',
    'TypeScript',
    'Three.js',
    'Blender',
    'Java',
    'Spring Boot',
    'Node.js',
    'Vue 3',
    'Ionic',
    'AWS',
    'Python',
    'FastAPI',
  ];
}
