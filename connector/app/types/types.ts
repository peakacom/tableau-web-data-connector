export interface Project {
  email: string;
  projectId: string;
  projectName: string;
  userId: string;
}

export enum FormState {
  API_KEY = "API_KEY",
  TABLE_SELECT = "TABLE_SELECT",
  SUMMARY = "SUMMARY",
}

export interface CatalogDTO {
  displayName: string;
  id: string;
  queryName: string;
  type: string;
  subType: string;
  props: { extraDashParams?: string } & { [key: string]: unknown };
}

export interface SchemaDTO {
  catalogId: string;
  schemaName: string;
}

export interface TableDTO {
  catalogId: string;
  schemaName: string;
  tableName: string;
  isCacheable?: boolean;
  isDynamicTable?: boolean;
}

export enum TableSelectionScanMode {
  FULL_SCAN = "FULL_SCAN",
  LIMIT = "LIMIT",
}
export interface TableSelectionInfo {
  key: string;
  catalog: CatalogDTO;
  table: TableDTO;
  scanMode: TableSelectionScanMode;
  limit?: number;
  isTableCached: boolean;
}

export interface Column {
  catalogId: string;
  schemaName: string;
  tableName: string;
  columnName: string;
  dataType: string;
  props: ColumnProps;
}

export interface ColumnProps {
  dateTimeFormat?: `${DateTimeParts}|${DateFormat}|${TimeFormat}`;
  dataType: string;
  defaultValue: unknown;
  displayName: string;
  id: string;
  isNotNull: boolean;
  isSystem: boolean;
  isUnique: boolean;
  name: string;
  order: number;
  pinned?: boolean;
  displayScale?: NumberDisplayScale;
  type: ColumnType;
}

export enum ColumnType {
  Boolean = "BOOLEAN",
  DateTime = "TIMESTAMP",
  Decimal = "DECIMAL",
  Json = "JSON",
  Number = "BIGINT",
  Text = "VARCHAR",
  Uuid = "UUID",
  External = "EXTERNAL",
  Date = "DATE",
  TimeOnly = "TIME",
}

export type NumberDisplayScale = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export enum DateTimeParts {
  Date = "Date",
  DateTime = "DateTime",
  Time = "Time",
}

export enum DateFormat {
  Local = "Local",
  Friendly = "Friendly",
  US = "US",
  European = "European",
  ISO = "ISO",
}

export enum TimeFormat {
  h12 = "h12",
  h24 = "h24",
}

export type Row = Cell[];
export interface Cell {
  name: string;
  displayName: string;
  dataType: string;
  value: unknown;
}

export interface FetchResultType {
  tables: ExecuteResultType[];
}

export interface ExecuteResultType {
  columns: Column[];
  data: Row[];
  tableName: string;
}

export enum ColumnDataTypeRegex {
  // Boolean
  Boolean = "^boolean$",

  // Integer
  Tinyint = "^tinyint$",
  Smallint = "^smallint$",
  Integer = "^integer$",
  Bigint = "^bigint$",
  Numeric = "^numeric$", // extra type, not in Trino
  Number = "^number$", // extra type, not in Trino

  // Floating-point
  Real = "^real$",
  Double = "^double$",

  // Decimal
  Decimal = "^decimal(\\(\\d+(,\\d+)?\\))?$",

  // String
  Char = "^char$",
  Varchar = "^varchar$",
  VarcharP = "^varchar\\(\\d+\\)$",
  Text = "^text$",
  Varbinary = "^varbinary$",
  Blob = "^blob$",
  Json = "^json$",

  // Date
  Date = "^date$",
  Time = "^time$",
  TimeP = "^time\\(\\d+\\)$",
  TimeWithTimeZone = "^time with time zone$",
  Timestamp = "^timestamp$",
  TimestampP = "^timestamp\\(\\d+\\)$",
  TimestampWithTimeZone = "^timestamp with time zone$",
  TimestampPWithTimeZone = "^timestamp\\(\\d+\\) with time zone$",
  TimestampWithTimeZoneP = "^timestamp with time zone\\(\\d+\\)$",
  IntervalYearToMonth = "^interval year to month$",
  IntervalDayToSecond = "^interval day to second$",

  // Structural
  Array = "^array$",
  Map = "^map$",
  Row = "^row$",

  // Network address
  IpAddress = "^ipaddress$",

  // UUID
  Uuid = "^uuid$",

  // HyperLogLog
  HyperLogLog = "^hyperloglog$",
  P4HyperLogLog = "^p4hyperloglog$",

  // SetDigest
  SetDigest = "^setdigest$",

  // QuantileDigest
  QDigest = "^qdigest$",

  // T-Digest
  TDigest = "^tdigest",
}
