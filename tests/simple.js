'use strict';

import test from 'ava';
import {createStore, applyMiddleware} from '../lib/store';
import assign from 'object-assign';

function sleep(timeout){
  return new Promise((resolve, reject)=>{
    setTimeout(resolve, timeout);
  });
}

class TestAction {
  test(x){
    return {count: x};
  }

  async wait(n){
    console.log('in wait', n);
    await sleep(n*1000);
    return {seconds: n};
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
  await store.dispatch('test', [1,2,3]);
  t.deepEqual(store.getState().count, [1,2,3]);
  await store.dispatch('test', [4]);
  t.deepEqual(store.getState().count, [4]);
  await store.dispatch('wait', 1);
  t.is(store.getState().seconds, 1);
  t.pass();
});
