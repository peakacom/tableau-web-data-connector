const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const requireConnector = createRequire(path.join(__dirname, '../connector/package.json'));
const ts = requireConnector('typescript');

function loadTs(file, imports) {
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../connector', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2021 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, require: name => name in imports ? imports[name] : requireConnector(name) });
  return module.exports;
}
function setup() {
  const requests = [];
  const endpoint = loadTs('app/config/endpoint.ts', {});
  const { default: DataFetcher } = loadTs('handlers/DataFetcher.ts', {
    '../app/config/endpoint': endpoint,
    '../app/config/project': loadTs('app/config/project.ts', {}),
    '@tableau/taco-toolkit/handlers': {
      Fetcher: class {}, log: () => {}, FetchUtils: { fetchJson: async (url, options) => {
        requests.push({url, options});
        return options.method === 'GET' ? [] : {columns: [], data: []};
      } },
    },
  });
  return { fetcher: new DataFetcher(), requests };
}
const selection = {catalog: {id: 'catalog', queryName: 'catalog'}, table: {catalogId: 'catalog', schemaName: 'public', tableName: 'sample'}, scanMode: 'FULL_SCAN'};
const secrets = {projectId: 'test-project', apiKey: 'test-key'};
test('refresh uses the saved customer endpoint for metadata and query execution', async () => {
  const {fetcher, requests} = setup();
  const data = {apiBaseUrl: 'https://api.customer.example:8443/api/v1', tableSelections: [selection]};
  for await (const _ of fetcher.fetch({handlerInput: {data}, secrets})) {}
  assert.equal(requests.length, 2);
  assert.ok(requests.every(r => r.url.startsWith(data.apiBaseUrl + '/data/projects/test-project/')));
  assert.equal(requests[0].options.method, 'GET');
  assert.equal(requests[1].options.method, 'POST');
});
test('legacy workbooks without an endpoint keep Cloud', async () => {
  const {fetcher, requests} = setup();
  for await (const _ of fetcher.fetch({handlerInput: {data: {tableSelections: [selection]}}, secrets})) {}
  assert.ok(requests.every(r => r.url.startsWith('https://partner.peaka.studio/api/v1/')));
});
test('an HTTP stored URL fails before sending the API key', async () => {
  const {fetcher, requests} = setup();
  const iterator = fetcher.fetch({handlerInput: {data: {apiBaseUrl: 'http://api.customer.example/api/v1', tableSelections: [selection]}}, secrets});
  await assert.rejects(iterator.next(), /HTTPS/);
  assert.equal(requests.length, 0);
});

test('refresh refuses missing or unsafe saved project IDs before sending a credential', async () => {
  for (const projectId of [undefined, '', '../other', 'project?target=other']) {
    const {fetcher, requests} = setup();
    const iterator = fetcher.fetch({handlerInput: {data: {tableSelections: [selection]}}, secrets: {...secrets, projectId}});
    await assert.rejects(iterator.next(), /Project ID/);
    assert.equal(requests.length, 0);
  }
});

test('normalizes user-entered HTTPS origins and rejects invalid destinations', () => {
  const {resolveApiBaseUrl} = loadTs('app/config/endpoint.ts', {});
  assert.equal(resolveApiBaseUrl(' https://API.customer.example:8443/ '), 'https://api.customer.example:8443/api/v1');
  assert.equal(resolveApiBaseUrl('https://api.customer.example:443/api/v1/'), 'https://api.customer.example/api/v1');
  for (const value of ['', null, 'http://customer.example', 'https://user:password@customer.example',
    'https://customer.example/path', 'https://customer.example/api/v1?key=test',
    'https://customer.example/api/v1#fragment', 'https://customer.example:65536', 'https://*.example', 'https://customer..example']) {
    assert.throws(() => resolveApiBaseUrl(value));
  }
});
test('actual Tableau toolkit permits custom HTTPS API hosts and ports only for required methods', () => {
  const toolkitRoot = path.dirname(path.dirname(requireConnector.resolve('@tableau/taco-toolkit')));
  const {PermissionChecker} = require(path.join(toolkitRoot, '../shared/types/permission.js'));
  const permission = JSON.parse(fs.readFileSync(path.join(__dirname, '../connector/connector.json'))).permission.api;
  for (const url of ['https://api.customer.example/api/v1/info', 'https://private.example:8443/api/v1/data/projects/test/queries/execute', 'https://10.0.0.1:8443/api/v1/info']) {
    assert.equal(PermissionChecker.checkApiPermission(permission, url, 'GET'), true);
    assert.equal(PermissionChecker.checkApiPermission(permission, url, 'POST'), true);
    assert.equal(PermissionChecker.checkApiPermission(permission, url, 'DELETE'), false);
  }
  assert.equal(PermissionChecker.checkApiPermission(permission, 'http://private.example/api/v1/info', 'GET'), false);
  assert.equal(PermissionChecker.checkApiPermission(permission, 'https://private.example/admin', 'GET'), false);
});
