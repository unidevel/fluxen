'use strict';
var assign = require('object-assign');
class BaseStore {
  constructor(initialState = {}){
    this.state = initialState;
    this.currentListeners = this.nextListeners = [];
  }

  notifyListeners(){
    var listeners = this.currentListeners = this.nextListeners
    for (var i = 0; i < listeners.length; i++) {
      listeners[i](this);
    }
  }

  ensureCanMutateNextListeners() {
    if (this.nextListeners === this.currentListeners) {
      this.nextListeners = this.currentListeners.slice()
    }
  }

  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected listener to be a function.')
    }

    var isSubscribed = true

    //ensureCanMutateNextListeners()
    this.nextListeners.push(listener)

    return function unsubscribe() {
      if (!isSubscribed) {
        return
      }

      isSubscribed = false

      //ensureCanMutateNextListeners()
      var index = this.nextListeners.indexOf(listener)
      this.nextListeners.splice(index, 1)
    }.bind(this);
  }

  getState(){
    return this.state;
  }
}

function _dispatch(reducer, lastState, setState, action, args){
    var func = reducer[action];
    if ( !func ) throw new Error(`Action[${action}] not defined`);
    var result, err = null;
    try {
      result = func.apply(reducer, args);
    }
    catch(e){
      err = e;
    }
    if ( result && 'function' == typeof(result.then) ) {
      result.then((data)=>{
        if ( data ) {
          setState(assign({}, lastState, data));
          this.notifyListeners();
        }
      });
      return result;
    }
    else {
      if ( result ) {
        setState(assign({}, lastState, result));
        this.notifyListeners();
      }
      return new Promise((resolve, reject)=>{
        if ( err ) reject(err);
        else resolve(result);
      });
    }
  }


class Store extends BaseStore {
  constructor(reducer, initialState){
    super(initialState);
    this.reducer = reducer;
    this.state = initialState;
  }

  dispatch(action, ...args){
    var setState = (newState)=>{
      this.state = newState;
    }
    return _dispatch.call(this, this.reducer, this.state, setState, action, args);
  }
}

class CombineStore extends BaseStore {
  constructor(reducers, initialState={}){
    super(initialState);
    this.methodCache = {};
    this.reducers = reducers;
  }

  dispatch(action, ...args){
    var reducerField = this.methodCache[action];
    if ( !reducerField ) {
      for ( var field in this.reducers ){
        var reducer = this.reducers[field];
        if ( reducer[action] ) {
          reducerField = this.methodCache[action] = field;
        }
      }
    }
    if ( !reducerField ) throw new Error(`Action[${action}] not defined`);
    var reducer = this.reducers[reducerField];
    var setState = (newState)=>{
      this.state = assign({}, this.state);
      this.state[reducerField] = newState;
    }
    var lastState = this.state && this.state[reducerField];
    return _dispatch.call(this, reducer, lastState, setState, action, args);
  }
}

function compose(...funcs) {
  if (funcs.length === 0) {
    return (arg) => arg;
  } else {
    const last = funcs[funcs.length - 1]
    const rest = funcs.slice(0, -1)
    return (...args) => rest.reduceRight((composed, f) => f(composed), last(...args))
  }
}

export function applyMiddleware(...middlewares) {
  return (createStore)=>(reducer, initialState)=>{
    var store = createStore(reducer, initialState);
    var dispatch = store.dispatch.bind(store);
    var chain = []

    var args = {
      getState: store.getState,
      dispatch: (action, ...args) => dispatch(action, ...args)
    };
    chain = middlewares.map((middleware)=>middleware(args));
    store.dispatch = compose(...chain)(dispatch);
    return store;
  }
}

export function createStore(reducer, initialState, enhancer){
  if ( typeof enhancer == 'function' ) {
    return enhancer(createStore)(reducer, initialState);
  }
  var store = new Store(reducer, initialState);
  return store;
}

export function combineStore(reducers, initialState, enhancer){
  if ( typeof enhancer == 'function' ) {
    return enhancer(combineStore)(reducer, initialState);
  }
  var store = new CombineStore(reducers, initialState);
  return store;
}
