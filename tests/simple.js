'use strict';

import test from 'ava';
import {createStore, applyMiddleware} from '../lib/store';
function sleep(timeout){
  return new Promise((resolve, reject)=>{
    setTimeout(resolve, timeout);
  });
}

class TestAction {
  test(x){
    return {count: x};
  }
}

var logger1 = ({getState, dispatch})=>{
  return (next)=>{
    return (action, ...args) => {
      console.log('logger1', action, args);
      return next(action, ...args);
    }
  }
};

var logger2 = ({getState, dispatch})=>{
  return (next)=>{
    return (action, ...args) => {
      console.log('logger2', action, args);
      return next(action, ...args);
    }
  }
};

test('Simple test', async t=>{
  var store = createStore(new TestAction(), {}, applyMiddleware(logger1, logger2));
  await store.dispatch('test', 100);
  t.is(store.getState().count, 100);
  t.pass();
});
