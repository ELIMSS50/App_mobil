import assert from 'node:assert/strict';
import { test } from 'node:test';

import { direccion, distanciaMetros, formatoDistancia } from './distancia.ts';
import { latLngAUtm } from './utm.ts';

// Valores calculados por CoordenadasHelper::latLngToUtm del backend.
test('UTM igual al del servidor', () => {
  assert.deepEqual(latLngAUtm(22.151234, -100.975612), { x: 296263.5, y: 2450891.36, zona: '14N' });
  assert.deepEqual(latLngAUtm(32.5149, -117.0382), { x: 496412.12, y: 3597511.44, zona: '11N' });
  assert.deepEqual(latLngAUtm(-33.4489, -70.6693), { x: 344846.72, y: 6297700.16, zona: '19S' });
  assert.equal(latLngAUtm(85, -100), null);
});

test('distancias y rumbos', () => {
  const d = distanciaMetros({ lat: 22.151234, lng: -100.975612 }, { lat: 22.152, lng: -100.975 });
  assert.ok(Math.abs(d - 106) < 1);
  assert.equal(direccion(44), 'NE');
  assert.equal(direccion(350), 'N');
  assert.equal(formatoDistancia(84.4), '84 m');
  assert.equal(formatoDistancia(2345), '2.3 km');
});
