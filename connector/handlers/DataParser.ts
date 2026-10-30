import {
  DataContainer,
  DataRow,
  DataType,
  ParseOptions,
  log,
  Parser,
} from '@tableau/taco-toolkit/handlers'
import {
  ColumnDataTypeRegex,
  ColumnType,
  FetchResultType,
} from "../app/types/types";

export default class DataParser extends Parser<FetchResultType> {
  parse(
    fetchResultType: FetchResultType,
    { dataContainer }: ParseOptions
  ): DataContainer {
    dataContainer.tables = [];
    const containerBuilder = Parser.createContainerBuilder(dataContainer);

    for (const executeResultType of fetchResultType.tables) {
      const { isNew, tableBuilder } = containerBuilder.getTable(
        executeResultType.tableName
      );
      if (isNew) {
        tableBuilder.setId(executeResultType.tableName);
        executeResultType.columns.forEach((column) => {
          const peakaDataType = this.convertColumnType(column.dataType);
          log({
            peakaDataType,
          });
          log({
            id: column.columnName,
            dataType: this.convertPeakaDataTypeToTableuDataType(peakaDataType),
          });
          tableBuilder.addColumnHeader({
            id: column.columnName,
            dataType: this.convertPeakaDataTypeToTableuDataType(peakaDataType),
          });
        });
      }

      tableBuilder.addRows(
        executeResultType.data.map((row) => {
          const rowResult: DataRow = {};
          row.forEach((cell) => {
            rowResult[cell.name] = cell.value as
              | string
              | number
              | boolean
              | object
              | null;
          });
          return rowResult;
        })
      );
    }

    return containerBuilder.getDataContainer();
  }
  convertPeakaDataTypeToTableuDataType(dataType: ColumnType) {
    switch (dataType) {
      case ColumnType.Boolean:
        return DataType.Bool;
      case ColumnType.Date:
        return DataType.Date;
      case ColumnType.DateTime:
        return DataType.Datetime;
      case ColumnType.Decimal:
        return DataType.Float;
      case ColumnType.Number:
        return DataType.Int;
      case ColumnType.Text:
        return DataType.String;
      default:
        return DataType.Unknown;
    }
  }
  convertColumnType(dataType: string) {
    let columnType = ColumnType.Text;

    switch (this.getColumnDataTypeRegex(dataType)) {
      case ColumnDataTypeRegex.Boolean:
        columnType = ColumnType.Boolean;
        break;
      case ColumnDataTypeRegex.Date:
        columnType = ColumnType.Date;
        break;
      case ColumnDataTypeRegex.Time:
      case ColumnDataTypeRegex.TimeP:
        columnType = ColumnType.TimeOnly;
        break;
      case ColumnDataTypeRegex.TimeWithTimeZone:
      case ColumnDataTypeRegex.Timestamp:
      case ColumnDataTypeRegex.TimestampP:
      case ColumnDataTypeRegex.TimestampWithTimeZone:
      case ColumnDataTypeRegex.TimestampPWithTimeZone:
      case ColumnDataTypeRegex.TimestampWithTimeZoneP:
        columnType = ColumnType.DateTime;
        break;
      case ColumnDataTypeRegex.Bigint:
        columnType = ColumnType.Number;
        break;
      case ColumnDataTypeRegex.Varchar:
        columnType = ColumnType.Text;
        break;
      case ColumnDataTypeRegex.Decimal:
        columnType = ColumnType.Decimal;
        break;
      case ColumnDataTypeRegex.Uuid:
        columnType = ColumnType.Uuid;
        break;
      case ColumnDataTypeRegex.Json:
        columnType = ColumnType.Json;
        break;
    }

    return columnType;
  }

  getColumnDataTypeRegex(columnDataType: unknown): ColumnDataTypeRegex | null {
    if (typeof columnDataType !== "string") {
      return null;
    }
    return (
      Object.values(ColumnDataTypeRegex).find((columnDataTypeRegex) =>
        this.testColumnDataType(columnDataType, columnDataTypeRegex)
      ) ?? null
    );
  }

  testColumnDataType(
    columnDataType: unknown,
    columnDataTypeRegex: ColumnDataTypeRegex
  ) {
    return (
      typeof columnDataType === "string" &&
      new RegExp(columnDataTypeRegex, "i").test(columnDataType)
    );
  }
}
