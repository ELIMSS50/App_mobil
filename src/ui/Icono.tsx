import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

export type NombreIcono = ComponentProps<typeof Ionicons>['name'];

interface Props {
  nombre: NombreIcono;
  tamano?: number;
  color?: string;
}

/** Íconos de Ionicons (vienen en Expo Go y en el APK sin configurar nada). */
export function Icono({ nombre, tamano = 22, color }: Props) {
  return <Ionicons name={nombre} size={tamano} color={color} accessibilityElementsHidden importantForAccessibility="no" />;
}
