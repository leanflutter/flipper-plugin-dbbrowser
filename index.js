import {
  FlipperPlugin,
  Button,
  ButtonGroup,
  FlexColumn,
  Text,
  PluginProps,
  Toolbar,
  Select,
  ManagedTable,
} from 'flipper';

class FlipperDatabaseBrowserPlugin extends FlipperPlugin<State, *, PersistedState> {
  static id = 'DatabaseBrowser';

  constructor(props: PluginProps<State, *, PersistedState>) {
    super(props);

    this.state = {
      tables: [],
      selectedTableName: '',
      selectedTableInfo: [],
      selectedTableCount: [],
      selectedTableLimit: 30,
      selectedTableOffset: 0,
      selectedTableRecords: [],
    };
  }

  init() {
    this.client.subscribe('newQueryResult', this.handleNewQueryResultEvent);
    this.client.send('execQuery', {
      action: 'getTables',
      table: '',
    });
  }

  handleChangeTable = (table) => {
    this.setState({
      selectedTableName: table,
      selectedTableInfo: [],
      selectedTableCount: 0,
      selectedTableOffset: 0,
      selectedTableRecords: [],
    });
    this.client.send('execQuery', {
      action: 'getTableInfo',
      table,
    });
  }

  handleChangeTablePage = (newOffset) => {
    const { selectedTableName, selectedTableLimit } = this.state;
    this.setState({
      selectedTableOffset: newOffset,
    });
    this.client.send('execQuery', {
      action: 'getTableRecordes',
      table: selectedTableName,
      limit: selectedTableLimit,
      offset: newOffset,
    });
  }

  handleNewQueryResultEvent = (queryResult) => {
    const { action, table, results } = queryResult;

    console.log(queryResult);

    if (action === 'getTables') {
      let tableName = '';
      if (results.length > 0) {
        tableName = results[0].tbl_name;
      }
      this.setState({ 
        tables: results, 
        selectedTableName: tableName,
      });

      this.client.send('execQuery', {
        action: 'getTableInfo',
        table: tableName,
      });
    } else if (action === 'getTableInfo') {
      const { 
        selectedTableLimit,
        selectedTableOffset,
      } = this.state;

      this.setState({ 
        selectedTableName: table,
        selectedTableInfo: results, 
      });

      this.client.send('execQuery', {
        action: 'getTableCount',
        table: table,
      });

      this.client.send('execQuery', {
        action: 'getTableRecordes',
        table: table,
        limit: selectedTableLimit,
        offset: selectedTableOffset,
      });
    } else if (action === 'getTableCount') {
      this.setState({ 
        selectedTableName: table,
        selectedTableCount: results,
      });
    } else if (action === 'getTableRecordes') {
      this.setState({ 
        selectedTableName: table,
        selectedTableRecords: results,
      });
    }
  }

  clear = () => {
    this.setState({ tables: [] });
  }

  onRowHighlighted = (keys) => {
    this.setState({ selectedIds: keys });
  };

  buildRow = (row) => {
    const columns = {};

    Object.keys(row).forEach(key => {
      columns[key] = {
        value: <Text>{row[key]}</Text>,
        filterValue: row[key],
      }
    })

    return {
      columns,
      key: JSON.stringify(row),
      copyText: JSON.stringify(row),
      filterValue: `${row}`,
    };
  }

  render() {
    const { 
      tables, 
      selectedTableName, 
      selectedTableInfo, 
      selectedTableCount,
      selectedTableLimit,
      selectedTableOffset,
      selectedTableRecords, 
    } = this.state;
    const columns = {};
    for (let i = 0; i < selectedTableInfo.length; i++) {
      const element = selectedTableInfo[i];
      columns[element.name] = {
        value: `${element.name}`,
      };
    }
    const rows = (selectedTableRecords || []).map(v => this.buildRow(v));

    return (
      <FlexColumn grow={true}>
        <Toolbar position="top">
          <Select 
            options={tables.map(v => v.name)}
            defaultValue={selectedTableName}
            onChange={this.handleChangeTable}
          />
        </Toolbar>
        {
          (selectedTableInfo || []).length > 0 ? <ManagedTable
            key={this.constructor.id}
            rowLineHeight={28}
            floating={false}
            multiline={false}
            columns={columns}
            onRowHighlighted={this.onRowHighlighted}
            multiHighlight={true}
            rows={rows}
            stickyBottom={true}
            actions={<Button onClick={this.clear}>Clear</Button>}
          /> : <div style={{ flex: 1 }} />
        }
        <Toolbar position="bottom">
          <div 
            style={{ 
              display: 'flex', 
              position: 'absolute', 
              flex: 1, 
              justifyContent: 'center',
              left: 0,
              right: 0,
            }}
          >
            <span>{selectedTableOffset + 1} - {(selectedTableOffset + selectedTableLimit)} of {(selectedTableCount[0] || {}).count} rows</span>
          </div>
          <div style={{ flex: 1 }} />
          <ButtonGroup>
            <Button
              onClick={() => {
                const newOffset = selectedTableOffset - selectedTableLimit;
                if (newOffset < 0) return;
                this.handleChangeTablePage(newOffset);
              }}
            >
              {'<'}
            </Button>
            <Button 
              onClick={() => {
                const newOffset = selectedTableOffset + selectedTableLimit;
                if (newOffset > (selectedTableCount[0] || {}).count) return;
                this.handleChangeTablePage(newOffset);
              }}
            >
              {'>'}
            </Button>
          </ButtonGroup>
        </Toolbar>
      </FlexColumn>
    );
  }
}

export default FlipperDatabaseBrowserPlugin;
