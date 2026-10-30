import { resolveApiBaseUrl } from "../app/config/endpoint";
import { resolveProjectId } from "../app/config/project";
import {
  Column,
  ExecuteResultType,
  FetchResultType,
  Row,
  TableSelectionInfo,
} from "../app/types/types";

import {
  Fetcher,
  FetchUtils,
  FetchOptions,
  log,
} from '@tableau/taco-toolkit/handlers'
import template from "lodash.template";

export default class DataFetcher extends Fetcher {
  private TABLE_FETCH_LIMIT = 1000;
  private EXTERNAL_TABLE_FETCH_LIMIT = 100;

  private EXECUTE_QUERY_URL_TEMPLATE = template(
    "<%= apiBaseUrl %>/data/projects/<%= projectId %>/queries/execute"
  );

  private GET_COLUMNS_URL_TEMPLATE = template(
    "<%= apiBaseUrl %>/data/projects/<%= projectId %>/catalogs/<%= catalogId %>/schemas/<%= schemaName %>/tables/<%= tableName %>/columns"
  );

  private EXECUTE_QUERY_BODY_TEMPLATE = template(`{
    "columns": [
      {
        "column": {
          "catalogId": "<%= catalogId %>",
          "schemaName": "<%= schemaName %>",
          "tableName": "<%= tableName %>",
          "columnName": "*",
          "dataType": null,
          "props": null
        },
        "function": null
      }
    ],
    "from": [
      {
        "catalogId": "<%= catalogId %>",
        "schemaName": "<%= schemaName %>",
        "tableName": "<%= tableName %>"
      }
    ],
    "filters": null,
    "limit": <%= limit %>,
    "offset": <%= offset %>,
    "orderBy": null,
    "rows": null
  }`);

  private EXECUTE_QUERY_WITH_QLIMIT_BODY_TEMPLATE = template(`{
    "columns": [
      {
        "column": {
          "catalogId": "<%= catalogId %>",
          "schemaName": "<%= schemaName %>",
          "tableName": "<%= tableName %>",
          "columnName": "*",
          "dataType": null,
          "props": null
        },
        "function": null
      }
    ],
    "from": [
      {
        "catalogId": "<%= catalogId %>",
        "schemaName": "<%= schemaName %>",
        "tableName": "<%= tableName %>",
        "isDynamicTable": false,
        "isCacheable": true
      }
    ],
    "filters": {
      "and": [
        [
          {
            "column": {
              "catalogId": "<%= catalogId %>",
              "columnName": "_q_limit",
              "dataType": "varchar",
              "props": null,
              "schemaName": "<%= schemaName %>",
              "tableName": "<%= tableName %>"
            },
            "function": null
          },
          "=",
          [
            "<%= qLimitValue %>"
          ]
        ]
      ]
    },
    "limit": 1000,
    "offset": 0,
    "orderBy": null,
    "rows": null
  }`);

  private EXECUTE_QUERY_WITH_QOFFSET_BODY_TEMPLATE = template(`{
    "columns": [
      {
        "column": {
          "catalogId": "<%= catalogId %>",
          "schemaName": "<%= schemaName %>",
          "tableName": "<%= tableName %>",
          "columnName": "*",
          "dataType": null,
          "props": null
        },
        "function": null
      }
    ],
    "from": [
      {
        "catalogId": "<%= catalogId %>",
        "schemaName": "<%= schemaName %>",
        "tableName": "<%= tableName %>",
        "isDynamicTable": false,
        "isCacheable": true
      }
    ],
    "filters": {
      "and": [
        [
          {
            "column": {
              "catalogId": "<%= catalogId %>",
              "columnName": "_q_limit",
              "dataType": "varchar",
              "props": null,
              "schemaName": "<%= schemaName %>",
              "tableName": "<%= tableName %>"  
            },
            "function": null
          },
          "=",
          [
            "<%= qLimitValue %>"
          ]
        ],
        [
          {
            "column": {
              "catalogId": "<%= catalogId %>",
              "columnName": "_q_offset",
              "dataType": "varchar",
              "props": null,
              "schemaName": "<%= schemaName %>",
              "tableName": "<%= tableName %>"
            },
            "function": null
          },
          "=",
          [
            "<%= qOffsetValue %>"
          ]
        ]
      ]
    },
    "limit": 1000,
    "offset": 0,
    "orderBy": null,
    "rows": null
  }`);

  private PAGINATOR_ANCHOR_COLUMN_NAME = "_q_pagination_anchor";
  private OFFSET_COLUMN_NAME = "_q_offset";

  async *fetch({ handlerInput, secrets }: FetchOptions) {
    const apiBaseUrl = resolveApiBaseUrl(handlerInput.data.apiBaseUrl);
    const fetchResults: FetchResultType = { tables: [] };
    const projectId = resolveProjectId(secrets?.["projectId"]);
    const apiKey = secrets?.["apiKey"] as string;

    const headers: { [key: string]: string } = {};
    headers["Authorization"] = `Bearer ${apiKey}`;
    headers["Content-Type"] = "application/json";

    const tableSelections = handlerInput.data
      .tableSelections as TableSelectionInfo[];

    for (const tableSelectionInfo of tableSelections) {
      try {
        const table = tableSelectionInfo?.table;
        const catalog = tableSelectionInfo?.catalog;

        const columns = (await FetchUtils.fetchJson(
          this.GET_COLUMNS_URL_TEMPLATE({
            apiBaseUrl,
            projectId,
            catalogId: catalog?.id,
            schemaName: table?.schemaName,
            tableName: table.tableName,
          }),
          { method: "GET", headers }
        )) as Column[];
        const isPageable =
          columns.filter(
            (column) =>
              column.columnName === this.PAGINATOR_ANCHOR_COLUMN_NAME ||
              column.columnName === this.OFFSET_COLUMN_NAME
          ).length === 2;

        if (isPageable && !tableSelectionInfo.isTableCached) {
          let q_limit = this.EXTERNAL_TABLE_FETCH_LIMIT;
          let q_offset = "";
          if (
            tableSelectionInfo.scanMode.toString() !== "FULL_SCAN" &&
            tableSelectionInfo.limit! < q_limit
          ) {
            q_limit = tableSelectionInfo.limit!;
          }

          let body = this.EXECUTE_QUERY_WITH_QLIMIT_BODY_TEMPLATE({
            catalogId: table?.catalogId,
            schemaName: table?.schemaName,
            tableName: table?.tableName,
            qLimitValue: q_limit,
          });

          let tableData: Row[] = [];

          let result = (await FetchUtils.fetchJson(
            this.EXECUTE_QUERY_URL_TEMPLATE({
              apiBaseUrl,
              projectId,
            }),
            { method: "POST", body, headers }
          )) as ExecuteResultType;
          const columns = result.columns;
          tableData = [...tableData, ...result.data];
          let dataCount = result.data.length;

          let hasNextPage = false;
          if (result.data.length === 0) {
            hasNextPage = false;
          } else {
            if (
              tableSelectionInfo.scanMode.toString() === "FULL_SCAN" &&
              result.data.length > 0
            ) {
              hasNextPage = true;
            } else if (
              tableSelectionInfo.scanMode.toString() !== "FULL_SCAN" &&
              dataCount < tableSelectionInfo.limit!
            ) {
              hasNextPage = true;
            } else if (
              tableSelectionInfo.scanMode.toString() !== "FULL_SCAN" &&
              dataCount >= tableSelectionInfo.limit!
            ) {
              hasNextPage = false;
            }
          }

          while (hasNextPage && q_offset !== null) {
            q_offset = result.data[0].filter(
              (row) => row.name === this.PAGINATOR_ANCHOR_COLUMN_NAME
            )[0].value as string;
            if (!q_offset) {
              break;
            }
            body = this.EXECUTE_QUERY_WITH_QOFFSET_BODY_TEMPLATE({
              catalogId: table?.catalogId,
              schemaName: table?.schemaName,
              tableName: table?.tableName,
              qLimitValue: q_limit,
              qOffsetValue: q_offset,
            });

            result = (await FetchUtils.fetchJson(
              this.EXECUTE_QUERY_URL_TEMPLATE({
                apiBaseUrl,
                projectId,
              }),
              { method: "POST", body, headers }
            )) as ExecuteResultType;

            dataCount += result.data.length;
            tableData = [...tableData, ...result.data];
            if (result.data.length === 0) {
              hasNextPage = false;
            } else {
              if (
                tableSelectionInfo.scanMode.toString() === "FULL_SCAN" &&
                result.data.length > 0
              ) {
                hasNextPage = true;
              } else if (
                tableSelectionInfo.scanMode.toString() !== "FULL_SCAN" &&
                dataCount < tableSelectionInfo.limit!
              ) {
                hasNextPage = true;
              } else if (
                tableSelectionInfo.scanMode.toString() !== "FULL_SCAN" &&
                dataCount >= tableSelectionInfo.limit!
              ) {
                hasNextPage = false;
              }
            }
          }

          fetchResults.tables.push({
            columns: columns,
            data: tableData,
            tableName: `${catalog.queryName}.${table.schemaName}.${table.tableName}`,
          });
        } else {
          let limit = this.TABLE_FETCH_LIMIT;
          let offset = 0;
          if (
            tableSelectionInfo.scanMode.toString() !== "FULL_SCAN" &&
            tableSelectionInfo.limit! < limit
          ) {
            limit = tableSelectionInfo.limit!;
          }

          let body = this.EXECUTE_QUERY_BODY_TEMPLATE({
            catalogId: table?.catalogId,
            schemaName: table?.schemaName,
            tableName: table?.tableName,
            limit,
            offset,
          });

          let tableData: Row[] = [];

          let result = (await FetchUtils.fetchJson(
            this.EXECUTE_QUERY_URL_TEMPLATE({
              apiBaseUrl,
              projectId,
            }),
            { method: "POST", body, headers }
          )) as ExecuteResultType;
          offset += limit;

          const columns = result.columns;
          tableData = [...tableData, ...result.data];

          let hasNextPage = false;
          if (result.data.length === 0) {
            hasNextPage = false;
          } else {
            if (
              tableSelectionInfo.scanMode.toString() === "FULL_SCAN" &&
              result.data.length > 0 &&
              result.data.length === limit
            ) {
              hasNextPage = true;
            } else if (
              tableSelectionInfo.scanMode.toString() !== "FULL_SCAN" &&
              offset < tableSelectionInfo.limit!
            ) {
              hasNextPage = true;
            } else if (
              tableSelectionInfo.scanMode.toString() !== "FULL_SCAN" &&
              offset >= tableSelectionInfo.limit!
            ) {
              hasNextPage = false;
            }
          }

          while (hasNextPage) {
            body = this.EXECUTE_QUERY_BODY_TEMPLATE({
              catalogId: table?.catalogId,
              schemaName: table?.schemaName,
              tableName: table?.tableName,
              limit: this.TABLE_FETCH_LIMIT,
              offset: offset,
            });

            result = (await FetchUtils.fetchJson(
              this.EXECUTE_QUERY_URL_TEMPLATE({
                apiBaseUrl,
                projectId,
              }),
              { method: "POST", body, headers }
            )) as ExecuteResultType;

            offset += limit;
            tableData = [...tableData, ...result.data];
            if (result.data.length === 0) {
              hasNextPage = false;
            } else {
              if (
                tableSelectionInfo.scanMode.toString() === "FULL_SCAN" &&
                result.data.length > 0 &&
                result.data.length === limit
              ) {
                hasNextPage = true;
              } else if (
                tableSelectionInfo.scanMode.toString() !== "FULL_SCAN" &&
                offset < tableSelectionInfo.limit!
              ) {
                hasNextPage = true;
              } else if (
                tableSelectionInfo.scanMode.toString() !== "FULL_SCAN" &&
                offset >= tableSelectionInfo.limit!
              ) {
                hasNextPage = false;
              }
            }
          }

          fetchResults.tables.push({
            columns: columns,
            data: tableData,
            tableName: `${catalog.queryName}.${table.schemaName}.${table.tableName}`,
          });
        }
      } catch (error) {
        log(`Could not fetch data for table.` + error);
      }
    }
    yield fetchResults;
  }
}
