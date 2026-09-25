# ⚡ SQL Forge — Interactive SQL Trainer

> Master SQL from beginner to advanced with real-time, in-browser query execution and instant feedback.

![SQL Forge App](https://img.shields.io/badge/SQL_Forge-v1.0.0-00e5ff?style=for-the-badge&logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

**SQL Forge** is a fully client-side, self-contained interactive web application designed to take you from basic SQL queries to mastering complex analytical window functions and Common Table Expressions (CTEs).

---

## 🌟 Key Features

- 🎯 **35 Guided Practice Questions** across **7 progressive difficulty levels**:
  - **Level 1:** Basic `SELECT` & Column Aliasing
  - **Level 2:** Filtering & Sorting (`WHERE`, `ORDER BY`, `LIMIT`)
  - **Level 3:** Table Joins (`INNER`, `LEFT`, `RIGHT`, `SELF JOIN`)
  - **Level 4:** Aggregations (`GROUP BY`, `HAVING`, `SUM`, `AVG`, `COUNT`)
  - **Level 5:** Subqueries & Set Operations (`IN`, `EXISTS`, Correlated Subqueries)
  - **Level 6:** Window Functions (`ROW_NUMBER`, `RANK`, `DENSE_RANK`, `LAG`, `LEAD`, `NTILE`)
  - **Level 7:** CTEs & Advanced SQL (`WITH` statements & multi-level aggregations)
- ⚡ **In-Browser SQLite WASM Engine**: Powered by `sql.js`, allowing real SQL query execution with **zero backend server required**.
- 📊 **Interactive Schema & Data Viewer**: Inspect table schemas and live sample data formatted into interactive tables.
- 💻 **Syntax-Highlighted Code Editor**: Built with CodeMirror 5 featuring auto-indentation and SQL keyword highlighting.
- ✅ **Smart Comparator & Feedback**: Validates row count, columns, exact cell values (with float tolerance), and order constraints while providing helpful hints on mistakes.
- 💡 **Hint Nudges & Detailed Stats**: Get nudges without spoiling answers, and track accuracy %, total solved, current streak, and level completion.
- 💾 **Local Progress Persistence**: Progress, streak, and solved questions automatically save to browser `localStorage`.
- 🎨 **Dark Terminal Aesthetic**: Modern dark mode UI with glassmorphism cards and neon cyan accents.

---

## 📁 Project Structure

```
sql_prac/
├── index.html       # Main HTML shell, grid layout, CDN links, and modals
├── styles.css       # Terminal aesthetic styles, layout grid, dark theme design system
├── app.js           # Core application logic, sql.js integration, validator, & state
└── questions.js     # Shared database schemas and 35 practice questions array
```

---

## 🚀 Getting Started

Since SQL Forge runs entirely in the browser, no installation or build steps are required!

### Option 1: Open Directly
Simply double-click `index.html` or open it in your browser of choice.

### Option 2: Run via Local Web Server
To serve locally using Python or Node.js:

```bash
# Using Python
python -m http.server 8000

# Or using Node static server
npx serve .
```

Then navigate to `http://localhost:8000` in your web browser.

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, Vanilla CSS3 (Custom Design System), JavaScript (ES6 Modules)
- **SQL Execution:** [sql.js](https://sql.js.org/) (SQLite WebAssembly build)
- **Editor:** [CodeMirror 5](https://codemirror.net/5/)
- **Typography:** Google Fonts (`Inter` & `JetBrains Mono`)

---

## ➕ Adding Custom Questions

You can easily extend the question bank by modifying [`questions.js`](file:///d:/PROJECTS/sql_prac/questions.js):

```javascript
QUESTIONS.push({
  id: 36,
  level: 1,
  title: "Your Question Title",
  prompt: "Write a query to find...",
  hint: "Think about using WHERE...",
  schema: "hr", // 'hr' or 'ecommerce'
  expectedQuery: "SELECT * FROM employees WHERE salary > 80000;",
  orderMatters: false
});
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
