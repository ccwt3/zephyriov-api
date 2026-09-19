import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as z from 'zod';
import * as contract from './index.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const project = dirname(root);
const typeRoot = join(root, 'types');
const check = process.argv.includes('--check');
const schemas = Object.fromEntries(Object.entries(contract)
  .filter(([name, value]) => name.endsWith('Schema') && value instanceof z.ZodType)
  .sort(([a], [b]) => a.localeCompare(b)));
const examples = ['examples.json', 'examples-B02.03-B02.04.json',
  'examples-B02.05-B02.06.json', 'examples-B02.07-B02.08.json', 'examples-B02.10.json']
  .map((name) => JSON.parse(readFileSync(join(root, name), 'utf8')));

function output(path, content) {
  if (check) {
    if (readFileSync(path, 'utf8') !== content) throw new Error(`Generated file is stale: ${path}`);
  } else {
    writeFileSync(path, content);
  }
}

const ref = (name) => ({ $ref: `#/components/schemas/${name}Schema` });
const json = (name) => ({ content: { 'application/json': { schema: ref(name) } } });
const response = (name, description = name) => ({ description, ...json(name) });
const body = (name) => ({ required: true, ...json(name) });
const parameter = (name, location, schemaName, required = false) => ({
  name, in: location, required, schema: ref(schemaName),
});
const errorForStatus = { 401: 'AUTH_REQUIRED', 403: 'EMAIL_UNVERIFIED', 404: 'NOT_FOUND',
  409: 'VERSION_CONFLICT', 413: 'PAYLOAD_TOO_LARGE', 422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED', 503: 'SERVICE_UNAVAILABLE' };
const errors = Object.fromEntries(Object.entries(errorForStatus).map(([status, code]) => {
  const item = response('ErrorEnvelope', `HTTP ${status} business error`);
  item.content['application/json'].example = examples[4].errors[code];
  return [status, item];
}));
errors[429].headers = { 'Retry-After': {
  description: 'Seconds before retrying', schema: { type: 'integer', minimum: 0 },
} };
const secured = (operation) => ({ 'x-business-auth-required': true, responses: { ...errors, ...operation.responses }, ...Object.fromEntries(Object.entries(operation).filter(([key]) => key !== 'responses')) });
const op = (id, success, options = {}) => ({ operationId: id, responses: { 200: response(success), ...options.responses }, ...Object.fromEntries(Object.entries(options).filter(([key]) => key !== 'responses')) });

const paths = {
  '/v1/catalog': { get: secured(op('getCatalog', 'CatalogPage', { parameters: [
    { name: 'cursor', in: 'query', schema: { type: 'string', minLength: 1, maxLength: 2048 } },
    { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
    parameter('manifestId', 'query', 'Id'),
  ] })) },
  '/v1/catalog/lines/{id}': { get: secured(op('getLineRevision', 'LineRevision', { parameters: [
    parameter('id', 'path', 'Id', true), parameter('revisionId', 'query', 'Id'),
    { name: 'If-None-Match', in: 'header', schema: { type: 'string' } },
  ], responses: { 304: { description: 'ETag matched; no body' } } })) },
  '/v1/me/state': { get: secured(op('getAccountState', 'AccountState', { parameters: [parameter('minRevision', 'query', 'Revision')] })) },
  '/v1/me/repertoire/{openingId}': {
    put: secured(op('putRepertoire', 'RepertoireMutationResponse', { parameters: [parameter('openingId', 'path', 'Id', true)], requestBody: body('RepertoirePutRequest') })),
    delete: secured(op('deleteRepertoire', 'RepertoireMutationResponse', { parameters: [parameter('openingId', 'path', 'Id', true), { name: 'If-Match', in: 'header', required: true, schema: { type: 'string', pattern: '^"(?:0|[1-9][0-9]*)"$' } }] })),
  },
  '/v1/me/settings': { patch: secured(op('patchSettings', 'SettingsPatchResponse', { requestBody: body('SettingsPatchRequest') })) },
  '/v1/me/onboarding': { post: secured(op('onboard', 'OnboardingResponse', { requestBody: body('OnboardingRequest') })) },
  '/v1/study-sessions': { post: secured(op('createStudySession', 'StudySessionResponse', { requestBody: body('StudySessionCreateRequest') })) },
  '/v1/study-sessions/{id}': { get: secured(op('getStudySession', 'StudySessionResponse', { parameters: [parameter('id', 'path', 'Id', true), parameter('minRevision', 'query', 'Revision')] })) },
  '/v1/me/study-events': { post: secured(op('submitStudyEvents', 'StudyEventsResponse', { requestBody: body('StudyEventsRequest') })) },
  '/v1/me/study-events/{eventId}': { get: secured(op('getStudyEventDecision', 'ReplayedDecisionResponse', { parameters: [parameter('eventId', 'path', 'Id', true)] })) },
  '/v1/me/offline-packages': { post: secured(op('renewOfflinePackage', 'OfflinePackage', { requestBody: body('OfflineRenewalRequest') })) },
  '/v1/me/realtime-ticket': { post: secured(op('createRealtimeTicket', 'RealtimeTicketResponse')) },
  '/health/ready': { get: { operationId: 'healthReady', responses: { 200: { description: 'API and database available; no body' }, 503: { description: 'Not ready; no body' } } } },
};
const etag = { description: 'Quoted content hash of the line revision',
  schema: { type: 'string', pattern: '^"[a-f0-9]{64}"$' } };
paths['/v1/catalog/lines/{id}'].get.responses[200].headers = { ETag: etag };
paths['/v1/catalog/lines/{id}'].get.responses[304].headers = { ETag: etag };
const successExamples = {
  getCatalog: examples[0].catalogPage,
  getLineRevision: examples[0].lineRevision,
  getAccountState: examples[1].onboardingResponse,
  putRepertoire: examples[1].repertoirePutResponse,
  deleteRepertoire: { ...examples[1].repertoirePutResponse,
    entry: { ...examples[1].repertoirePutResponse.entry, active: false } },
  patchSettings: examples[1].settingsPatchResponse,
  onboard: examples[1].onboardingResponse,
  createStudySession: examples[1].sessionResponse,
  getStudySession: examples[1].sessionResponse,
  submitStudyEvents: examples[2].response,
  getStudyEventDecision: { eventId: examples[2].appliedDecision.eventId,
    replayed: true, decision: examples[2].appliedDecision },
  renewOfflinePackage: examples[3].offlinePackage,
  createRealtimeTicket: examples[3].ticketResponse,
};
const requestExamples = {
  putRepertoire: examples[1].repertoirePutRequest,
  patchSettings: examples[1].settingsPatchRequest,
  onboard: examples[1].onboardingRequest,
  createStudySession: examples[1].sessionCreateRequest,
  submitStudyEvents: examples[2].request,
  renewOfflinePackage: examples[3].renewalRequest,
};
for (const methods of Object.values(paths)) {
  for (const operation of Object.values(methods)) {
    if (operation.operationId === 'healthReady') continue;
    operation.responses[200].content['application/json'].example = successExamples[operation.operationId];
    if (operation.requestBody) {
      operation.requestBody.content['application/json'].example = requestExamples[operation.operationId];
    }
  }
}

const components = Object.fromEntries(Object.entries(schemas).map(([name, schema]) => {
  const generated = z.toJSONSchema(schema, { target: 'openapi-3.1', unrepresentable: 'any', io: 'input' });
  delete generated.$schema;
  return [name, generated];
}));
paths['/v1/catalog'].get.parameters[0].schema = components.CatalogQuerySchema.properties.cursor;
paths['/v1/catalog'].get.parameters[1].schema = components.CatalogQuerySchema.properties.limit;
paths['/v1/catalog/lines/{id}'].get.parameters[2].schema = components.LineRevisionQuerySchema.properties.ifNoneMatch;
paths['/v1/me/repertoire/{openingId}'].delete.parameters[1].schema = components.RepertoireDeleteHeadersSchema.properties.ifMatch;
const openapi = {
  openapi: '3.1.0',
  info: { title: 'Zephyriov business contract', version: '0.0.0', description: 'Declarative contract; HTTP implementation and effective Better Auth routes are future work.' },
  paths,
  components: { schemas: components },
  'x-websocket': { path: '/v1/updates', authenticate: ref('RealtimeAuthenticate'), notice: ref('RealtimeNotice'), ticket: ref('RealtimeTicketResponse') },
  'x-auth-inventory': 'Deferred to B05.12; no /api/auth/* routes asserted.',
};
output(join(root, 'openapi.json'), `${JSON.stringify(openapi, null, 2)}\n`);

const dto = `// Generated by contracts/generate.mjs from exported Zod schemas.\nimport type * as z from 'zod';\nimport type * as contract from './types/index.mjs';\n${Object.keys(schemas).map((name) => `export type ${name.slice(0, -6)} = z.infer<typeof contract.${name}>;`).join('\n')}\n`;
output(join(root, 'dto.d.mts'), dto);

const tsc = join(project, 'node_modules/.bin/tsc');
mkdirSync(typeRoot, { recursive: true });
const declarationsBefore = check ? new Map(readdirSync(typeRoot)
  .filter((name) => name.endsWith('.d.mts'))
  .map((name) => [name, readFileSync(join(typeRoot, name), 'utf8')])) : null;
const declaration = spawnSync(tsc, [
  '--allowJs', '--declaration', '--emitDeclarationOnly', '--module', 'NodeNext',
  '--moduleResolution', 'NodeNext', '--target', 'ES2022', '--skipLibCheck',
  '--outDir', typeRoot, join(root, 'index.mjs'),
], { cwd: project, encoding: 'utf8' });
if (declaration.status !== 0) throw new Error(declaration.stdout + declaration.stderr);
for (const name of readdirSync(typeRoot).filter((entry) => entry.endsWith('.d.mts'))) {
  const path = join(typeRoot, name);
  const source = readFileSync(path, 'utf8');
  const rules = [
    ...(source.includes('any') ? ['@typescript-eslint/no-explicit-any'] : []),
    ...(source.includes('{}') ? ['@typescript-eslint/no-empty-object-type'] : []),
  ];
  const header = rules.length > 0 ? `/* eslint-disable ${rules.join(', ')} -- Generated TypeScript declarations. */\n` : '';
  writeFileSync(path, header + source.replace(/^(?:\/\* eslint-disable[^\n]*\n)+/, ''));
}
if (check) {
  for (const [name, oldContent] of declarationsBefore) {
    if (readFileSync(join(typeRoot, name), 'utf8') !== oldContent) {
      throw new Error(`Generated declaration is stale: ${name}`);
    }
  }
}
console.log(`${check ? 'Checked' : 'Generated'} ${Object.keys(schemas).length} schemas, OpenAPI and DTO declarations`);
