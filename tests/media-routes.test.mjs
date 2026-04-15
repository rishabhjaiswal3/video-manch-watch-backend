import { test } from 'node:test';
import assert from 'node:assert/strict';
import mediaRouter from '../src/app/media/route.js';

function listRoutePaths(router) {
  return router.stack
    .filter((layer) => layer.route)
    .map((layer) => {
      const methods = Object.keys(layer.route.methods).filter((m) => layer.route.methods[m]);
      return { methods, path: layer.route.path };
    });
}

test('media router has exactly one GET /recommendations and one GET /recommendations/personalized', () => {
  const routes = listRoutePaths(mediaRouter);
  const getRec = routes.filter((r) => r.methods.includes('get') && r.path === '/recommendations');
  const getPersonalized = routes.filter(
    (r) => r.methods.includes('get') && r.path === '/recommendations/personalized'
  );
  assert.equal(getRec.length, 1, 'duplicate GET /recommendations would break Express');
  assert.equal(getPersonalized.length, 1);
});
