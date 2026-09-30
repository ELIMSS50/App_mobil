import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Captura } from '../captura/modelo.ts';
import { baseDePrueba } from '../db/node.test-util.ts';
import {
  actualizar,
  contar,
  descartar,
  encolar,
  type Fallo,
  listar,
  obtener,
  procesar,
  reiniciarEnviando,
  type Dependencias,
} from './nucleo.ts';

let n = 0;
const captura = (proyectoId = 1, valor = '7.2'): Captura => ({
  uuid: `uuid-${++n}`,
  proyectoId,
  lat: 22.15,
  lng: -100.97,
  alt: null,
  precision: 5,
  fechaHoraToma: '2026-09-23 10:00:00',
  mediciones: [{ idParametro: 1, numRepeticion: 1, valor }],
  envases: [],
  modoCaptura: null,
  observaciones: '',
  foto: null,
});

class ErrorFalso extends Error {
  fallo: Fallo;
  constructor(fallo: Fallo) {
    super(fallo.mensaje);
    this.fallo = fallo;
  }
}

/** Servidor falso: responde según la función, y registra lo enviado. */
function dependencias(responder: (c: Captura) => Fallo | null): Dependencias & { enviadas: Captura[] } {
  const enviadas: Captura[] = [];
  let folio = 100;
  return {
    enviadas,
    enviar: async (c) => {
      enviadas.push(c);
      const fallo = responder(c);
      if (fallo) throw new ErrorFalso(fallo);
      return { idMuestra: ++folio };
    },
    clasificar: (e) => (e as ErrorFalso).fallo,
    nuevoUuid: () => `nuevo-${++n}`,
  };
}

test('guardar nunca falla y queda en cola', () => {
  const db = baseDePrueba();
  const id = encolar(db, captura(), 7, 'Acuífero SLP');
  const fila = obtener(db, id)!;
  assert.equal(fila.estado, 'EN_COLA');
  assert.equal(fila.proyectoNombre, 'Acuífero SLP');
  assert.deepEqual(contar(db, 7), { pendientes: 1, errores: 0, porProyecto: { 1: 1 } });
});

test('envía en orden y marca ENVIADA con el folio', async () => {
  const db = baseDePrueba();
  const a = encolar(db, captura(), 7, null);
  const b = encolar(db, captura(), 7, null);
  const dep = dependencias(() => null);

  const r = await procesar(db, 7, dep);

  assert.equal(r.enviadas, 2);
  assert.deepEqual(dep.enviadas.map((c) => c.uuid), [obtener(db, a)!.captura.uuid, obtener(db, b)!.captura.uuid]);
  assert.equal(obtener(db, a)!.estado, 'ENVIADA');
  assert.equal(obtener(db, a)!.respuesta?.idMuestra, 101);
  assert.equal(contar(db, 7).pendientes, 0);
});

test('sin red se detiene al primer fallo y conserva todo en cola', async () => {
  const db = baseDePrueba();
  const a = encolar(db, captura(), 7, null);
  encolar(db, captura(), 7, null);
  const dep = dependencias(() => ({ tipo: 'sin-red', mensaje: 'Sin conexión' }));

  const r = await procesar(db, 7, dep);

  assert.equal(r.detenida, 'sin-red');
  assert.equal(dep.enviadas.length, 1, 'no insiste con las demás sin señal');
  assert.equal(obtener(db, a)!.estado, 'EN_COLA');
  assert.equal(obtener(db, a)!.intentos, 1);
  assert.equal(contar(db, 7).pendientes, 2);
});

test('un 422 marca ERROR con sus campos y sigue con la siguiente', async () => {
  const db = baseDePrueba();
  const mala = encolar(db, captura(1, '72'), 7, null);
  const buena = encolar(db, captura(), 7, null);
  const dep = dependencias((c) =>
    c.mediciones[0].valor === '72'
      ? { tipo: 'rechazo', mensaje: 'Revisa los valores', porCampo: { 'medicion:1:1': 'Fuera del rango posible' } }
      : null,
  );

  const r = await procesar(db, 7, dep);

  assert.equal(r.rechazadas, 1);
  assert.equal(r.enviadas, 1);
  assert.equal(obtener(db, mala)!.estado, 'ERROR');
  assert.deepEqual(obtener(db, mala)!.erroresCampo, { 'medicion:1:1': 'Fuera del rango posible' });
  assert.equal(obtener(db, buena)!.estado, 'ENVIADA');
  assert.deepEqual(contar(db, 7), { pendientes: 0, errores: 1, porProyecto: { 1: 1 } });
});

test('corregir una captura con ERROR la regresa a la cola; una enviada no se edita', async () => {
  const db = baseDePrueba();
  const id = encolar(db, captura(1, '72'), 7, null);
  await procesar(db, 7, dependencias(() => ({ tipo: 'rechazo', mensaje: 'x', porCampo: { a: 'b' } })));

  const corregida = { ...obtener(db, id)!.captura, mediciones: [{ idParametro: 1, numRepeticion: 1, valor: '7.2' }] };
  assert.equal(actualizar(db, id, corregida), true);
  assert.equal(obtener(db, id)!.estado, 'EN_COLA');
  assert.deepEqual(obtener(db, id)!.erroresCampo, {});

  await procesar(db, 7, dependencias(() => null));
  assert.equal(obtener(db, id)!.estado, 'ENVIADA');
  assert.equal(actualizar(db, id, corregida), false);
});

test('un 409 cambia el uuid y reintenta una vez; si sigue, espera sin frenar a las demás', async () => {
  const db = baseDePrueba();
  const choca = encolar(db, captura(), 7, null);
  const otra = encolar(db, captura(), 7, null);
  const original = obtener(db, choca)!.captura.uuid;
  // El uuid original y cualquier uuid nuevo chocan siempre.
  const dep = dependencias((c) => (c.uuid === original || c.uuid.startsWith('nuevo') ? { tipo: 'conflicto', mensaje: '409' } : null));

  const r = await procesar(db, 7, dep);

  const fila = obtener(db, choca)!;
  assert.equal(fila.estado, 'EN_COLA');
  assert.notEqual(fila.captura.uuid, original);
  assert.equal(dep.enviadas.filter((c) => c.uuid === original || c.uuid.startsWith('nuevo')).length, 2);
  assert.equal(obtener(db, otra)!.estado, 'ENVIADA');
  assert.equal(r.enviadas, 1);
});

test('sin sesión se detiene sin marcar error', async () => {
  const db = baseDePrueba();
  const id = encolar(db, captura(), 7, null);
  const r = await procesar(db, 7, dependencias(() => ({ tipo: 'sesion', mensaje: '401' })));
  assert.equal(r.detenida, 'sesion');
  assert.equal(obtener(db, id)!.estado, 'EN_COLA');
});

test('lo que quedó ENVIANDO al cerrarse la app vuelve a la cola', () => {
  const db = baseDePrueba();
  const id = encolar(db, captura(), 7, null);
  db.run(`UPDATE cola SET estado = 'ENVIANDO' WHERE id = ?`, id);
  assert.equal(reiniciarEnviando(db), 1);
  assert.equal(obtener(db, id)!.estado, 'EN_COLA');
});

test('cada usuario solo ve y envía sus capturas', async () => {
  const db = baseDePrueba();
  encolar(db, captura(), 7, null);
  const ajena = encolar(db, captura(), 8, null);
  const dep = dependencias(() => null);

  await procesar(db, 7, dep);

  assert.equal(dep.enviadas.length, 1);
  assert.equal(obtener(db, ajena)!.estado, 'EN_COLA');
  assert.equal(listar(db, 7).length, 1);
  assert.equal(listar(db, 8, 1).length, 1);
});

test('se puede descartar lo que no se ha enviado, pero no lo enviado', async () => {
  const db = baseDePrueba();
  const pendiente = encolar(db, captura(), 7, null);
  assert.equal(descartar(db, pendiente), true);
  assert.equal(obtener(db, pendiente), null);

  const enviada = encolar(db, captura(), 7, null);
  await procesar(db, 7, dependencias(() => null));
  assert.equal(descartar(db, enviada), false);
  assert.equal(obtener(db, enviada)!.estado, 'ENVIADA');
});
