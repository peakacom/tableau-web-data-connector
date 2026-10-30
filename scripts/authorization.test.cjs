const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createRequire} = require('node:module');
const requireConnector = createRequire(path.join(__dirname, '../connector/package.json'));
const ts = requireConnector('typescript');

function load(file, imports = {}) {
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../connector/app/config', file), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021},
  }).outputText;
  const module = {exports: {}};
  vm.runInNewContext(output, {module, exports: module.exports, require: name => imports[name]});
  return module.exports;
}
const {authorizeProject} = load('authorization.ts', {
  './endpoint': load('endpoint.ts'), './project': load('project.ts'),
});
const address = 'https://api.customer.example:8443/api/v1';
function api(responses) {
  const requests = [];
  return {requests, fetch: async (url, options) => {
    requests.push({url, options});
    const response = responses.shift();
    if (!response) throw new Error('Unexpected request');
    if (response instanceof Error) throw response;
    return {ok: (response.status || 200) < 300, status: response.status || 200,
      json: async () => {if (response.invalidJson) throw new Error('invalid json'); return response.body;}};
  }};
}

test('project keys discover their own project and verify catalog access at the chosen instance', async () => {
  const mock = api([{body: {projectId: 'ProjectA', projectName: 'Sample'}}, {body: []}]);
  const project = await authorizeProject(address, ' test-key ', '', mock.fetch);
  assert.equal(project.projectId, 'ProjectA');
  assert.equal(project.projectName, 'Sample');
  assert.deepEqual(mock.requests.map(r => r.url), [address + '/info', address + '/data/projects/ProjectA/catalogs']);
  assert.ok(mock.requests.every(r => r.options.headers.Authorization === 'Bearer test-key' && r.options.redirect === 'error'));
});

test('partner keys require an explicit project instead of treating user info as a project', async () => {
  const mock = api([{body: {userId: 'user', email: 'user@example.com'}}]);
  await assert.rejects(authorizeProject(address, 'test-key', '', mock.fetch), /Enter a Project ID/);
  assert.equal(mock.requests.length, 1);
});

test('partner keys select and verify the requested project, including an empty project', async () => {
  const mock = api([{body: {userId: 'user', email: 'user@example.com'}}, {body: []}]);
  const project = await authorizeProject(address, 'test-key', ' ProjectB ', mock.fetch);
  assert.equal(project.projectId, 'ProjectB');
  assert.equal(project.projectName, 'ProjectB');
  assert.equal(project.email, 'user@example.com');
  assert.equal(mock.requests[1].url, address + '/data/projects/ProjectB/catalogs');
});

test('an explicit project cannot redirect a project-bound key to another project', async () => {
  const mock = api([{body: {projectId: 'ProjectA'}}]);
  await assert.rejects(authorizeProject(address, 'test-key', 'ProjectB', mock.fetch), /another project/);
  assert.equal(mock.requests.length, 1);
});

test('denied or inaccessible projects fail authorization before opening table selection', async () => {
  for (const status of [401, 403, 404, 500]) {
    const mock = api([{body: {userId: 'user'}}, {status}]);
    await assert.rejects(authorizeProject(address, 'test-key', 'ProjectA', mock.fetch));
  }
});

test('invalid inputs fail before sending the API key', async () => {
  for (const [base, key, project] of [
    [address, 'test-key', '../other'], [address, 'test-key', 'project?other'],
    [address, ' ', 'ProjectA'], ['http://customer.example', 'test-key', 'ProjectA'],
  ]) {
    const mock = api([]);
    await assert.rejects(authorizeProject(base, key, project, mock.fetch));
    assert.equal(mock.requests.length, 0);
  }
});

test('rejected keys, malformed responses and failed transport never produce an authorized project', async () => {
  for (const responses of [
    [{status: 401}], [{body: null}], [{body: []}], [{invalidJson: true}],
    [{body: {userId: 'user'}}, {body: {error: 'not a catalog list'}}],
    [new Error('redirect refused')],
  ]) {
    const mock = api(responses);
    await assert.rejects(authorizeProject(address, 'test-key', 'ProjectA', mock.fetch));
  }
});
