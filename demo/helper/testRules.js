function shuffle(array) {
  let counter = array.length;

  // While there are elements in the array
  while (counter > 0) {
    // Pick a random index
    let index = Math.floor(Math.random() * counter);

    // Decrease counter by 1
    counter--;

    // And swap the last element with it
    let temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
}

function verify() {
  const rules = [].concat(...Array.from(document.styleSheets).map((d) => Array.from(d.cssRules))).filter((d) => d.selectorText);
  const m = new Map();
  for (const rule of rules) {
    if (rule.styleMap.size === 0) {
      console.warn('empty rule', rule);
    }

    if (m.has(rule.selectorText)) {
      console.warn('duplicate selector detected: ', rule.selectorText, rule, rules.find((d) => d.selectorText === rule.selectorText));
    }
    m.set(rule.selectorText, []);
  }
}

function test(outer = 10, inner = 100) {
  const rules = [].concat(...Array.from(document.styleSheets).map((d) => Array.from(d.cssRules))).filter((d) => d.selectorText);

  const m = new Map();
  for (const rule of rules) {
    m.set(rule.cssText, []);
  }
  console.log('start');

  for (let i = 0; i < outer; ++i) {
    console.log('sample', i);
    shuffle(rules);
    for (const rule of rules) {
      const now = performance.now();
      for (let j = 0; j < inner; ++j) {
        document.querySelectorAll(rule.selectorText).length;
      }
      const time = performance.now() - now;
      m.get(rule.cssText).push(time);
    }
  }

  console.log('done');

  const data = [];
  let acc = 0;

  for (const entry of m.entries()) {
    const [s, times] = entry;
    times.sort((a, b) => a - b);
    // drop first and last
    times.splice(0, 1);
    times.splice(times.length - 1, 1);
    const total = times.reduce((a, b) => a + b, 0);
    acc += total;
    data.push({
      time: total,
      selector: s,
      min: Math.min(...times),
      max: Math.max(...times)
    });
  }
  data.sort((a, b) => b.time - a.time);

  console.log('total', acc, data.length);

  return data;
}
