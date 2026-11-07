// Sample content that exercises every block type and question type.
// Idempotent: a course is only inserted when its slug doesn't exist yet.

const tf = [{ id: 'true', text: 'True' }, { id: 'false', text: 'False' }]
const opts = (...texts) => texts.map((text, i) => ({ id: 'abcdefgh'[i], text }))

const COURSES = [
  {
    course: {
      slug: 'javascript-fundamentals',
      title: 'JavaScript Fundamentals',
      tagline: 'From your first variable to closures and the event loop.',
      description:
        'A hands-on tour of the language that runs the web. Each concept mixes short explanations, worked examples, interactive drills and practice questions. Pick a level that matches you: beginners start with the basics, while advanced learners go deep into scope and async code.',
      category: 'Programming',
      icon: '⚡',
      color: '#f5a524',
      published: true,
    },
    exam: { duration_minutes: 15, question_count: 10, pass_mark: 70, max_attempts: 0, cooldown_minutes: 0, shuffle_options: true, show_review: true, include_lower_levels: true },
    concepts: [
      {
        slug: 'what-is-javascript',
        title: 'What is JavaScript?',
        summary: 'Where JavaScript runs and how an engine turns text into action.',
        level: 'beginner',
        est_minutes: 6,
        blocks: [
          { type: 'text', md: '## The language of the web\nJavaScript is a **programming language** that runs in every web browser, and on servers through **Node.js**. It makes pages interactive: buttons respond, forms check their input, and data loads without a full page refresh.\n\n- Created in **1995** by Brendan Eich at Netscape, in about 10 days\n- Standardised as **ECMAScript** (ES2015 = "ES6")\n- Runs in browsers, servers, mobile apps and even microcontrollers' },
          { type: 'diagram', title: 'From code to result', nodes: ['You write code', 'Engine parses it', 'Compiles to bytecode', 'Executes', 'Page updates'] },
          { type: 'callout', tone: 'info', title: 'JavaScript ≠ Java', md: 'The names are similar for marketing reasons only. They are completely different languages.' },
          { type: 'flashcards', cards: [
            { front: 'ECMAScript', back: 'The official specification that JavaScript implements.' },
            { front: 'Engine', back: 'The program that runs JS, e.g. V8 (Chrome, Node) or SpiderMonkey (Firefox).' },
            { front: 'Node.js', back: 'A runtime that lets JavaScript run outside the browser, on servers.' },
          ] },
          { type: 'check', question: 'Which of these is a JavaScript engine?', options: ['V8', 'JVM', 'CPython', 'Rails'], correct: 0, explanation: 'V8 powers Chrome and Node.js. The JVM runs Java, CPython runs Python, and Rails is a Ruby framework.' },
        ],
      },
      {
        slug: 'variables-and-types',
        title: 'Variables & Data Types',
        summary: 'let, const, and the seven primitive types.',
        level: 'beginner',
        est_minutes: 10,
        blocks: [
          { type: 'text', md: '## Storing values\nA **variable** is a named box that holds a value. Modern JavaScript gives you two keywords for creating them:\n\n- `const`: the binding can **not** be reassigned. Use it by default.\n- `let`: the binding **can** be reassigned later.\n\nAvoid `var` in new code. Its function-level scoping causes surprising bugs.' },
          { type: 'code', language: 'js', code: "const name = 'Ada'      // string\nlet age = 36            // number\nlet isAdmin = false     // boolean\nlet nothing = null      // intentional empty value\nlet notSet              // undefined\n\nage = age + 1           // ✅ let can change\n// name = 'Grace'       // ❌ TypeError: assignment to constant", caption: 'Declaring variables' },
          { type: 'match', prompt: 'Match each value to its type', pairs: [
            { left: "'hello'", right: 'string' },
            { left: '42', right: 'number' },
            { left: 'true', right: 'boolean' },
            { left: 'undefined', right: 'undefined' },
            { left: '10n', right: 'bigint' },
          ] },
          { type: 'example', title: 'typeof surprises', problem: 'What does `typeof null` return, and why is it surprising?', solution: "It returns `'object'`. This is a bug from the very first version of JavaScript that can never be fixed without breaking the web. `null` is actually a primitive. To check for it, use `value === null`." },
          { type: 'reveal', items: [
            { q: 'Can I change the contents of a const array?', a: 'Yes. `const` stops you from reassigning the variable, but the array itself can still change: `const a = []; a.push(1)` works fine.' },
            { q: 'What is the difference between null and undefined?', a: '`undefined` means a value was never assigned. `null` is a value you set on purpose to say "empty".' },
          ] },
        ],
      },
      {
        slug: 'operators-and-comparison',
        title: 'Operators & Comparison',
        summary: 'Arithmetic, logic, and why === beats ==.',
        level: 'beginner',
        est_minutes: 8,
        blocks: [
          { type: 'text', md: '## Doing things with values\nOperators combine values: `+ - * / %` for arithmetic, `&& || !` for logic, and `=== !== < >` for comparison.' },
          { type: 'callout', tone: 'warning', title: 'Always prefer ===', md: '`==` converts types before comparing, so `0 == \'\'` is **true**. `===` checks both value *and* type, so there are no surprises.' },
          { type: 'code', language: 'js', code: "1 + '2'      // '12'  (number becomes a string)\n'5' - 2      // 3     (string becomes a number)\n0 == false   // true\n0 === false  // false\nnull ?? 'default' // 'default'  (nullish coalescing)" },
          { type: 'order', prompt: 'Order these from highest to lowest precedence', items: ['( ) grouping', '* multiplication', '+ addition', '=== equality', '&& logical AND', '= assignment'] },
          { type: 'check', question: "What is the value of `'3' * '4'`?", options: ['12', "'34'", 'NaN', 'TypeError'], correct: 0, explanation: '`*` only works on numbers, so both strings are converted to numbers first.' },
        ],
      },
      {
        slug: 'functions',
        title: 'Functions',
        summary: 'Declarations, arrow functions, parameters and return values.',
        level: 'intermediate',
        est_minutes: 12,
        blocks: [
          { type: 'text', md: '## Reusable blocks of logic\nA function takes **inputs** (parameters), does some work, and can **return** an output. In JavaScript, functions are *first-class values*: you can store them in variables, pass them to other functions, and return them from functions.' },
          { type: 'steps', title: 'Anatomy of a call: `add(2, 3)`', steps: [
            { title: 'Lookup', md: 'The engine finds the value bound to `add`. It is a function object.' },
            { title: 'New frame', md: 'A new **execution context** is pushed onto the call stack, with `a = 2` and `b = 3`.' },
            { title: 'Run body', md: 'The statements in the body run. `a + b` evaluates to `5`.' },
            { title: 'Return', md: '`return 5` pops the frame off the stack and hands `5` back to the caller.' },
          ] },
          { type: 'code', language: 'js', code: "function add(a, b) {\n  return a + b\n}\n\nconst square = (n) => n * n          // arrow function\nconst greet = (name = 'friend') => `Hi ${name}!` // default param\n\n[1, 2, 3].map(square) // [1, 4, 9]  (passing a function as a value)" },
          { type: 'example', title: 'Rest parameters', problem: 'Write `sum(...nums)` so that it adds up any number of arguments.', solution: '```js\nconst sum = (...nums) => nums.reduce((total, n) => total + n, 0)\nsum(1, 2, 3, 4) // 10\n```\n`...nums` collects every argument into a real array.' },
          { type: 'flashcards', cards: [
            { front: 'Pure function', back: 'Same input always gives the same output, with no side effects.' },
            { front: 'Higher-order function', back: 'A function that takes or returns another function (map, filter, reduce).' },
            { front: 'Hoisting', back: 'Function declarations can be called before the line where they appear. Arrow functions cannot.' },
          ] },
        ],
      },
      {
        slug: 'arrays-and-objects',
        title: 'Arrays & Objects',
        summary: 'Structured data, destructuring, and the big three array methods.',
        level: 'intermediate',
        est_minutes: 12,
        blocks: [
          { type: 'text', md: '## Grouping data\n- **Arrays** are ordered lists, accessed by position: `list[0]`\n- **Objects** hold key → value pairs, accessed by name: `user.name`' },
          { type: 'code', language: 'js', code: "const user = { name: 'Ada', langs: ['js', 'py'] }\nconst { name, langs: [first] } = user   // destructuring\nconst copy = { ...user, name: 'Grace' } // spread\n\nconst nums = [1, 2, 3, 4, 5]\nnums.filter(n => n % 2)     // [1, 3, 5]\nnums.map(n => n * 10)       // [10, 20, 30, 40, 50]\nnums.reduce((a, n) => a + n, 0) // 15" },
          { type: 'match', prompt: 'Match each array method to what it returns', pairs: [
            { left: 'map', right: 'A new array of the same length' },
            { left: 'filter', right: 'A new array that may be shorter' },
            { left: 'reduce', right: 'A single accumulated value' },
            { left: 'find', right: 'The first matching element, or undefined' },
          ] },
          { type: 'example', title: 'Group by', problem: 'Turn `[{type:\'fruit\',name:\'apple\'},{type:\'veg\',name:\'kale\'},{type:\'fruit\',name:\'fig\'}]` into `{fruit:[\'apple\',\'fig\'], veg:[\'kale\']}`.', solution: "```js\nconst grouped = items.reduce((acc, { type, name }) => {\n  (acc[type] ??= []).push(name)\n  return acc\n}, {})\n```\nModern runtimes also offer `Object.groupBy(items, i => i.type)`." },
          { type: 'check', question: 'Which one changes (mutates) the original array?', options: ['push', 'map', 'filter', 'slice'], correct: 0, explanation: '`push` adds to the existing array. The other three return a new array and leave the original alone.' },
        ],
      },
      {
        slug: 'scope-and-closures',
        title: 'Scope & Closures',
        summary: 'How functions remember the variables around them.',
        level: 'advanced',
        est_minutes: 15,
        blocks: [
          { type: 'text', md: '## Lexical scope\nA variable is visible inside the block where it is declared, and inside every block nested in it. Scope is decided by **where you write the code**, not where it runs.\n\nA **closure** is a function together with the variables that were in scope when it was created. The function keeps those variables alive even after the outer function has returned.' },
          { type: 'diagram', title: 'The scope chain lookup', nodes: ['Local scope', 'Enclosing function', 'Module scope', 'Global scope', 'ReferenceError'] },
          { type: 'steps', title: 'Tracing a counter closure', steps: [
            { title: 'Create', md: '`function makeCounter() { let count = 0; return () => ++count }`' },
            { title: 'Call outer', md: '`const next = makeCounter()` runs the outer function. `count = 0` is created, and the inner arrow function is returned.' },
            { title: 'Outer frame ends', md: 'The outer function has returned, but `count` is **not** garbage collected because the arrow function still refers to it.' },
            { title: 'Call inner', md: '`next()` → 1, `next()` → 2. Each call updates the same `count` that the closure holds on to.' },
          ] },
          { type: 'example', title: 'The classic loop bug', problem: "What does this print?\n```js\nfor (var i = 0; i < 3; i++) setTimeout(() => console.log(i))\n```", solution: 'It prints `3 3 3`. `var` creates one shared `i` for the whole function, and the callbacks run after the loop has finished. Change it to `let i`, which creates a fresh binding on each iteration, and it prints `0 1 2`.' },
          { type: 'reveal', items: [
            { q: 'Where are closures useful in practice?', a: 'Private state (modules, counters), memoisation, event handlers that need context, and partial application such as `const add5 = add(5)`.' },
            { q: 'Can closures cause memory leaks?', a: 'They can, if a long-lived closure (for example a global event listener) holds on to large objects you no longer need.' },
          ] },
        ],
      },
      {
        slug: 'async-javascript',
        title: 'Async JavaScript & the Event Loop',
        summary: 'Callbacks, promises, async/await and the task queues.',
        level: 'advanced',
        est_minutes: 18,
        blocks: [
          { type: 'text', md: '## One thread, many tasks\nJavaScript runs on a **single thread**. Slow operations such as network calls and timers are handed off to the environment. When they finish, their callbacks are queued and run later by the **event loop**.' },
          { type: 'diagram', title: 'The event loop', nodes: ['Call stack runs sync code', 'Async work handed to Web APIs', 'Callback queued', 'Microtasks drain first', 'Event loop picks next task'] },
          { type: 'code', language: 'js', code: "console.log('A')\nsetTimeout(() => console.log('B'), 0)\nPromise.resolve().then(() => console.log('C'))\nconsole.log('D')\n// Output: A D C B" },
          { type: 'order', prompt: 'Put the output of the snippet above in order', items: ['A', 'D', 'C', 'B'] },
          { type: 'example', title: 'Run requests in parallel', problem: 'You `await` three independent fetches one after another, and it takes 3× as long as it should. Fix it.', solution: '```js\nconst [user, posts, tags] = await Promise.all([\n  getUser(), getPosts(), getTags(),\n])\n```\n`Promise.all` starts all three at once and waits for every one of them. Use `Promise.allSettled` if a single failure should not reject the whole batch.' },
          { type: 'callout', tone: 'success', title: 'Rule of thumb', md: 'Microtasks (promise callbacks, `queueMicrotask`) always run **before** the next macrotask (`setTimeout`, I/O, UI events).' },
          { type: 'check', question: 'What does an `async` function always return?', options: ['A Promise', 'undefined', 'The awaited value', 'A generator'], correct: 0 },
        ],
      },
    ],
    questions: [
      // what-is-javascript
      { c: 'what-is-javascript', level: 'beginner', type: 'single', prompt: 'Which runtime lets JavaScript run on a server?', options: opts('Node.js', 'Django', 'JVM', 'Apache'), answer: ['a'], explanation: 'Node.js embeds the V8 engine outside the browser.' },
      { c: 'what-is-javascript', level: 'beginner', type: 'true_false', prompt: 'JavaScript and Java are versions of the same language.', options: tf, answer: ['false'], explanation: 'They are unrelated. The shared name was a marketing decision.' },
      { c: 'what-is-javascript', level: 'beginner', type: 'short', prompt: 'What is the name of the official specification that JavaScript implements?', options: [], answer: ['ECMAScript', 'ECMA-262', 'ES'], explanation: 'ECMAScript, published by Ecma International as ECMA-262.' },
      { c: 'what-is-javascript', level: 'intermediate', type: 'multiple', prompt: 'Which of these are JavaScript engines? (Select all that apply)', options: opts('V8', 'SpiderMonkey', 'JavaScriptCore', 'Zend'), answer: ['a', 'b', 'c'], explanation: 'Zend is the PHP engine.' },
      // variables
      { c: 'variables-and-types', level: 'beginner', type: 'single', prompt: 'Which keyword declares a variable that cannot be reassigned?', options: opts('const', 'let', 'var', 'static'), answer: ['a'], explanation: '`const` creates a binding that cannot be reassigned.' },
      { c: 'variables-and-types', level: 'beginner', type: 'single', prompt: "What does `typeof 'hello'` return?", options: opts("'string'", "'text'", "'char'", "'object'"), answer: ['a'] },
      { c: 'variables-and-types', level: 'beginner', type: 'true_false', prompt: 'You can push items into an array declared with const.', options: tf, answer: ['true'], explanation: 'const prevents reassigning the variable. It does not stop the array itself from changing.' },
      { c: 'variables-and-types', level: 'intermediate', type: 'single', prompt: 'What does `typeof null` return?', options: opts("'object'", "'null'", "'undefined'", "'number'"), answer: ['a'], explanation: 'A historical bug kept for backwards compatibility.' },
      { c: 'variables-and-types', level: 'intermediate', type: 'multiple', prompt: 'Which of these are primitive types?', options: opts('string', 'symbol', 'bigint', 'array'), answer: ['a', 'b', 'c'], explanation: 'Arrays are objects.' },
      // operators
      { c: 'operators-and-comparison', level: 'beginner', type: 'single', prompt: "What is `1 + '2'`?", options: opts("'12'", '3', 'NaN', 'TypeError'), answer: ['a'], explanation: 'When one side of `+` is a string, the other side is converted to a string and the two are joined.' },
      { c: 'operators-and-comparison', level: 'beginner', type: 'true_false', prompt: '`0 === false` evaluates to true.', options: tf, answer: ['false'], explanation: 'Strict equality also compares types: number vs boolean.' },
      { c: 'operators-and-comparison', level: 'beginner', type: 'single', prompt: 'What does `10 % 3` evaluate to?', options: opts('1', '3', '3.33', '0'), answer: ['a'], explanation: '`%` is the remainder operator.' },
      { c: 'operators-and-comparison', level: 'intermediate', type: 'single', prompt: "What is `null ?? 'x'`, and what is `0 ?? 'x'`?", options: opts("'x' and 0", "'x' and 'x'", "null and 0", "'x' and undefined"), answer: ['a'], explanation: '`??` only falls back for null or undefined, not for other falsy values like 0.' },
      { c: 'operators-and-comparison', level: 'intermediate', type: 'short', prompt: 'Which operator checks both value and type equality? (type the operator)', options: [], answer: ['==='], explanation: 'Strict equality: ===' },
      // functions
      { c: 'functions', level: 'intermediate', type: 'single', prompt: 'What does `[1,2,3].map(n => n * 2)` return?', options: opts('[2, 4, 6]', '[1, 2, 3]', '12', 'undefined'), answer: ['a'] },
      { c: 'functions', level: 'intermediate', type: 'true_false', prompt: 'Arrow functions can be called before they are defined, just like function declarations.', options: tf, answer: ['false'], explanation: 'Only function declarations are hoisted along with their body.' },
      { c: 'functions', level: 'intermediate', type: 'multiple', prompt: 'Which of these are higher-order functions?', options: opts('Array.prototype.map', 'setTimeout', 'Math.max', 'Array.prototype.filter'), answer: ['a', 'b', 'd'], explanation: 'Each of these takes a function as an argument. Math.max only takes numbers.' },
      { c: 'functions', level: 'beginner', type: 'single', prompt: "Given `const greet = (name = 'friend') => 'Hi ' + name`, what does `greet()` return?", options: opts("'Hi friend'", "'Hi undefined'", "'Hi '", 'TypeError'), answer: ['a'] },
      { c: 'functions', level: 'advanced', type: 'single', prompt: 'Inside an arrow function, `this` refers to…', options: opts('The `this` of the enclosing scope', 'The arrow function itself', 'Always the global object', 'The first argument'), answer: ['a'], explanation: 'Arrow functions do not have their own `this`. They use the one from the surrounding code.' },
      // arrays/objects
      { c: 'arrays-and-objects', level: 'intermediate', type: 'single', prompt: 'Which method returns a single accumulated value?', options: opts('reduce', 'map', 'filter', 'forEach'), answer: ['a'] },
      { c: 'arrays-and-objects', level: 'intermediate', type: 'single', prompt: "After `const { a, ...rest } = { a: 1, b: 2, c: 3 }`, what is `rest`?", options: opts('{ b: 2, c: 3 }', '[2, 3]', '{ a: 1 }', 'undefined'), answer: ['a'] },
      { c: 'arrays-and-objects', level: 'intermediate', type: 'multiple', prompt: 'Which of these methods mutate the original array?', options: opts('push', 'splice', 'sort', 'concat'), answer: ['a', 'b', 'c'], explanation: 'concat returns a new array. `toSorted()` is the version of sort that does not mutate.' },
      { c: 'arrays-and-objects', level: 'beginner', type: 'single', prompt: "What is `['a','b','c'][1]`?", options: opts("'b'", "'a'", "'c'", 'undefined'), answer: ['a'], explanation: 'Arrays are zero-indexed.' },
      { c: 'arrays-and-objects', level: 'advanced', type: 'true_false', prompt: '`{ ...obj }` makes a deep copy of nested objects.', options: tf, answer: ['false'], explanation: 'Spread is a shallow copy. Use `structuredClone(obj)` for a deep copy.' },
      // closures
      { c: 'scope-and-closures', level: 'advanced', type: 'single', prompt: 'What prints: `for (var i=0;i<3;i++) setTimeout(()=>console.log(i))`?', options: opts('3 3 3', '0 1 2', '0 0 0', 'undefined ×3'), answer: ['a'] },
      { c: 'scope-and-closures', level: 'advanced', type: 'single', prompt: 'A closure is best described as…', options: opts('A function bundled with references to its surrounding scope', 'A function that has finished running', 'A private class field', 'An immediately invoked function'), answer: ['a'] },
      { c: 'scope-and-closures', level: 'advanced', type: 'true_false', prompt: 'Scope in JavaScript is decided by where a function is called, not where it is written.', options: tf, answer: ['false'], explanation: 'JavaScript uses lexical scope: what matters is where the function is written.' },
      { c: 'scope-and-closures', level: 'advanced', type: 'multiple', prompt: 'Which of these create a new block scope for `let`/`const`?', options: opts('if { }', 'for loop body', 'object literal { }', 'a bare { } block'), answer: ['a', 'b', 'd'], explanation: 'Object literals are expressions, not blocks.' },
      { c: 'scope-and-closures', level: 'intermediate', type: 'single', prompt: 'What happens when you read an undeclared variable?', options: opts('ReferenceError', 'It returns undefined', 'It returns null', 'SyntaxError'), answer: ['a'] },
      // async
      { c: 'async-javascript', level: 'advanced', type: 'single', prompt: "Output order of: log('A'); setTimeout(log('B')); Promise.then(log('C')); log('D')", options: opts('A D C B', 'A B C D', 'A C D B', 'A D B C'), answer: ['a'], explanation: 'Synchronous code runs first, then microtasks (promises), then macrotasks (timers).' },
      { c: 'async-javascript', level: 'advanced', type: 'single', prompt: 'Which runs ALL promises at once and rejects as soon as ANY of them fails?', options: opts('Promise.all', 'Promise.allSettled', 'Promise.any', 'Promise.race'), answer: ['a'] },
      { c: 'async-javascript', level: 'advanced', type: 'true_false', prompt: 'An async function always returns a Promise.', options: tf, answer: ['true'] },
      { c: 'async-javascript', level: 'advanced', type: 'short', prompt: 'Which keyword pauses an async function until a promise settles?', options: [], answer: ['await'] },
      { c: 'async-javascript', level: 'intermediate', type: 'single', prompt: 'JavaScript in the browser runs your code on…', options: opts('A single main thread', 'One thread per function', 'A thread pool', 'The GPU'), answer: ['a'] },
    ],
  },
  {
    course: {
      slug: 'personal-finance-101',
      title: 'Personal Finance 101',
      tagline: 'Budgeting, saving and investing basics, explained simply.',
      description: 'Build money habits that last. Learn how to budget, how compound interest works, and how to think about risk before you invest.',
      category: 'Life Skills',
      icon: '💰',
      color: '#17c964',
      published: true,
    },
    exam: { duration_minutes: 10, question_count: 6, pass_mark: 60, max_attempts: 3, cooldown_minutes: 0, shuffle_options: true, show_review: true, include_lower_levels: true },
    concepts: [
      {
        slug: 'budgeting',
        title: 'Budgeting with 50/30/20',
        summary: 'A simple framework for splitting your income.',
        level: 'beginner',
        est_minutes: 7,
        blocks: [
          { type: 'text', md: '## Give every dollar a job\nThe **50/30/20 rule** splits your take-home pay into three parts:\n\n- **50%** needs: rent, groceries, utilities\n- **30%** wants: dining out, hobbies\n- **20%** savings and paying down debt' },
          { type: 'image', url: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle r="80" cx="100" cy="100" fill="none" stroke="#6d5efc" stroke-width="40" stroke-dasharray="251 503" transform="rotate(-90 100 100)"/><circle r="80" cx="100" cy="100" fill="none" stroke="#f5a524" stroke-width="40" stroke-dasharray="151 503" stroke-dashoffset="-251" transform="rotate(-90 100 100)"/><circle r="80" cx="100" cy="100" fill="none" stroke="#17c964" stroke-width="40" stroke-dasharray="101 503" stroke-dashoffset="-402" transform="rotate(-90 100 100)"/></svg>'), alt: '50/30/20 donut chart', caption: 'Purple: needs (50%) · Amber: wants (30%) · Green: savings (20%)' },
          { type: 'example', title: 'Try it', problem: 'You take home **$3,200** a month. How much goes to each bucket?', solution: 'Needs: **$1,600** · Wants: **$960** · Savings: **$640**' },
          { type: 'check', question: 'A streaming subscription falls under…', options: ['Wants', 'Needs', 'Savings'], correct: 0 },
        ],
      },
      {
        slug: 'compound-interest',
        title: 'Compound Interest',
        summary: 'Why starting early matters so much.',
        level: 'intermediate',
        est_minutes: 9,
        blocks: [
          { type: 'text', md: '## Interest on interest\nWith compound interest, the interest you earn is added to your balance, so next time you earn interest on that interest too. Over time this makes growth **exponential**.\n\n`A = P × (1 + r)^t`' },
          { type: 'steps', title: '$1,000 at 10% per year', steps: [
            { title: 'Year 1', md: '$1,000 × 1.10 = **$1,100**' },
            { title: 'Year 2', md: '$1,100 × 1.10 = **$1,210**. You earned $110, not $100.' },
            { title: 'Year 10', md: '$1,000 × 1.10¹⁰ ≈ **$2,594**' },
            { title: 'Year 30', md: '$1,000 × 1.10³⁰ ≈ **$17,449** 🚀' },
          ] },
          { type: 'callout', tone: 'tip', title: 'Rule of 72', md: 'Divide 72 by the interest rate to estimate how many years it takes your money to double. At 8%, that is about 9 years.' },
        ],
      },
      {
        slug: 'risk-and-diversification',
        title: 'Risk & Diversification',
        summary: "Don't put all your eggs in one basket.",
        level: 'advanced',
        est_minutes: 8,
        blocks: [
          { type: 'text', md: '## Spreading risk\n**Diversification** means holding many different assets, so that one bad investment cannot sink your whole portfolio.' },
          { type: 'order', prompt: 'Order from typically lowest to highest risk', items: ['Savings account', 'Government bonds', 'Index fund', 'Individual stock', 'Cryptocurrency'] },
          { type: 'flashcards', cards: [
            { front: 'Index fund', back: 'A fund that tracks a whole market index, giving you instant diversification.' },
            { front: 'Volatility', back: 'How much an investment\'s price swings up and down.' },
          ] },
        ],
      },
    ],
    questions: [
      { c: 'budgeting', level: 'beginner', type: 'single', prompt: 'In the 50/30/20 rule, what percentage goes to savings?', options: opts('20%', '30%', '50%', '10%'), answer: ['a'] },
      { c: 'budgeting', level: 'beginner', type: 'true_false', prompt: 'Rent is classified as a "want".', options: tf, answer: ['false'], explanation: 'Rent is a need.' },
      { c: 'budgeting', level: 'beginner', type: 'single', prompt: 'If you take home $4,000 a month, how much goes to wants?', options: opts('$1,200', '$800', '$2,000', '$400'), answer: ['a'], explanation: '30% × $4,000 = $1,200' },
      { c: 'compound-interest', level: 'intermediate', type: 'single', prompt: 'Using the Rule of 72, how long does it take money to double at 6%?', options: opts('12 years', '6 years', '72 years', '7 years'), answer: ['a'] },
      { c: 'compound-interest', level: 'intermediate', type: 'true_false', prompt: 'With compound interest, you earn interest on previously earned interest.', options: tf, answer: ['true'] },
      { c: 'compound-interest', level: 'beginner', type: 'single', prompt: '$100 at 10% simple interest for 2 years earns…', options: opts('$20', '$21', '$10', '$110'), answer: ['a'], explanation: 'Simple interest is only paid on the original amount: 2 × $10.' },
      { c: 'risk-and-diversification', level: 'advanced', type: 'multiple', prompt: 'Which of these increase diversification?', options: opts('Buying an index fund', 'Holding bonds and stocks', 'Putting everything into one stock', 'Investing across countries'), answer: ['a', 'b', 'd'] },
      { c: 'risk-and-diversification', level: 'advanced', type: 'single', prompt: 'Volatility measures…', options: opts('How much a price swings', 'Total return', 'Dividend size', 'Trading fees'), answer: ['a'] },
    ],
  },
]

/** @param {import('knex').Knex} knex */
export async function seed(knex) {
  for (const def of COURSES) {
    if (await knex('courses').where({ slug: def.course.slug }).first()) continue
    await knex.transaction(async (trx) => {
      const [courseId] = await trx('courses').insert(def.course)
      await trx('exam_settings').insert({ course_id: courseId, ...def.exam })
      const conceptIds = {}
      for (const [position, c] of def.concepts.entries()) {
        const [id] = await trx('concepts').insert({ ...c, course_id: courseId, position, blocks: JSON.stringify(c.blocks) })
        conceptIds[c.slug] = id
      }
      for (const { c, ...q } of def.questions) {
        await trx('questions').insert({ ...q, course_id: courseId, concept_id: conceptIds[c] ?? null, options: JSON.stringify(q.options), answer: JSON.stringify(q.answer) })
      }
    })
  }
}
