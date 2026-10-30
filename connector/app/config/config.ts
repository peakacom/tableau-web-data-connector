import template from "lodash.template";

export const INITIALIZING_SPINNER_MESSAGE =
  "Initializing Peaka Web Data Connector.";

export const LOADING_TABLE_MESSAGE = "Loading Tables ...";

export const EXPORTING_TABLES_MESSAGE = "Exporting Tables ...";

export const GET_CATALOGS_URL_TEMPLATE = template(
  "/data/projects/<%= projectId %>/catalogs"
);

export const GET_SCHEMAS_URL_TEMPLATE = template(
  "/data/projects/<%= projectId %>/catalogs/<%= catalogId %>/schemas"
);

export const GET_TABLES_URL_TEMPLATE = template(
  "/data/projects/<%= projectId %>/catalogs/<%= catalogId %>/schemas/<%= schemaName %>/tables"
);

export const IS_TABLE_CACHED_URL_TEMPLATE = template(
  "/data/projects/<%= projectId %>/catalogs/<%= catalogId %>/schemas/<%= schemaName %>/tables/<%= tableName %>/isCached"
);

export const PEAKA_TABLE_SCHEMA_NAME = "Peaka Table";
export const PEAKA_BI_TABLE_SCHEMA_NAME = "Peaka BI Table";
export const PEAKA_QUERY_SCHEMA_NAME = "Peaka Query";
