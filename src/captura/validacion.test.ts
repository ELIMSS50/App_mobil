import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Captura } from './modelo.ts';
import { fechaLocal } from './modelo.ts';
import { claveMedicion, evaluar, revisarCaptura, textoRango, type LimitesParametro } from './validacion.ts';

const ph: LimitesParametro = { id: 1, nombre: 'pH', unidad: '', warn: [6.5, 8.5], hard: [0, 14] };
const temp: LimitesParametro = { id: 2, nombre: 'Temperatura', unidad: '°C', warn: [null, null], hard: [-5, 60] };
const libre: LimitesParametro = { id: 3, nombre: 'Notas', unidad: null, warn: [null, null], hard: [null, null] };

test('clasifica como el servidor', () => {
  assert.equal(evaluar('7.2', ph), 'ok');
  assert.equal(evaluar('9', ph), 'advertencia');
  assert.equal(evaluar('72', ph), 'rechazo');
  assert.equal(evaluar('-0.1', ph), 'rechazo');
  assert.equal(evaluar('14', ph), 'advertencia'); // en el límite duro, fuera del normal
  assert.equal(evaluar('', ph), 'vacio');
  assert.equal(evaluar('abc', ph), 'no-numerico');
  assert.equal(evaluar('abc', libre), 'ok'); // sin límites, el servidor lo acepta
});

test('acepta coma decimal', () => {
  assert.equal(evaluar('7,2', ph), 'ok');
  assert.equal(evaluar(' 61 ', temp), 'rechazo');
});

test('un extremo sin límite no restringe', () => {
  assert.equal(evaluar('-4', temp), 'ok');
  assert.equal(textoRango([null, 60], '°C'), 'hasta 60 °C');
  assert.equal(textoRango([-5, null]), 'desde -5');
});

const base = (mediciones: Captura['mediciones']): Captura => ({
  uuid: 'u', proyectoId: 1, lat: 22.1, lng: -100.9, alt: null, precision: 5,
  fechaHoraToma: '2026-09-23 10:00:00', mediciones, envases: [], modoCaptura: null, observaciones: '', foto: null,
});

test('revisa la captura completa', () => {
  const r = revisarCaptura(
    base([
      { idParametro: 1, numRepeticion: 1, valor: '9.1' },
      { idParametro: 1, numRepeticion: 2, valor: '70' },
      { idParametro: 2, numRepeticion: 1, valor: '' },
    ]),
    [ph, temp],
  );
  assert.ok(r.advertencias[claveMedicion(1, 1)]);
  assert.ok(r.errores[claveMedicion(1, 2)]);
  assert.equal(r.errores.mediciones, undefined);
});

test('exige al menos una medición', () => {
  const r = revisarCaptura(base([{ idParametro: 1, numRepeticion: 1, valor: ' ' }]), [ph]);
  assert.ok(r.errores.mediciones);
});

test('fecha local sin zona', () => {
  assert.equal(fechaLocal(new Date(2026, 8, 3, 7, 5, 9)), '2026-09-03 07:05:09');
});
