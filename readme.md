# DB2
A quick class for connecting to a mysql db in node and doing common functions against it.

## Installation
There's no npm package for this. You'll have to install differently:
```
npm install --save github.com/srgraham/db2
```
Or:
```
npm install --save github.com/srgraham/db2#deadbeef
```
Swap out `deadbeef` for the commit id you like.

## Usage
```js
const DB2 = require('db2');

const config = {
  host: 'localhost',
  database: 'database',
  user: 'user',
  pass: 'pass',
  options: {
    charset : 'utf8mb4',
  },
};

const db = new DB2(config);

await db.execute('SELECT 1;');
```

There are a handful of common functions defined:

### `execute(query, [binds])`
- `query` = query string to run
- `binds` = array of binds to fill in the `?` for in the query

```js
await db.execute('SELECT 7');
await db.execute('SELECT ?', [7]);
await db.execute('SELECT ?, ?, ?', [7, 8, 9]);
```


### `insert(table_name, row_obj)`

- `table_name` - table name
- `row_obj` - object to insert

```js
await db.insert('test', {id: 1});
await db.insert('test', {id: 1, foo: 222, bar: 'asdf'});
```


### `insertIgnore(table_name, row_obj)`

- `table_name` - table name
- `row_obj` - object to insert

```js
await db.insertIgnore('test', {id: 1});
await db.insertIgnore('test', {id: 1, foo: 222, bar: 'asdf'});
```


### `insertIgnoreMulti(table_name, row_objs)`

- `table_name` - table name
- `row_objs` - array of objects to insert 

```js
await db.insertIgnoreMulti('test', [{id: 1}]);
await db.insertIgnoreMulti('test', [
  {id: 1, foo: 222, bar: 'asdf'},
  {id: 2, foo: 333, bar: 'jkl'},
  {id: 3, foo: 444, bar: 'qwerty'},
]);
```


### `insertOnDuplicateKeyUpdate(table_name, row_obj, ignored_update_columns)`

- `table_name` - table name
- `row_obj` - object to insert
- `ignored_update_columns` - columns to not update when updating the row; all other columns get updated

```js
await db.insertOnDuplicateKeyUpdate('test', {foo: 222, bar: 'asdf'}, ['id']);
await db.insertOnDuplicateKeyUpdate('test', {foo: 333, bar: 'jkl'}, ['id']);
```


### `insertOnDuplicateKeyUpdateMulti(table_name, row_obj_arr, ignore_update_columns)`

- `table_name` - table name
- `row_obj_arr` - array of objects to update
- `ignore_update_columns` - columns to not update when updating the row; all other columns get updated

```js
await db.insertOnDuplicateKeyUpdate('test', [{foo: 222, bar: 'asdf'}], ['id']);
await db.insertOnDuplicateKeyUpdate(
  'test',
  [
    {foo: 333, bar: 'asdf'},
    {foo: 444, bar: 'jkl'},
    {foo: 555, bar: 'qwerty'},
  ],
  ['id'],
);
```


### `update(table_name, id_where_obj, row_obj)`

- `table_name` - table name
- `id_where_obj` - object column/values to match which rows to update
- `row_obj` - object to update

```js
await db.update('test', {id: 1}, {foo: 123});

// update all rows with id = 2, setting foo = 444 and bar = 'jkl'
await db.update('test', {id: 2}, {foo: 444, bar: 'jkl'});

// update all rows with foo = 123, setting foo = 444 and bar = 'jkl'
await db.update('test', {foo: 123}, {foo: 444, bar: 'jkl'});
```


### `#format(query, [binds])`
- `query` = query string to run
- `binds` = array of binds to fill in the `?` for in the query
returns the string with each `?` filled in with each bind
This function is called internally when running `execute(query, binds)`
You probably won't need to use it yourself.

```js
DB2.format('SELECT 7;');                   // SELECT 7;
DB2.format('SELECT ?;', [7]);              // SELECT 7;
DB2.format('SELECT ?, ?, ?;', [7, 8, 9]);  // SELECT 7, 8, 9;
```


### `#createIn(in_list)`

- `in_list`
When creating more detailed queries, you might want to look for a column `IN(?, ?, ?)`. This is convenience static method to be used to create those.

```js
const binds = [1, 2, 3, 4, 5];
const query = `
  SELECT *
  FROM table
  WHERE id IN(${DB2.createIn(binds)});
`;

// query becomes: 
// SELECT *
// FROM table
// WHERE id IN(?, ?, ?, ?, ?);

await db.execute(query, binds)
```


### `#createLikeIn(column_name, in_list, joiner = 'OR')`

- `column_name` - the column to run LIKE checks against
- `in_list` - list of values to LIKE against
- `joiner` - the text to join on. `OR` by default. `AND` is another common option.

When creating more detailed queries, you might want to look for `column LIKE ?`. This is convenience static method to be used to create a bunch of those.

```js
const binds = ['a', 'e', 'i', 'o', 'u'];
const query = `
  SELECT *
  FROM table
  WHERE ${DB2.createLikeIn('id', binds)};
`;

// query becomes: 
// SELECT *
// FROM table
// WHERE ( id LIKE ? OR id LIKE ? OR id LIKE ? OR id LIKE ? OR id LIKE ? )

await db.execute(query, binds)
```

You can swap out `OR` to `AND` with the last argument.


### `#createRegexpIn(column_name, in_list, joiner = 'OR')`

- `column_name` - the column to run LIKE checks against
- `in_list` - list of values to LIKE against
- `joiner` - the text to join on. `OR` by default. `AND` is another common option.

When creating more detailed queries, you might want to look for `column REGEXP ?`. This is convenience static method to be used to create a bunch of those.

```js
const binds = ['a', 'e', 'i', 'o', 'u'];
const query = `
  SELECT *
  FROM table
  WHERE ${DB2.createRegexpIn('id', binds)};
`;

// query becomes: 
// SELECT *
// FROM table
// WHERE ( id REGEXP ? OR id REGEXP ? OR id REGEXP ? OR id REGEXP ? OR id REGEXP ? )

await db.execute(query, binds)
```

You can swap out `OR` to `AND` with the last argument.

## Why no npm package for this?
An npm package implies maintenance. I don't want to use up npm names for a repo that will likely not receive much maintenance.
