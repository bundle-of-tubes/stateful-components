'use strict';
import {StatePromulgator} from '@bundle-of-tubes/state-promulgator';

interface PaginatorState {
  pageSize: number;
  cardinality: number;
  skip: number;
  take: number;
}

/** Determines appropriate take
 * take should be pageSize unless this would result in an invalid range
 * skip+take should never exceed cardinality because that would suggest a page with rows that do not exist
 */
function computeTake(skip: number, pageSize: number, cardinality: number): number {
  return Math.min(pageSize, cardinality-skip);
}

/** Specialization of of StatePromulgator for pagination */
export class PagePromulgator extends StatePromulgator<PaginatorState> {
  constructor(
    initialPageSize: number,
    initialCardinality: number
  ) {
    super({skip: 0, take: computeTake(0, initialPageSize, initialCardinality), cardinality: initialCardinality, pageSize: initialPageSize});
  }

  /** Update the page size */
  setPageSize(pageSize: number): void {
    const {skip, cardinality}: PaginatorState = this.state
    this.updateState({pageSize, take: computeTake(skip, pageSize, cardinality)});
  }

  /** Go to first page */
  first(): void {
    this.updateState({skip: 0, take: computeTake(0, this.state.pageSize, this.state.cardinality)});
  }

  /** Go to the previous page */
  prev(): void {
    const {skip, pageSize, cardinality}: PaginatorState = this.state;
    const newSkip = Math.max(0, skip-pageSize);
    this.updateState({skip: newSkip, take: skip-newSkip}); //Note that take may be shorter than pageSize or cardinality so that the new page does not overlap with the old page
  }

  /** Go to the next page */
  next(): void {
    const {skip, pageSize, cardinality, take}: PaginatorState = this.state;
    const newSkip = skip+take; 
    this.updateState({skip: newSkip, take: computeTake(newSkip, pageSize, cardinality)});
  }

  /** Go to the last page */
  last(): void {
    const {pageSize, cardinality}: PaginatorState = this.state;
    const newSkip = Math.max(cardinality-pageSize, 0);
    this.updateState({skip: newSkip, take: computeTake(newSkip, pageSize, cardinality)});
  }
}

/**
 * Extensible controls for pagination
 */
export class PageInputs extends HTMLElement {
  DEFAULT_PAGE_SIZE: number = 13; //This shouldn't be used in the constructor because subclasses need a chance to overwrite it
  protected PAGE_SIZE_OPTIONS: Array<number> = [13,21,34,55,89,144,233];
  protected firstButton: HTMLElement = document.createElement('button');
  protected prevButton: HTMLElement = document.createElement('button');
  protected currentButton: HTMLElement = document.createElement('button');
  protected nextButton: HTMLElement = document.createElement('button');
  protected lastButton: HTMLElement = document.createElement('button');
  protected pageSizeSelect: HTMLSelectElement = document.createElement('select');

  /** Declare content of the button representing the first page */
  protected labelFirst(): void {
    this.firstButton.textContent = "first(1)";
  }
  /** Declare content of the button reprsenting the second page, depending on the current page */
  protected labelPrev(currentPage: number): void {
    this.prevButton.textContent = `previous(${Math.max(1, currentPage-1)})`;
  }
  /** Declare content of the button representing the current page */
  protected labelCurrent(pageNumber: number): void {
    this.currentButton.textContent = `current(${pageNumber})`;
  }
  /** Declare content of the button representing the next page */
  protected labelNext(currentPage: number, lastPage: number): void {
    this.nextButton.textContent = `next(${Math.min(currentPage+1, lastPage)})`;
  }
  /** Declare content of the button representing the last page */
  protected labelLast(lastPage: number): void {
    this.lastButton.textContent = `last(${lastPage})`;
  }

  /** Associate this component with a PagePromulgator */
  assignPagePromulgator(pager: PagePromulgator, pageNumberKey: symbol, pageCountKey: symbol) {
    // First Button
    this.firstButton.addEventListener('click', ()=>{
      pager.first();
    });
    // Prev Button
    this.prevButton.addEventListener('click', ()=>{
      pager.prev();
    });
    pager.registerCallback((newState: PaginatorState, oldState: PaginatorState, intermediateValues: Map<symbol, any>)=>{
      const pageNum = intermediateValues.get(pageNumberKey) as number;
      this.labelPrev(pageNum);
    }, ['skip', 'pageSize'], [pageNumberKey]);
    // Disable first and previous buttons when on the first page
    pager.registerCallback((newState: PaginatorState)=>{
      if (newState.skip === 0) {
        this.firstButton.setAttribute('disabled', 'true');
        this.prevButton.setAttribute('disabled', 'true');
      }
      else {
        this.prevButton.removeAttribute('disabled');
        this.firstButton.removeAttribute('disabled');
      }
    },['skip'], []);
    // Current Button
    pager.registerCallback((newState: PaginatorState, oldState: PaginatorState, intermediateValues: Map<symbol, any>)=>{
      const pageNum = intermediateValues.get(pageNumberKey) as number;
      this.labelCurrent(pageNum);
    }, ['skip', 'pageSize'], [pageNumberKey]);
    // Next Button
    this.nextButton.addEventListener('click', ()=>{
      pager.next();
    });
    pager.registerCallback((newState: PaginatorState, oldState: PaginatorState, intermediateValues: Map<symbol, any>)=>{
      const pageNum = intermediateValues.get(pageNumberKey) as number;
      const pageCount = intermediateValues.get(pageCountKey) as number;
      this.labelNext(pageNum, pageCount);
    }, ['skip', 'pageSize', 'cardinality'], [pageNumberKey, pageCountKey]);
    // Last Button
    this.lastButton.addEventListener('click', ()=>{
      pager.last();
    });
    pager.registerCallback((newState: PaginatorState, oldState: PaginatorState, intermediateValues: Map<symbol, any>)=>{
      const pageCount = intermediateValues.get(pageCountKey) as number;
      this.labelLast(pageCount);
    }, ['pageSize', 'cardinality'], [pageCountKey]);
    // Disable next and last page buttons when on the last page
    pager.registerCallback((newState: PaginatorState)=>{
      if (newState.skip + newState.take >= newState.cardinality) {
        this.nextButton.setAttribute('disabled', 'true');
        this.lastButton.setAttribute('disabled', 'true');
      }
      else {
        this.nextButton.removeAttribute('disabled');
        this.lastButton.removeAttribute('disabled');
      }
    }, ['skip', 'take', 'cardinality'], []);
    // Page Size Select
    this.pageSizeSelect.addEventListener('input', (e: InputEvent)=>{
      const newPageSize = parseInt(this.pageSizeSelect.value);
      if (isNaN(newPageSize)) {
        console.warn(`PageController: pageSize ${this.pageSizeSelect.value} cannot be converted to number`);
      }
      else {
        pager.setPageSize(newPageSize);
      }
    });
    pager.registerCallback((newState: PaginatorState)=>{
      this.pageSizeSelect.value = String(newState.pageSize); //should not trigger an input event, and value comparisson also prevents infinite loops
    }, ['pageSize'], []);
  }

  connectedCallback() {
    const shadow = this.attachShadow({ mode: "open"});
    const container = document.createElement('div');
    container.className = 'paginationContainer';
    // First Page Button
    this.firstButton.setAttribute('type', 'button');
    this.firstButton.className = 'paginationButton';
    this.labelFirst();
    // Button for the previous page
    this.prevButton.setAttribute('type', 'button');
    this.prevButton.className = 'paginationButton';
    //Button for the current page
    this.currentButton.setAttribute('type', 'button');
    this.currentButton.className = 'paginationButton';
    this.currentButton.setAttribute('disabled', 'true');
    //Button for the next page
    this.nextButton.setAttribute('type', 'button');
    this.nextButton.className = 'paginationButton';
    //Button for the last page
    this.lastButton.setAttribute('type', 'button');
    this.lastButton.className = 'paginationButton';
    // Page Size Select
    const pageSizeLabel = document.createElement('label');
    pageSizeLabel.setAttribute('for', 'page-sizer');
    pageSizeLabel.textContent = 'Page Size:';
    this.pageSizeSelect.className = 'paginationSelector';
    this.pageSizeSelect.setAttribute('id', 'page-sizer');
    this.pageSizeSelect.replaceChildren(...this.PAGE_SIZE_OPTIONS.map((choice: number)=>{
      const opt = document.createElement('option');
      const val = String(choice);
      opt.setAttribute('value', val);
      opt.textContent = val;
      return opt;
    }));
    this.pageSizeSelect.value = String(this.DEFAULT_PAGE_SIZE);

    container.replaceChildren(this.firstButton, this.prevButton, this.currentButton, this.nextButton, this.lastButton, pageSizeLabel, this.pageSizeSelect);
    shadow.replaceChildren(container);
  }
}

/** Event (of type "paginate") emitted when PageController indicates that a different page is requested */
export class PaginationEvent extends Event {
  /** The number of rows to be skipped, or the index of the first row on the page to be shown */
  skip: number;
  /** The number of rows in the page to be shown */
  take: number;
  constructor(skip: number, take: number) {
    super('paginate');
    this.skip = skip;
    this.take = take;
  }
}

/**
 * Web Component for pagination controls
 * Shows the user 5 buttons corresponding to the first, previous, current, next, and last pages
 * The buttons are disabled if they would not change the pagination. For example, when the user is on the first page, the first, previous, and current buttons are disabled.
 * Provides a select input for choosing the page size
 * Takes an attribute "cardinality" representing the total number of rows across all pages in the paginated table
 * Emits a PaginationEvent when the user requests a different page to be shown
 * If you want multiple sets of controls to share a state object, use the underlying PageInputs instead of PageController
 */
export class PageController extends PageInputs {
  static observedAttributes: Array<string> = ["cardinality"];
  private pager: PagePromulgator = new PagePromulgator(this.DEFAULT_PAGE_SIZE, 0);

  constructor() {
    super();
    this.pager.registerCallback((newState: PaginatorState)=>{
      this.dispatchEvent(new PaginationEvent(newState.skip, newState.take));
    }, ['skip', 'take'], []);
    const pageNumberKey = this.pager.registerCallback((newState: PaginatorState)=>{
      return Math.ceil(newState.skip/newState.pageSize)+1;
    }, [], []);
    const pageCountKey = this.pager.registerCallback((newState: PaginatorState)=>{
      return Math.max(Math.ceil(newState.cardinality/newState.pageSize), 1);
    }, [], []);
    this.assignPagePromulgator(this.pager, pageNumberKey, pageCountKey);
  }

  connectedCallback() {
    super.connectedCallback();
    this.pager.updateState({pageSize: this.DEFAULT_PAGE_SIZE, skip: 0, take: 0, cardinality: 0}, true);
  }

  /** Executes when an element of observedAttributes is assigned or changed */
  attributeChangedCallback(attributeName: string, oldValue: string, newValue: string) {
    if (attributeName === "cardinality") {
      const cardinality = parseInt(newValue);
      if (isNaN(cardinality)) {
        console.warn(`PageController: cardinality ${newValue} cannot be converted to integer`);
      }
      else {
        this.pager.updateState({cardinality, take: computeTake(this.pager.state.skip, this.pager.state.pageSize, cardinality)});
      }
    }
  }
}

