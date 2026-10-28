import { Directive, HostListener, inject } from '@angular/core';
import { FormGroup, NgControl } from '@angular/forms';
import { TranslatorService } from './translator.service';

/**
 * On a Spanish field (`formControlName="xxxEs"`): when you leave it, its English sibling (`xxxEn`)
 * is translated automatically if it is empty or still holds an untouched automatic translation.
 */
@Directive({
  selector: '[appAutoTranslate]',
  standalone: true,
})
export class AutoTranslateDirective {
  private readonly ngControl = inject(NgControl, { self: true });
  private readonly translator = inject(TranslatorService);

  @HostListener('focusout')
  protected onBlur(): void {
    const control = this.ngControl.control;
    const name = String(this.ngControl.name ?? '');
    const parent = control?.parent;
    if (!control || !name.endsWith('Es') || !(parent instanceof FormGroup) || !this.translator.supported) return;
    const en = parent.controls[name.slice(0, -2) + 'En'];
    if (!en) return;
    this.translator.fill({ es: control, en }).catch(() => undefined);
  }
}
