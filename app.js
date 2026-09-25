/**
 * SQL Forge — Application Logic
 * ═════════════════════════════
 *
 * Handles:
 *  • sql.js database initialization & query execution
 *  • CodeMirror editor setup
 *  • Question flow & difficulty progression
 *  • Result comparison & feedback
 *  • Local storage persistence
 *  • UI rendering
 */

// ─── State ──────────────────────────────────────────────────────────────────

const STATE_KEY = 'sql_forge_progress';

let state = {
  currentLevel: 1,
  currentQuestionId: null,
  solvedQuestions: [],        // IDs of correctly answered questions
  starredQuestions: [],       // IDs of bookmarked questions
  correctAtLevel: {},         // { level: count }
  totalCorrect: 0,
  totalAttempts: 0,
  streak: 0,
  bestStreak: 0,
  attemptsPerQuestion: {},    // { questionId: attemptCount }
};

let selectedTreeLevel = 1;
let treeFilter = 'all';

let SQL = null;       // sql.js module
let db = null;        // current sql.js Database instance
let editor = null;    // CodeMirror instance
let currentSchema = null;  // currently loaded schema key

const CORRECT_TO_ADVANCE = 3;  // correct answers at a level to advance


// ─── Initialization ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load saved progress
    loadProgress();

    // Initialize sql.js
    SQL = await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });

    // Initialize CodeMirror
    setupEditor();

    // Load first question
    loadNextQuestion();

    // Wire up event listeners
    bindEvents();

    // Update UI
    updateHeader();

    // Reveal app
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('app').classList.add('ready');
  } catch (err) {
    console.error('Initialization failed:', err);
    document.querySelector('#loading-screen p').textContent =
      'Failed to load SQL engine. Please refresh.';
  }
});


// ─── CodeMirror Setup ───────────────────────────────────────────────────────

function setupEditor() {
  editor = CodeMirror(document.getElementById('editor-wrapper'), {
    mode: 'text/x-sql',
    theme: 'material-darker',
    lineNumbers: true,
    tabSize: 2,
    indentWithTabs: false,
    lineWrapping: true,
    autofocus: true,
    placeholder: '-- Write your SQL query here...\n-- Ctrl+Enter to run, Ctrl+Shift+Enter to submit',
    extraKeys: {
      'Ctrl-Enter': () => handleRun(),
      'Ctrl-Shift-Enter': () => handleSubmit(),
    }
  });
}


// ─── Database Management ────────────────────────────────────────────────────

function initDatabase(schemaKey) {
  if (currentSchema === schemaKey && db) return; // already loaded

  if (db) db.close();

  db = new SQL.Database();
  const sql = SCHEMAS[schemaKey];
  if (sql && sql.trim()) {
    db.exec(sql);
  }
  currentSchema = schemaKey;
}

/**
 * Execute SQL and return { columns, values } or throw on error.
 * Takes the last result set if multiple statements are provided.
 */
function executeQuery(sql) {
  const results = db.exec(sql);
  if (!results || results.length === 0) {
    return { columns: [], values: [] };
  }
  // Take the last result set (supports CTEs etc.)
  const last = results[results.length - 1];
  return {
    columns: last.columns,
    values: last.values
  };
}


// ─── Question Loading ───────────────────────────────────────────────────────

function loadNextQuestion() {
  // Get unsolved questions at current level
  let pool = QUESTIONS.filter(
    q => q.level === state.currentLevel && !state.solvedQuestions.includes(q.id)
  );

  // If all questions at this level are solved, try to advance
  if (pool.length === 0) {
    if (state.currentLevel < TOTAL_LEVELS) {
      state.currentLevel++;
      saveProgress();
      return loadNextQuestion();
    } else {
      // All questions solved!
      showCompletionState();
      return;
    }
  }

  // Pick a random question from the pool
  const q = pool[Math.floor(Math.random() * pool.length)];
  loadQuestion(q.id);
}

function loadQuestion(questionId) {
  const q = QUESTIONS.find(q => q.id === questionId);
  if (!q) return;

  state.currentQuestionId = q.id;

  // Initialize database with the question's schema
  initDatabase(q.schema);

  // Render question panel
  renderQuestion(q);

  // Render schema panel
  renderSchema(q.schema);

  // Clear editor and results
  if (editor) {
    editor.setValue('');
    setTimeout(() => editor.refresh(), 10);
  }
  clearResults();
  clearFeedback();
  hideHint();
  hideSolution();

  // Update header
  updateHeader();
}


// ─── Rendering ──────────────────────────────────────────────────────────────

function renderQuestion(q) {
  // Difficulty label
  let diff = 'easy';
  if (q.level >= 3 && q.level <= 5) diff = 'medium';
  if (q.level >= 6) diff = 'hard';

  const totalAtLevel = QUESTIONS.filter(x => x.level === q.level).length;
  const solvedAtLevel = QUESTIONS.filter(
    x => x.level === q.level && state.solvedQuestions.includes(x.id)
  ).length;

  document.getElementById('question-meta').innerHTML = `
    <span class="difficulty-badge ${diff}">${diff}</span>
    <span class="question-id">Q${q.id} · Level ${q.level} · ${LEVEL_NAMES[q.level]}</span>
  `;

  document.getElementById('question-title').innerHTML = q.title;
  // Force re-trigger animation
  document.getElementById('question-title').style.animation = 'none';
  document.getElementById('question-title').offsetHeight; // reflow
  document.getElementById('question-title').style.animation = '';

  document.getElementById('question-prompt').innerHTML = q.prompt;
  document.getElementById('question-prompt').style.animation = 'none';
  document.getElementById('question-prompt').offsetHeight;
  document.getElementById('question-prompt').style.animation = '';

  // Store hint text
  document.getElementById('hint-content').innerHTML = q.hint;
}

function renderSchema(schemaKey) {
  if (schemaKey === 'standalone' || !SCHEMAS[schemaKey] || !SCHEMAS[schemaKey].trim()) {
    document.getElementById('schema-content').innerHTML =
      '<p class="no-tables-msg">No tables needed for this question.<br>Write a standalone query.</p>';
    return;
  }

  // Query the database to get table info
  try {
    const tables = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );

    if (!tables || tables.length === 0 || tables[0].values.length === 0) {
      document.getElementById('schema-content').innerHTML =
        '<p class="no-tables-msg">No tables found.</p>';
      return;
    }

    let html = '';
    for (const [tableName] of tables[0].values) {
      // Get column info
      const colInfo = db.exec(`PRAGMA table_info('${tableName}')`);
      const columns = colInfo[0] ? colInfo[0].values.map(row => ({
        name: row[1],
        type: row[2],
        notNull: row[3],
        pk: row[5]
      })) : [];

      // Get sample data
      const data = db.exec(`SELECT * FROM "${tableName}"`);
      const rows = data[0] ? data[0].values : [];
      const colNames = data[0] ? data[0].columns : columns.map(c => c.name);

      html += `<div class="schema-table-group">`;
      html += `<div class="table-name">${tableName}</div>`;
      html += `<table class="data-table"><thead><tr>`;

      // Header with column names and types
      for (const col of columns) {
        const pkIcon = col.pk ? ' 🔑' : '';
        html += `<th>${col.name}${pkIcon}<br><span style="font-weight:400;opacity:0.6;font-size:0.65rem">${col.type || 'ANY'}</span></th>`;
      }
      html += `</tr></thead><tbody>`;

      // Data rows
      for (const row of rows) {
        html += '<tr>';
        for (const val of row) {
          if (val === null) {
            html += '<td><span class="null-val">NULL</span></td>';
          } else {
            html += `<td>${escapeHtml(String(val))}</td>`;
          }
        }
        html += '</tr>';
      }

      html += `</tbody></table></div>`;
    }

    document.getElementById('schema-content').innerHTML = html;
  } catch (err) {
    document.getElementById('schema-content').innerHTML =
      `<p class="no-tables-msg">Error reading schema: ${escapeHtml(err.message)}</p>`;
  }
}

function renderResultTable(result) {
  if (!result.columns || result.columns.length === 0) {
    return '<p class="result-empty">Query executed — no rows returned.</p>';
  }

  let html = '<table class="result-table"><thead><tr>';
  for (const col of result.columns) {
    html += `<th>${escapeHtml(col)}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (const row of result.values) {
    html += '<tr>';
    for (const val of row) {
      if (val === null || val === undefined) {
        html += '<td><span class="null-val">NULL</span></td>';
      } else {
        html += `<td>${escapeHtml(String(val))}</td>`;
      }
    }
    html += '</tr>';
  }

  html += '</tbody></table>';
  html += `<p class="result-info">${result.values.length} row${result.values.length !== 1 ? 's' : ''} returned</p>`;
  return html;
}


// ─── Event Handlers ─────────────────────────────────────────────────────────

function bindEvents() {
  document.getElementById('btn-run').addEventListener('click', handleRun);
  document.getElementById('btn-submit').addEventListener('click', handleSubmit);
  document.getElementById('btn-hint').addEventListener('click', toggleHint);
  document.getElementById('btn-next').addEventListener('click', handleNext);
  document.getElementById('btn-skip').addEventListener('click', handleNext);
  document.getElementById('btn-stats').addEventListener('click', showStatsModal);
  document.getElementById('btn-reset').addEventListener('click', handleReset);
  document.getElementById('modal-close').addEventListener('click', hideStatsModal);
  document.getElementById('stats-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideStatsModal();
  });

  // Skill Tree & Question Selector bindings
  document.getElementById('btn-tree-toggle').addEventListener('click', showTreeModal);
  document.getElementById('btn-header-level').addEventListener('click', showTreeModal);
  document.getElementById('tree-modal-close').addEventListener('click', hideTreeModal);
  document.getElementById('tree-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideTreeModal();
  });

  // Filter chips in Skill Tree
  document.querySelectorAll('.tree-filter-bar .filter-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.tree-filter-bar .filter-chip').forEach(c => c.classList.remove('active'));
      e.target.classList.add('active');
      treeFilter = e.target.dataset.filter;
      renderTopicDetail(selectedTreeLevel);
    });
  });

  // Redraw SVG connectors on window resize if tree is open
  window.addEventListener('resize', () => {
    if (document.getElementById('tree-overlay').classList.contains('visible')) {
      drawTreeConnectors();
    }
  });
}

function handleRun() {
  const sql = editor.getValue().trim();
  if (!sql) {
    showResultEmpty('Write a query first, then press Run.');
    return;
  }

  clearFeedback();

  try {
    // Re-init database to get a fresh state (undo any user modifications)
    initDatabase(currentSchema);
    // Force reload to clear any user DDL/DML changes
    if (db) db.close();
    db = new SQL.Database();
    const schemaSql = SCHEMAS[currentSchema];
    if (schemaSql && schemaSql.trim()) db.exec(schemaSql);
    currentSchema = currentSchema; // keep the key

    const result = executeQuery(sql);
    document.getElementById('result-output').innerHTML = renderResultTable(result);
  } catch (err) {
    document.getElementById('result-output').innerHTML =
      `<div class="sql-error"><span class="error-label">SQL Error</span>${escapeHtml(err.message)}</div>`;
  }
}

function handleSubmit() {
  const sql = editor.getValue().trim();
  if (!sql) {
    showResultEmpty('Write a query before submitting.');
    return;
  }

  const q = QUESTIONS.find(q => q.id === state.currentQuestionId);
  if (!q) return;

  // Track attempt
  state.totalAttempts++;
  if (!state.attemptsPerQuestion[q.id]) {
    state.attemptsPerQuestion[q.id] = 0;
  }
  state.attemptsPerQuestion[q.id]++;

  try {
    // Re-init database fresh
    if (db) db.close();
    db = new SQL.Database();
    const schemaSql = SCHEMAS[q.schema];
    if (schemaSql && schemaSql.trim()) db.exec(schemaSql);

    // Execute user query
    const userResult = executeQuery(sql);

    // Execute expected query
    const expectedResult = executeQuery(q.expectedQuery);

    // Compare
    const comparison = compareResults(userResult, expectedResult, q.orderMatters);

    // Show user's result
    document.getElementById('result-output').innerHTML = renderResultTable(userResult);

    if (comparison.correct) {
      handleCorrectAnswer(q);
      showFeedback(true, comparison.feedback.join(' '));
    } else {
      handleIncorrectAnswer(q);
      showFeedback(false, comparison.feedback.join(' '));

      // Show solution after 3 failed attempts
      if (state.attemptsPerQuestion[q.id] >= 3) {
        showSolution(q.expectedQuery);
      }
    }
  } catch (err) {
    document.getElementById('result-output').innerHTML =
      `<div class="sql-error"><span class="error-label">SQL Error</span>${escapeHtml(err.message)}</div>`;
    state.streak = 0;
    updateHeader();
  }

  saveProgress();
}

function handleCorrectAnswer(q) {
  if (!state.solvedQuestions.includes(q.id)) {
    state.solvedQuestions.push(q.id);
    state.totalCorrect++;

    if (!state.correctAtLevel[q.level]) state.correctAtLevel[q.level] = 0;
    state.correctAtLevel[q.level]++;
  }

  state.streak++;
  if (state.streak > state.bestStreak) state.bestStreak = state.streak;

  // Check if should level up
  const correctAtCurrent = state.correctAtLevel[state.currentLevel] || 0;
  const totalAtCurrent = QUESTIONS.filter(x => x.level === state.currentLevel).length;
  const unsolvedAtCurrent = QUESTIONS.filter(
    x => x.level === state.currentLevel && !state.solvedQuestions.includes(x.id)
  ).length;

  if (
    (correctAtCurrent >= CORRECT_TO_ADVANCE || unsolvedAtCurrent === 0) &&
    state.currentLevel < TOTAL_LEVELS
  ) {
    const oldLevel = state.currentLevel;
    state.currentLevel++;
    showToast(`⬆ Level Up! Now at Level ${state.currentLevel}: ${LEVEL_NAMES[state.currentLevel]}`);
  }

  // Show the Next button
  document.getElementById('btn-next').style.display = 'inline-flex';

  updateHeader();
}

function handleIncorrectAnswer(q) {
  state.streak = 0;
  updateHeader();
}

function handleNext() {
  loadNextQuestion();
}

function handleReset() {
  if (!confirm('Reset all progress? This cannot be undone.')) return;

  state = {
    currentLevel: 1,
    currentQuestionId: null,
    solvedQuestions: [],
    correctAtLevel: {},
    totalCorrect: 0,
    totalAttempts: 0,
    streak: 0,
    bestStreak: 0,
    attemptsPerQuestion: {},
  };
  currentSchema = null;
  saveProgress();
  hideStatsModal();
  loadNextQuestion();
}


// ─── Result Comparison ──────────────────────────────────────────────────────

function compareResults(userResult, expectedResult, orderMatters) {
  const result = { correct: false, feedback: [] };

  const userCols = userResult.columns || [];
  const expectedCols = expectedResult.columns || [];
  const userVals = userResult.values || [];
  const expectedVals = expectedResult.values || [];

  // Check column count
  if (userCols.length !== expectedCols.length) {
    result.feedback.push(
      `Expected ${expectedCols.length} column${expectedCols.length !== 1 ? 's' : ''}, ` +
      `but your query returned ${userCols.length}.`
    );
    return result;
  }

  // Check row count
  if (userVals.length !== expectedVals.length) {
    result.feedback.push(
      `Expected ${expectedVals.length} row${expectedVals.length !== 1 ? 's' : ''}, ` +
      `but your query returned ${userVals.length}.`
    );
    if (userVals.length > expectedVals.length) {
      result.feedback.push('Your result has extra rows — check your filtering conditions.');
    } else {
      result.feedback.push('Your result is missing rows — you may be filtering too aggressively.');
    }
    return result;
  }

  // Handle empty results
  if (expectedVals.length === 0 && userVals.length === 0) {
    result.correct = true;
    result.feedback.push('Both returned 0 rows — correct!');
    return result;
  }

  // Normalize values for comparison
  function normalize(val) {
    if (val === null || val === undefined) return 'NULL';
    // Round floats to 2 decimal places for comparison
    if (typeof val === 'number' && !Number.isInteger(val)) {
      return String(Math.round(val * 100) / 100);
    }
    return String(val);
  }

  let userRows = userVals.map(row => row.map(normalize));
  let expectedRows = expectedVals.map(row => row.map(normalize));

  // Sort if order doesn't matter
  if (!orderMatters) {
    const sortFn = (a, b) => a.join('\x00').localeCompare(b.join('\x00'));
    userRows.sort(sortFn);
    expectedRows.sort(sortFn);
  }

  // Compare cell by cell
  let mismatches = 0;
  let firstMismatch = null;

  for (let i = 0; i < expectedRows.length; i++) {
    for (let j = 0; j < expectedRows[i].length; j++) {
      const expected = expectedRows[i][j];
      const actual = userRows[i] ? userRows[i][j] : undefined;

      if (actual === undefined) {
        mismatches++;
        continue;
      }

      // Try numeric comparison with tolerance
      const numExp = parseFloat(expected);
      const numAct = parseFloat(actual);
      if (!isNaN(numExp) && !isNaN(numAct)) {
        if (Math.abs(numExp - numAct) < 0.015) continue;
      }

      if (expected !== actual) {
        mismatches++;
        if (!firstMismatch) {
          firstMismatch = {
            row: i + 1,
            col: j + 1,
            colName: expectedCols[j] || `col${j + 1}`,
            expected,
            actual
          };
        }
      }
    }
  }

  if (mismatches === 0) {
    result.correct = true;
    result.feedback.push('Your result matches perfectly!');

    // Check column name mismatches (warning only)
    const colWarnings = [];
    for (let i = 0; i < expectedCols.length; i++) {
      if (userCols[i] && userCols[i].toLowerCase() !== expectedCols[i].toLowerCase()) {
        colWarnings.push(`"${userCols[i]}" → expected "${expectedCols[i]}"`);
      }
    }
    if (colWarnings.length > 0) {
      result.feedback.push(`Minor: column names differ (${colWarnings.join(', ')}) — values are correct.`);
    }
  } else {
    result.feedback.push(`Found ${mismatches} value mismatch${mismatches > 1 ? 'es' : ''}.`);
    if (firstMismatch) {
      result.feedback.push(
        `Row ${firstMismatch.row}, column "${firstMismatch.colName}": ` +
        `expected "${firstMismatch.expected}" but got "${firstMismatch.actual}".`
      );
    }
    if (orderMatters && mismatches > 1) {
      result.feedback.push('Check your ORDER BY clause — row order matters for this question.');
    }
  }

  return result;
}


// ─── UI Helpers ─────────────────────────────────────────────────────────────

function updateHeader() {
  // Level label
  const levelLabel = document.getElementById('level-label');
  levelLabel.innerHTML = `LVL ${state.currentLevel} <span class="level-name">${LEVEL_NAMES[state.currentLevel]}</span>`;

  // Progress bar
  const totalQ = QUESTIONS.length;
  const solvedQ = state.solvedQuestions.length;
  const pct = Math.round((solvedQ / totalQ) * 100);
  document.getElementById('progress-fill').style.width = `${pct}%`;

  // Stats
  const accuracy = state.totalAttempts > 0
    ? Math.round((state.totalCorrect / state.totalAttempts) * 100)
    : 0;

  document.getElementById('stat-streak').textContent = state.streak;
  document.getElementById('stat-solved').textContent = `${solvedQ}/${totalQ}`;
  document.getElementById('stat-accuracy').textContent = `${accuracy}%`;
}

function showFeedback(correct, message) {
  const banner = document.getElementById('feedback-banner');
  banner.className = 'feedback-banner visible ' + (correct ? 'correct' : 'incorrect');
  banner.innerHTML = `
    <span class="feedback-icon">${correct ? '✅' : '❌'}</span>
    <span>${correct ? 'Correct!' : 'Not quite.'}</span>
    <span class="feedback-detail">${escapeHtml(message)}</span>
  `;
}

function clearFeedback() {
  const banner = document.getElementById('feedback-banner');
  banner.className = 'feedback-banner';
  banner.innerHTML = '';
  document.getElementById('btn-next').style.display = 'none';
}

function clearResults() {
  document.getElementById('result-output').innerHTML =
    `<div class="result-empty">
      <span style="font-size:1.8rem;opacity:0.3">⌨</span>
      <p class="prompt-text">Run a query to see results here</p>
    </div>`;
}

function showResultEmpty(msg) {
  document.getElementById('result-output').innerHTML =
    `<div class="result-empty"><p class="prompt-text">${escapeHtml(msg)}</p></div>`;
}

function toggleHint() {
  const box = document.getElementById('hint-box');
  box.classList.toggle('visible');
}

function hideHint() {
  document.getElementById('hint-box').classList.remove('visible');
}

function showSolution(query) {
  const box = document.getElementById('solution-box');
  box.querySelector('pre').textContent = query;
  box.classList.add('visible');
}

function hideSolution() {
  document.getElementById('solution-box').classList.remove('visible');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3000);
}

function showStatsModal() {
  const totalQ = QUESTIONS.length;
  const solvedQ = state.solvedQuestions.length;
  const accuracy = state.totalAttempts > 0
    ? Math.round((state.totalCorrect / state.totalAttempts) * 100)
    : 0;

  document.getElementById('stats-solved').textContent = `${solvedQ}/${totalQ}`;
  document.getElementById('stats-accuracy').textContent = `${accuracy}%`;
  document.getElementById('stats-streak').textContent = state.bestStreak;
  document.getElementById('stats-attempts').textContent = state.totalAttempts;

  // Level badges
  const badgeContainer = document.getElementById('level-badges');
  let badgeHtml = '';
  for (let l = 1; l <= TOTAL_LEVELS; l++) {
    const total = QUESTIONS.filter(q => q.level === l).length;
    const solved = QUESTIONS.filter(q => q.level === l && state.solvedQuestions.includes(q.id)).length;
    let cls = '';
    if (solved >= total) cls = 'completed';
    else if (l === state.currentLevel) cls = 'current';
    badgeHtml += `<span class="level-badge ${cls}">L${l}: ${LEVEL_NAMES[l]} (${solved}/${total})</span>`;
  }
  badgeContainer.innerHTML = badgeHtml;

  document.getElementById('stats-overlay').classList.add('visible');
}

function hideStatsModal() {
  document.getElementById('stats-overlay').classList.remove('visible');
}

function showCompletionState() {
  document.getElementById('question-meta').innerHTML =
    '<span class="difficulty-badge easy">COMPLETE</span>';
  document.getElementById('question-title').textContent = '🎉 All Questions Solved!';
  document.getElementById('question-prompt').innerHTML =
    'You\'ve completed every question in the bank. Incredible work!<br><br>' +
    'You can review any question by resetting your progress, or add more questions to <code>questions.js</code>.';
  document.getElementById('schema-content').innerHTML =
    '<p class="no-tables-msg">Nothing to show — you\'ve conquered them all.</p>';
}


// ─── Local Storage ──────────────────────────────────────────────────────────

function saveProgress() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save progress:', e);
  }
}

function loadProgress() {
  try {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
    }
  } catch (e) {
    console.warn('Could not load progress:', e);
  }
}


// ─── Utilities ──────────────────────────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


// ─── Skill Tree & Question Selector ───────────────────────────────────────

function showTreeModal() {
  selectedTreeLevel = state.currentLevel || 1;
  document.getElementById('tree-overlay').classList.add('visible');
  renderSkillTree();
  renderTopicDetail(selectedTreeLevel);
  // Delay SVG line drawing until modal layout settles
  setTimeout(drawTreeConnectors, 50);
}

function hideTreeModal() {
  document.getElementById('tree-overlay').classList.remove('visible');
}

function renderSkillTree() {
  const container = document.getElementById('tree-nodes-layout');
  if (!container) return;

  // Tiers layout structure matching Skill Tree DAG
  const tiers = [
    [1],
    [2],
    [3, 4],
    [5, 6],
    [7]
  ];

  let html = '';
  for (const row of tiers) {
    html += `<div class="tree-node-row">`;
    for (const lvl of row) {
      const total = QUESTIONS.filter(q => q.level === lvl).length;
      const solved = QUESTIONS.filter(q => q.level === lvl && state.solvedQuestions.includes(q.id)).length;
      const pct = Math.round((solved / total) * 100);
      const isCompleted = solved === total && total > 0;
      const isSelected = lvl === selectedTreeLevel;

      let cls = 'tree-node';
      if (isCompleted) cls += ' completed';
      if (isSelected) cls += ' selected';

      html += `
        <div class="${cls}" data-level="${lvl}" onclick="selectTreeLevel(${lvl})">
          <div class="node-level-tag">
            <span>LVL ${lvl}</span>
            <span>${solved}/${total}</span>
          </div>
          <div class="node-title">${LEVEL_NAMES[lvl]}</div>
          <div class="node-progress-bar">
            <div class="node-progress-fill" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    }
    html += `</div>`;
  }

  container.innerHTML = html;
}

function drawTreeConnectors() {
  const svg = document.getElementById('tree-svg-connectors');
  const canvas = document.getElementById('tree-graph-canvas');
  if (!svg || !canvas) return;

  const canvasRect = canvas.getBoundingClientRect();
  svg.setAttribute('width', canvas.clientWidth);
  svg.setAttribute('height', canvas.scrollHeight);

  // Connection dependencies: [fromLevel, toLevel]
  const connections = [
    [1, 2],
    [2, 3],
    [2, 4],
    [3, 5],
    [4, 5],
    [4, 6],
    [5, 7],
    [6, 7]
  ];

  let svgHtml = '';
  for (const [fromLvl, toLvl] of connections) {
    const fromEl = canvas.querySelector(`.tree-node[data-level="${fromLvl}"]`);
    const toEl = canvas.querySelector(`.tree-node[data-level="${toLvl}"]`);

    if (!fromEl || !toEl) continue;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    const x1 = fromRect.left + fromRect.width / 2 - canvasRect.left + canvas.scrollLeft;
    const y1 = fromRect.bottom - canvasRect.top + canvas.scrollTop;
    const x2 = toRect.left + toRect.width / 2 - canvasRect.left + canvas.scrollLeft;
    const y2 = toRect.top - canvasRect.top + canvas.scrollTop;

    // Smooth bezier curve
    const controlY1 = y1 + (y2 - y1) * 0.5;
    const controlY2 = y2 - (y2 - y1) * 0.5;
    const pathData = `M ${x1} ${y1} C ${x1} ${controlY1}, ${x2} ${controlY2}, ${x2} ${y2}`;

    const fromSolved = QUESTIONS.filter(q => q.level === fromLvl && state.solvedQuestions.includes(q.id)).length;
    const fromTotal = QUESTIONS.filter(q => q.level === fromLvl).length;

    let pathCls = 'tree-path-line';
    if (fromSolved === fromTotal && fromTotal > 0) pathCls += ' completed';
    else if (fromSolved > 0) pathCls += ' active';

    svgHtml += `<path d="${pathData}" class="${pathCls}" />`;
  }

  svg.innerHTML = svgHtml;
}

function selectTreeLevel(lvl) {
  selectedTreeLevel = lvl;
  renderSkillTree();
  renderTopicDetail(lvl);
  setTimeout(drawTreeConnectors, 20);
}

function renderTopicDetail(lvl) {
  const container = document.getElementById('topic-detail-wrapper');
  if (!container) return;

  let questions = QUESTIONS.filter(q => q.level === lvl);

  // Apply filters
  if (treeFilter === 'starred') {
    questions = questions.filter(q => state.starredQuestions && state.starredQuestions.includes(q.id));
  } else if (treeFilter === 'unsolved') {
    questions = questions.filter(q => !state.solvedQuestions.includes(q.id));
  }

  const totalAtLevel = QUESTIONS.filter(q => q.level === lvl).length;
  const solvedAtLevel = QUESTIONS.filter(q => q.level === lvl && state.solvedQuestions.includes(q.id)).length;
  const isAllComplete = solvedAtLevel === totalAtLevel && totalAtLevel > 0;

  const prereqsMap = {
    1: 'None (Getting Started)',
    2: 'Level 1: Basic SELECT',
    3: 'Level 2: Filtering & Sorting',
    4: 'Level 2: Filtering & Sorting',
    5: 'Level 3: Table Joins & Level 4: Aggregations',
    6: 'Level 4: Aggregations & Grouping',
    7: 'Level 5: Subqueries & Level 6: Window Functions'
  };

  let html = `
    <div class="topic-detail-header">
      <div class="topic-info-main">
        <div class="topic-title-lg">Level ${lvl}: ${LEVEL_NAMES[lvl]}</div>
        <div class="topic-subtitle">${QUESTIONS.filter(q => q.level === lvl).length} practice problems</div>
      </div>
      <div class="topic-completion-badge ${isAllComplete ? 'complete' : ''}">
        ${solvedAtLevel} / ${totalAtLevel}
      </div>
    </div>
    <div class="topic-prereqs">
      <span>Prerequisites:</span>
      <span style="color: var(--text-primary); font-weight: 500">${prereqsMap[lvl]}</span>
    </div>
    <div class="problem-list-container">
  `;

  if (questions.length === 0) {
    html += `
      <div style="text-align:center; padding: 40px; color: var(--text-muted); font-family: var(--font-mono)">
        No questions match the current filter.
      </div>
    `;
  } else {
    html += `
      <table class="problem-table">
        <thead>
          <tr>
            <th style="width: 50px">Status</th>
            <th style="width: 45px">Star</th>
            <th>Problem</th>
            <th style="width: 90px">Difficulty</th>
            <th style="width: 80px">Action</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const q of questions) {
      const isSolved = state.solvedQuestions.includes(q.id);
      const isAttempted = state.attemptsPerQuestion[q.id] > 0 && !isSolved;
      const isStarred = state.starredQuestions && state.starredQuestions.includes(q.id);

      let diffCls = 'easy';
      if (q.level >= 3 && q.level <= 5) diffCls = 'medium';
      if (q.level >= 6) diffCls = 'hard';

      let statusHtml = '<span class="status-icon unsolved" title="Unattempted">○</span>';
      if (isSolved) {
        statusHtml = '<span class="status-icon solved" title="Solved">✓</span>';
      } else if (isAttempted) {
        statusHtml = '<span class="status-icon attempted" title="Attempted">⏳</span>';
      }

      html += `
        <tr class="problem-row ${isSolved ? 'solved' : ''}">
          <td style="text-align:center">${statusHtml}</td>
          <td style="text-align:center">
            <button class="star-btn ${isStarred ? 'active' : ''}" onclick="toggleStarQuestion(${q.id}, event)" title="${isStarred ? 'Unstar' : 'Star'}">
              ${isStarred ? '★' : '☆'}
            </button>
          </td>
          <td class="problem-title-cell" onclick="jumpToQuestion(${q.id})">
            Q${q.id}. ${escapeHtml(q.title)}
          </td>
          <td>
            <span class="difficulty-badge ${diffCls}">${diffCls}</span>
          </td>
          <td>
            <button class="btn btn-secondary btn-solve" onclick="jumpToQuestion(${q.id})">
              ${isSolved ? 'Review' : 'Solve'}
            </button>
          </td>
        </tr>
      `;
    }

    html += `
        </tbody>
      </table>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;
}

function toggleStarQuestion(questionId, event) {
  if (event) event.stopPropagation();
  if (!state.starredQuestions) state.starredQuestions = [];

  const idx = state.starredQuestions.indexOf(questionId);
  if (idx >= 0) {
    state.starredQuestions.splice(idx, 1);
  } else {
    state.starredQuestions.push(questionId);
  }

  saveProgress();
  renderTopicDetail(selectedTreeLevel);
}

function jumpToQuestion(questionId) {
  const q = QUESTIONS.find(x => x.id === questionId);
  if (!q) return;

  state.currentLevel = q.level;
  saveProgress();

  loadQuestion(questionId);
  hideTreeModal();
  showToast(`Loaded Q${q.id}: ${q.title}`);
}
