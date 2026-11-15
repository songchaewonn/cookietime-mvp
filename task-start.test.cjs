const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Exercise the actual handlers in both shipped web entry points.
for (const file of ['app.js', 'android/web/app.js']) {
  function fixture() {
    const source = fs.readFileSync(file, 'utf8');
    const buttons = new Map();
    const root = { innerHTML: '', querySelector(selector) {
      if (!buttons.has(selector)) buttons.set(selector, {});
      return buttons.get(selector);
    } };
    const task = { id: 'task-1', done: false, snoozes: 2, title: 'Study' };
    const calls = [];
    const markers = new Map([['task-1-start-0', '1'], ['other-start-0', '1']]);
    const context = vm.createContext({
      window: {}, document: { querySelector: () => root }, Date,
      state: { tasks: [task], focus: { active: false } },
      sessionStorage: { get length() { return markers.size; }, key: i => [...markers.keys()][i], removeItem: k => markers.delete(k) },
      localDate: date => date.toISOString(), esc: text => text,
      save: () => calls.push('save'), showToast: () => {},
      awardOnTimeStart: () => false, focusAction: action => calls.push(action),
      go: page => calls.push(page), startExecutiveGame: () => calls.push('game-start')
    });
    vm.runInContext(source.slice(source.indexOf('function snoozeTask('), source.indexOf('function vibrateStage(')), context);
    vm.runInContext(source.slice(source.indexOf('function promptTaskStart('), source.indexOf('window.startFocusFromNotification=')), context);
    return { task, root, buttons, calls, markers, run: code => vm.runInContext(code, context) };
  }

  test(`${file}: start prompt keeps all three actions after repeated snoozes`, () => {
    const f = fixture();
    for (let i = 0; i < 8; i++) {
      f.run("promptTaskStart('task-1')");
      assert.equal((f.root.innerHTML.match(/class="button/g) || []).length, 3);
      const before = Date.now();
      f.buttons.get('[data-snooze]').onclick();
      assert.ok(Date.parse(f.task.start) >= before + 300000);
      assert.ok(Date.parse(f.task.start) <= Date.now() + 300000);
      assert.equal(f.root.innerHTML, '');
    }
    assert.equal(f.task.snoozes, 10);
    assert.equal(f.calls.filter(c => c === 'save').length, 8);
    assert.equal(f.markers.has('task-1-start-0'), false);
    assert.equal(f.markers.has('other-start-0'), true);
  });

  test(`${file}: focus choice starts focus and closes the prompt`, () => {
    const f = fixture(); f.run("promptTaskStart('task-1')");
    f.buttons.get('[data-start-now]').onclick();
    assert.deepEqual(f.calls, ['start-focus']);
    assert.equal(f.root.innerHTML, '');
  });

  test(`${file}: game choice navigates and starts the game without starting focus`, () => {
    const f = fixture(); f.run("promptTaskStart('task-1')");
    f.buttons.get('[data-start-game]').onclick();
    assert.deepEqual(f.calls, ['game', 'game-start']);
    assert.equal(f.root.innerHTML, '');
  });
}
