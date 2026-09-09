# stateful-components
Web Components utilizing the stateful-promulgator tool

Usage examples can be found at https://github.com/bundle-of-tubes/promulgator-examples

## Pagination

Components and utilities to control pagination based on "skip" and "take"

### PagePromulgator

A specialization of StatePromulgator for pagination. The state has the following properties:
* pageSize: The typical size of pages
* cardinality: The total number of items across all pages (determining which page is the last)
* skip: The number of items belonging to previous pages, or the index of the first item to appear on the current page
* take: The actual number of items in the page to be rendered

#### PagePromulgator Constructor

##### Parameters
* initialPageSize: the default page size ("take" will be the same as the page size except
* initialCardinality: The total number of items across all pages

##### Examples

```javascript
import {PagePromulgator} from '@bundle-of-tubes/stateful-components';

const pager = new PagePromulgator(20, 99);

```

#### PagePromulgator.prototype.setPageSize()

Setter for the page size

##### Parameters
* newPageSize: the new value of the pageSize

##### Examples

```javascript
pager.setPageSize(50);
```

#### PagePromulgator.prototype.first()

Updates the state to use the first full page

##### Examples

```javascript
pager.first();
```

#### PagePromulgator.prototype.prev()

Updates the state to use the page immediately preceeding the current one

The resulting page will not overlap with the current page

##### Examples

```javascript
pager.prev();
```

#### PagePromulgator.prototype.next()

Updates the state to use the page immediately following the current one

##### Examples

```javascript
pager.next();
```

#### PagePromulgator.prototype.last()

Updates the state to use the last full page

##### Examples

```javascript
pager.last();
```

### PageInputsV2

An HTMLElement with an open shadow, five buttons, and a select representing a way for the user to request changes to the paging

Unless you want the same state reflected in multiple `PageInputsV2` instances, `PageControllerV2` will be more convenient to use

#### PageInputsV2.prototype.DEFAULT_PAGE_SIZE

The initial value of the select controlling the page size

#### PageInputsV2.prototype.assignPagePromulgator()

Make the `PageInputsV2` control the state in a `PagePromulgator`

##### Parameters
* pager: a `PagePromulgator` that already has registered callbacks for computing the current page number and the total number of pages

##### Examples

```javascript
const pager = new PagePromulgator(20, 99);
document.getElementById("thead-pagination").assignPagePromulgator(pager);
document.getElementById("tfoot-pagination").assignPagePromulgator(pager);
```

### PaginationEvent

Custom event (of type "paginate") representing a requested change in page

#### PaginationEvent Constructor

##### Parameters
* skip
* take

##### Examples

```javascript
pager.registerCallback((newState)=>{
  document.getElementById("mytable").dispatchEvent(new PaginationEvent(newState.skip, newState.take));
}, ['skip', 'take'], []);
document.getElementById("mytable").addEventListener('paginate', event=>console.log(`newSkip: ${event.skip}, newTake: ${event.take}`));
```

#### PaginationEvent.prototype.skip

The requested "skip" for the new page

#### PaginationEvent.prototype.take

The requested "take" for the new page

### PageControllerV2

An HTMLElement with inputs for controlling pages

Emits a PaginationEvent when the page is changed

#### PageControllerV2.prototype.setCardinality()

Set the maximum number of rows

##### Parameters
* cardinality: The length of the list being paginated over

##### Examples

```javascript
document.getElementById('thead-pagination').setCardinality(420);
```

### PageInputs and PageController

`PageInputs` and `PageController` are similar to `PageInputsV2` and `PageControllerV2` except they show page numbers instead of page ranges on the buttons. Users find this confusing, since buttons that show the same page number can have different behaviors. Also, `PageController` takes `cardinality` as an attribute instead of providing `setCardinality()`.
