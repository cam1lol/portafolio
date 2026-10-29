/**
 * Iconos que ofrece el selector del admin para los proyectos. Cada uno tiene su propio bucle con
 * <app-icon animated> (styles.css, "Icon motion"); la etiqueta es lo que ve el admin.
 */
export interface CatalogIcon {
  name: string;
  label: string;
}

export const PROJECT_ICONS: readonly CatalogIcon[] = [
  { name: 'box', label: '3D / cubo' },
  { name: 'activity', label: 'Dashboard' },
  { name: 'chart', label: 'Gráficas' },
  { name: 'layout', label: 'Landing / web' },
  { name: 'code', label: 'Código' },
  { name: 'terminal', label: 'Terminal / CLI' },
  { name: 'layers', label: 'API / capas' },
  { name: 'database', label: 'Base de datos' },
  { name: 'cpu', label: 'Hardware / IA' },
  { name: 'cloud', label: 'Nube' },
  { name: 'globe', label: 'Web global' },
  { name: 'smartphone', label: 'App móvil' },
  { name: 'cart', label: 'E-commerce' },
  { name: 'chat', label: 'Chat / bot' },
  { name: 'pen', label: 'Diseño' },
  { name: 'aperture', label: 'Foto / visual' },
  { name: 'rocket', label: 'Lanzamiento' },
  { name: 'shield', label: 'Seguridad' },
];
