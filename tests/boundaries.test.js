const test = require('node:test');
const assert = require('node:assert/strict');
const { loadBoundaries } = require('../src/utils/routing');

test('loads all 47 county boundaries from the bundled GeoJSON', async () => {
  const boundaries = await loadBoundaries();

  assert.equal(boundaries.type, 'FeatureCollection');
  assert.equal(boundaries.features.length, 47);
  assert.equal(new Set(boundaries.features.map(feature => feature.properties.COUNTY)).size, 47);
  assert.ok(boundaries.features.every(feature =>
    ['Polygon', 'MultiPolygon'].includes(feature.geometry.type)
  ));
});
