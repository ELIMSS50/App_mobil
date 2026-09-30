import type { CampoFormulario } from '@/api/tipos';
import { Campo } from '@/ui/Campo';
import { Opciones, SiNo } from '@/ui/Opciones';

type Valor = string | number | boolean | null;

interface Props {
  campo: CampoFormulario;
  valor: Valor | undefined;
  onCambio: (v: Valor) => void;
  error?: string;
}

/**
 * Control según el `tipo` que manda /formulario. El profesor habilita o quita
 * campos desde la web y la app se adapta sin publicar otra versión.
 */
export function CampoDinamico({ campo, valor, onCambio, error }: Props) {
  switch (campo.tipo) {
    case 'enum':
      return (
        <Opciones
          etiqueta={campo.label}
          opciones={campo.opciones ?? []}
          valor={typeof valor === 'string' ? valor : null}
          onCambio={onCambio}
        />
      );
    case 'bool':
      return <SiNo etiqueta={campo.label} valor={typeof valor === 'boolean' ? valor : null} onCambio={onCambio} />;
    case 'number':
      return (
        <Campo
          etiqueta={campo.label}
          value={valor == null ? '' : String(valor)}
          onChangeText={(t) => {
            const limpio = t.replace(/[^0-9]/g, '');
            onCambio(limpio === '' ? null : Number(limpio));
          }}
          keyboardType="number-pad"
          error={error}
        />
      );
    default:
      return (
        <Campo
          etiqueta={campo.label}
          value={typeof valor === 'string' ? valor : ''}
          onChangeText={onCambio}
          multiline={campo.campo === 'observaciones'}
          maxLength={1000}
          error={error}
          style={campo.campo === 'observaciones' ? { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 } : undefined}
        />
      );
  }
}
