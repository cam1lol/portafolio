import { Component } from '@angular/core';
import { HeroSceneComponent } from '../hero-scene/hero-scene.component';

@Component({
  selector: 'app-public-shell',
  imports: [HeroSceneComponent],
  templateUrl: './public-shell.component.html',
  styleUrl: './public-shell.component.css',
})
export class PublicShellComponent {}
