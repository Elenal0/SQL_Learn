/**
 * SQL Forge — Question Bank
 * ═══════════════════════════
 *
 * Structure:
 *   SCHEMAS      – Shared database schemas (CREATE + INSERT SQL for sql.js)
 *   LEVEL_NAMES  – Human-readable level labels
 *   QUESTIONS    – Array of question objects
 *
 * Each question:
 *   id            – Unique identifier
 *   level         – Difficulty level (1–7)
 *   title         – Short display title
 *   prompt        – Full task description
 *   hint          – A nudge without giving away the answer
 *   schema        – Key into SCHEMAS object
 *   expectedQuery – Reference SQL solution (run against same data for comparison)
 *   orderMatters  – If true, row order must match expected result
 *
 * To add questions: append to the QUESTIONS array following this format.
 * Schemas are SQLite-flavored (sql.js runs SQLite compiled to WASM).
 */

// ─── Shared Database Schemas ────────────────────────────────────────────────

const SCHEMAS = {

  // ── HR Database ──────────────────────────────────────────────────────────
  hr: `
    CREATE TABLE departments (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    );
    INSERT INTO departments VALUES
      (1, 'Engineering'),
      (2, 'Marketing'),
      (3, 'Sales'),
      (4, 'HR'),
      (5, 'Finance'),
      (6, 'Legal');

    CREATE TABLE employees (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      salary INTEGER NOT NULL,
      department_id INTEGER,
      manager_id INTEGER,
      hire_date TEXT,
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (manager_id) REFERENCES employees(id)
    );
    INSERT INTO employees VALUES
      (1,  'Alice Johnson',   95000, 1, NULL, '2020-01-15'),
      (2,  'Bob Smith',       82000, 1, 1,    '2020-03-22'),
      (3,  'Carol Williams',  78000, 2, NULL, '2019-06-10'),
      (4,  'David Brown',     91000, 1, 1,    '2021-02-01'),
      (5,  'Eve Davis',       67000, 3, NULL, '2018-11-30'),
      (6,  'Frank Miller',    73000, 2, 3,    '2020-08-15'),
      (7,  'Grace Wilson',    88000, 3, 5,    '2019-04-20'),
      (8,  'Henry Taylor',    95000, 1, 1,    '2021-07-01'),
      (9,  'Ivy Anderson',    62000, 4, NULL, '2022-01-10'),
      (10, 'Jack Thomas',     85000, 5, NULL, '2019-09-25'),
      (11, 'Karen Martinez',  71000, 3, 5,    '2020-12-05'),
      (12, 'Leo Garcia',      79000, 2, 3,    '2021-05-18');
  `,

  // ── E-Commerce Database ──────────────────────────────────────────────────
  ecommerce: `
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      city TEXT,
      signup_date TEXT
    );
    INSERT INTO customers VALUES
      (1, 'Emma Clark',    'emma@email.com',   'New York',    '2022-01-10'),
      (2, 'Liam Scott',    'liam@email.com',   'Los Angeles', '2022-03-15'),
      (3, 'Olivia Reed',   'olivia@email.com', 'Chicago',     '2022-02-20'),
      (4, 'Noah Hill',     'noah@email.com',   'New York',    '2022-05-01'),
      (5, 'Ava King',      'ava@email.com',    'Los Angeles', '2022-04-12'),
      (6, 'Mason Wright',  'mason@email.com',  'Chicago',     '2022-06-30'),
      (7, 'Sophie Turner', 'sophie@email.com', 'Miami',       '2022-08-15'),
      (8, 'Ryan Cooper',   'ryan@email.com',   'Boston',      '2022-09-01');

    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT,
      price REAL
    );
    INSERT INTO products VALUES
      (1, 'Laptop',        'Electronics',  999.99),
      (2, 'Headphones',    'Electronics',  149.99),
      (3, 'Running Shoes', 'Sportswear',   89.99),
      (4, 'Coffee Maker',  'Appliances',   79.99),
      (5, 'Backpack',      'Accessories',  49.99),
      (6, 'Smartphone',    'Electronics',  799.99),
      (7, 'Yoga Mat',      'Sportswear',   29.99),
      (8, 'Desk Lamp',     'Appliances',   39.99);

    CREATE TABLE orders (
      id INTEGER PRIMARY KEY,
      customer_id INTEGER,
      order_date TEXT,
      total_amount REAL,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    INSERT INTO orders VALUES
      (1,  1, '2023-01-15', 1149.98),
      (2,  2, '2023-01-20', 89.99),
      (3,  1, '2023-02-10', 79.99),
      (4,  3, '2023-02-14', 239.98),
      (5,  4, '2023-03-01', 999.99),
      (6,  2, '2023-03-15', 849.98),
      (7,  5, '2023-04-02', 119.98),
      (8,  1, '2023-04-20', 29.99),
      (9,  3, '2023-05-05', 129.98),
      (10, 6, '2023-05-20', 1049.98);

    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY,
      order_id INTEGER,
      product_id INTEGER,
      quantity INTEGER,
      price REAL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    INSERT INTO order_items VALUES
      (1,  1,  1, 1, 999.99),
      (2,  1,  2, 1, 149.99),
      (3,  2,  3, 1, 89.99),
      (4,  3,  4, 1, 79.99),
      (5,  4,  2, 1, 149.99),
      (6,  4,  3, 1, 89.99),
      (7,  5,  1, 1, 999.99),
      (8,  6,  6, 1, 799.99),
      (9,  6,  5, 1, 49.99),
      (10, 7,  3, 1, 89.99),
      (11, 7,  7, 1, 29.99),
      (12, 8,  7, 1, 29.99),
      (13, 9,  4, 1, 79.99),
      (14, 9,  5, 1, 49.99),
      (15, 10, 1, 1, 999.99),
      (16, 10, 5, 1, 49.99);
  `,

  // ── Standalone (no tables needed) ────────────────────────────────────────
  standalone: ''
};


// ─── Level Names ────────────────────────────────────────────────────────────

const LEVEL_NAMES = {
  1: 'Basic SELECT',
  2: 'Filtering & Sorting',
  3: 'JOINs',
  4: 'Aggregations',
  5: 'Subqueries',
  6: 'Window Functions',
  7: 'CTEs & Advanced'
};

const TOTAL_LEVELS = 7;


// ─── Question Bank ──────────────────────────────────────────────────────────

const QUESTIONS = [

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL 1 — Basic SELECT
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 1,
    level: 1,
    title: 'Select All Employees',
    prompt: 'Write a query to retrieve all columns and all rows from the <code>employees</code> table.',
    hint: 'The simplest SELECT uses <code>*</code> to get every column.',
    schema: 'hr',
    expectedQuery: 'SELECT * FROM employees',
    orderMatters: false
  },
  {
    id: 2,
    level: 1,
    title: 'Pick Specific Columns',
    prompt: 'Retrieve only the <code>name</code> and <code>salary</code> of all employees.',
    hint: 'List the column names you want right after SELECT, separated by commas.',
    schema: 'hr',
    expectedQuery: 'SELECT name, salary FROM employees',
    orderMatters: false
  },
  {
    id: 3,
    level: 1,
    title: 'Column Aliases',
    prompt: 'Show each employee\'s name as <code>employee_name</code> and salary as <code>annual_salary</code>.',
    hint: 'Use the <code>AS</code> keyword to rename columns in the output.',
    schema: 'hr',
    expectedQuery: 'SELECT name AS employee_name, salary AS annual_salary FROM employees',
    orderMatters: false
  },
  {
    id: 4,
    level: 1,
    title: 'Distinct Values',
    prompt: 'Find all unique <code>department_id</code> values present in the employees table.',
    hint: 'The <code>DISTINCT</code> keyword eliminates duplicate values from the result.',
    schema: 'hr',
    expectedQuery: 'SELECT DISTINCT department_id FROM employees',
    orderMatters: false
  },
  {
    id: 5,
    level: 1,
    title: 'Count Rows',
    prompt: 'Count the total number of employees. Name the result column <code>total_employees</code>.',
    hint: '<code>COUNT(*)</code> counts every row in the table.',
    schema: 'hr',
    expectedQuery: 'SELECT COUNT(*) AS total_employees FROM employees',
    orderMatters: false
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL 2 — Filtering & Sorting
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 6,
    level: 2,
    title: 'Simple WHERE',
    prompt: 'Find all employees who earn more than $80,000. Show all columns.',
    hint: 'Use <code>WHERE salary > 80000</code> to filter rows.',
    schema: 'hr',
    expectedQuery: 'SELECT * FROM employees WHERE salary > 80000',
    orderMatters: false
  },
  {
    id: 7,
    level: 2,
    title: 'Multiple Conditions',
    prompt: 'Find employees in the Engineering department (<code>department_id = 1</code>) who were hired after <code>\'2020-06-01\'</code>. Show all columns.',
    hint: 'Combine conditions with <code>AND</code>. Dates compare as strings in YYYY-MM-DD format.',
    schema: 'hr',
    expectedQuery: "SELECT * FROM employees WHERE department_id = 1 AND hire_date > '2020-06-01'",
    orderMatters: false
  },
  {
    id: 8,
    level: 2,
    title: 'Pattern Matching',
    prompt: 'Find all employees whose name contains <code>son</code>. Show their name and salary.',
    hint: 'Use <code>LIKE \'%son%\'</code> — the <code>%</code> wildcard matches any sequence of characters.',
    schema: 'hr',
    expectedQuery: "SELECT name, salary FROM employees WHERE name LIKE '%son%'",
    orderMatters: false
  },
  {
    id: 9,
    level: 2,
    title: 'Top-N with ORDER BY',
    prompt: 'Find the 3 highest-paid employees. Show their name and salary, ordered by salary descending, then by name ascending.',
    hint: 'Use <code>ORDER BY ... DESC</code> to sort, and <code>LIMIT</code> to cap the number of rows.',
    schema: 'hr',
    expectedQuery: 'SELECT name, salary FROM employees ORDER BY salary DESC, name ASC LIMIT 3',
    orderMatters: true
  },
  {
    id: 10,
    level: 2,
    title: 'BETWEEN and IN',
    prompt: 'Find employees whose salary is between $70,000 and $85,000 (inclusive) and who work in departments 1, 2, or 3. Show <code>name</code>, <code>salary</code>, and <code>department_id</code>.',
    hint: '<code>BETWEEN a AND b</code> is inclusive on both ends. <code>IN (1,2,3)</code> checks membership.',
    schema: 'hr',
    expectedQuery: 'SELECT name, salary, department_id FROM employees WHERE salary BETWEEN 70000 AND 85000 AND department_id IN (1, 2, 3)',
    orderMatters: false
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL 3 — JOINs
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 11,
    level: 3,
    title: 'INNER JOIN',
    prompt: 'List each employee\'s name alongside their department name. Name the columns <code>employee</code> and <code>department</code>.',
    hint: 'JOIN the <code>employees</code> table with <code>departments</code> using the <code>department_id</code> foreign key.',
    schema: 'hr',
    expectedQuery: 'SELECT e.name AS employee, d.name AS department FROM employees e JOIN departments d ON e.department_id = d.id',
    orderMatters: false
  },
  {
    id: 12,
    level: 3,
    title: 'LEFT JOIN',
    prompt: 'Show all departments and any employees in them. Include departments that have <b>no employees</b>. Show <code>department</code> and <code>employee</code> columns.',
    hint: '<code>LEFT JOIN</code> keeps every row from the left table even if there\'s no match on the right.',
    schema: 'hr',
    expectedQuery: 'SELECT d.name AS department, e.name AS employee FROM departments d LEFT JOIN employees e ON d.id = e.department_id',
    orderMatters: false
  },
  {
    id: 13,
    level: 3,
    title: 'Self JOIN',
    prompt: 'List each employee with their manager\'s name. Only include employees who <b>have</b> a manager. Show columns <code>employee</code> and <code>manager</code>.',
    hint: 'Join <code>employees</code> to itself: one alias for the employee, another for the manager. Match on <code>manager_id</code>.',
    schema: 'hr',
    expectedQuery: 'SELECT e.name AS employee, m.name AS manager FROM employees e JOIN employees m ON e.manager_id = m.id',
    orderMatters: false
  },
  {
    id: 14,
    level: 3,
    title: 'JOIN with Filter',
    prompt: 'List all orders placed after <code>\'2023-03-01\'</code>. Show <code>customer</code> name, <code>order_date</code>, and <code>total_amount</code>. Order by <code>order_date</code>.',
    hint: 'JOIN <code>orders</code> with <code>customers</code>, then use WHERE to filter on date.',
    schema: 'ecommerce',
    expectedQuery: "SELECT c.name AS customer, o.order_date, o.total_amount FROM orders o JOIN customers c ON o.customer_id = c.id WHERE o.order_date > '2023-03-01' ORDER BY o.order_date",
    orderMatters: true
  },
  {
    id: 15,
    level: 3,
    title: 'Multi-Table JOIN',
    prompt: 'For each order, show the <code>order_id</code>, <code>customer</code> name, and <code>product</code> name of every item ordered.',
    hint: 'You need to chain JOINs: orders → customers AND orders → order_items → products.',
    schema: 'ecommerce',
    expectedQuery: 'SELECT o.id AS order_id, c.name AS customer, p.name AS product FROM orders o JOIN customers c ON o.customer_id = c.id JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id',
    orderMatters: false
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL 4 — Aggregations (GROUP BY / HAVING)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 16,
    level: 4,
    title: 'Basic GROUP BY',
    prompt: 'Count the number of employees in each department. Show <code>department_id</code> and <code>employee_count</code>. Order by <code>department_id</code>.',
    hint: '<code>GROUP BY</code> groups rows sharing a value; use <code>COUNT(*)</code> to count each group.',
    schema: 'hr',
    expectedQuery: 'SELECT department_id, COUNT(*) AS employee_count FROM employees GROUP BY department_id ORDER BY department_id',
    orderMatters: true
  },
  {
    id: 17,
    level: 4,
    title: 'Average per Group',
    prompt: 'Find the average salary for each department. Show <code>department_id</code> and <code>average_salary</code> rounded to 2 decimal places. Order by average_salary descending.',
    hint: 'Use <code>AVG()</code> for averages and <code>ROUND(value, 2)</code> for rounding.',
    schema: 'hr',
    expectedQuery: 'SELECT department_id, ROUND(AVG(salary), 2) AS average_salary FROM employees GROUP BY department_id ORDER BY average_salary DESC',
    orderMatters: true
  },
  {
    id: 18,
    level: 4,
    title: 'HAVING Clause',
    prompt: 'Find departments with more than 2 employees. Show <code>department_id</code> and <code>employee_count</code>.',
    hint: '<code>HAVING</code> filters <em>after</em> grouping (unlike WHERE, which filters before).',
    schema: 'hr',
    expectedQuery: 'SELECT department_id, COUNT(*) AS employee_count FROM employees GROUP BY department_id HAVING COUNT(*) > 2',
    orderMatters: false
  },
  {
    id: 19,
    level: 4,
    title: 'JOIN + GROUP BY + HAVING',
    prompt: 'Show each department name and its average salary, but only for departments where the average exceeds $75,000. Round to 2 decimal places. Columns: <code>department</code>, <code>avg_salary</code>.',
    hint: 'JOIN employees with departments, GROUP BY department name, then HAVING on the aggregate.',
    schema: 'hr',
    expectedQuery: 'SELECT d.name AS department, ROUND(AVG(e.salary), 2) AS avg_salary FROM employees e JOIN departments d ON e.department_id = d.id GROUP BY d.name HAVING AVG(e.salary) > 75000',
    orderMatters: false
  },
  {
    id: 20,
    level: 4,
    title: 'City-Level Aggregation',
    prompt: 'For each customer city, find the total number of orders and total amount spent. Columns: <code>city</code>, <code>total_orders</code>, <code>total_spent</code> (rounded to 2 places). Order by <code>total_spent</code> descending.',
    hint: 'JOIN customers with orders, GROUP BY city, use COUNT and SUM.',
    schema: 'ecommerce',
    expectedQuery: 'SELECT c.city, COUNT(o.id) AS total_orders, ROUND(SUM(o.total_amount), 2) AS total_spent FROM customers c JOIN orders o ON c.id = o.customer_id GROUP BY c.city ORDER BY total_spent DESC',
    orderMatters: true
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL 5 — Subqueries
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 21,
    level: 5,
    title: 'Above-Average Salary',
    prompt: 'Find all employees who earn more than the company-wide average salary. Show <code>name</code> and <code>salary</code>, ordered by salary descending.',
    hint: 'Use a subquery <code>(SELECT AVG(salary) FROM employees)</code> inside your WHERE clause.',
    schema: 'hr',
    expectedQuery: 'SELECT name, salary FROM employees WHERE salary > (SELECT AVG(salary) FROM employees) ORDER BY salary DESC',
    orderMatters: true
  },
  {
    id: 22,
    level: 5,
    title: 'Department Max Earners',
    prompt: 'Find employees who earn the <b>highest salary in their department</b>. Show <code>name</code>, <code>salary</code>, and <code>department_id</code>.',
    hint: 'A correlated subquery lets you compare each row to an aggregate of its own group: <code>WHERE salary = (SELECT MAX(salary) FROM employees e2 WHERE e2.department_id = e.department_id)</code>.',
    schema: 'hr',
    expectedQuery: 'SELECT name, salary, department_id FROM employees e WHERE salary = (SELECT MAX(salary) FROM employees e2 WHERE e2.department_id = e.department_id)',
    orderMatters: false
  },
  {
    id: 23,
    level: 5,
    title: 'Customers Without Orders',
    prompt: 'Find customers who have <b>never placed an order</b>. Show their <code>name</code> and <code>email</code>.',
    hint: 'Use <code>NOT IN</code> with a subquery that lists all customer_ids from the orders table.',
    schema: 'ecommerce',
    expectedQuery: 'SELECT name, email FROM customers WHERE id NOT IN (SELECT customer_id FROM orders)',
    orderMatters: false
  },
  {
    id: 24,
    level: 5,
    title: 'Highest Total Salary Dept',
    prompt: 'Find the department with the highest total salary expenditure. Show <code>department_id</code> and <code>total_salary</code>.',
    hint: 'Build a derived table (subquery in FROM) that sums salary per department, then pick the top one.',
    schema: 'hr',
    expectedQuery: 'SELECT department_id, total_salary FROM (SELECT department_id, SUM(salary) AS total_salary FROM employees GROUP BY department_id) sub ORDER BY total_salary DESC LIMIT 1',
    orderMatters: true
  },
  {
    id: 25,
    level: 5,
    title: 'Products Ever Ordered',
    prompt: 'Find all products that have been ordered at least once. Show just the product <code>name</code>, ordered alphabetically.',
    hint: 'Use <code>EXISTS</code> with a subquery that checks for matching rows in <code>order_items</code>.',
    schema: 'ecommerce',
    expectedQuery: 'SELECT p.name FROM products p WHERE EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id) ORDER BY p.name',
    orderMatters: true
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL 6 — Window Functions
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 26,
    level: 6,
    title: 'ROW_NUMBER per Department',
    prompt: 'Assign a row number to each employee within their department, ordered by salary descending then name ascending. Show <code>name</code>, <code>department_id</code>, <code>salary</code>, and <code>row_num</code>.',
    hint: 'Use <code>ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC, name ASC)</code>.',
    schema: 'hr',
    expectedQuery: 'SELECT name, department_id, salary, ROW_NUMBER() OVER (PARTITION BY department_id ORDER BY salary DESC, name ASC) AS row_num FROM employees',
    orderMatters: false
  },
  {
    id: 27,
    level: 6,
    title: 'DENSE_RANK Salaries',
    prompt: 'Rank all employees by salary (highest first) using <code>DENSE_RANK</code>. Tied salaries should share the same rank. Show <code>name</code>, <code>salary</code>, and <code>salary_rank</code>.',
    hint: '<code>DENSE_RANK()</code> is like RANK() but never skips rank numbers after ties.',
    schema: 'hr',
    expectedQuery: 'SELECT name, salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS salary_rank FROM employees',
    orderMatters: false
  },
  {
    id: 28,
    level: 6,
    title: 'Running Total',
    prompt: 'Calculate a running total of order amounts ordered by date. Show <code>order_id</code>, <code>order_date</code>, <code>total_amount</code>, and <code>running_total</code> (rounded to 2 places).',
    hint: 'Use <code>SUM(total_amount) OVER (ORDER BY order_date, id)</code> for a cumulative sum.',
    schema: 'ecommerce',
    expectedQuery: 'SELECT id AS order_id, order_date, total_amount, ROUND(SUM(total_amount) OVER (ORDER BY order_date, id), 2) AS running_total FROM orders',
    orderMatters: true
  },
  {
    id: 29,
    level: 6,
    title: 'Previous Order (LAG)',
    prompt: 'For each order, show <code>order_id</code>, <code>order_date</code>, <code>total_amount</code>, and the previous order\'s amount (by date) as <code>prev_amount</code>.',
    hint: '<code>LAG(column) OVER (ORDER BY ...)</code> accesses the value from the preceding row.',
    schema: 'ecommerce',
    expectedQuery: 'SELECT id AS order_id, order_date, total_amount, LAG(total_amount) OVER (ORDER BY order_date, id) AS prev_amount FROM orders',
    orderMatters: true
  },
  {
    id: 30,
    level: 6,
    title: '2nd-Highest Salary per Dept',
    prompt: 'Find the second-highest salary in each department. Show <code>department_id</code> and <code>second_highest_salary</code>. Exclude departments with fewer than 2 employees.',
    hint: 'Use <code>DENSE_RANK()</code> partitioned by department, ordered by salary descending, then filter for rank = 2.',
    schema: 'hr',
    expectedQuery: 'SELECT department_id, salary AS second_highest_salary FROM (SELECT department_id, salary, DENSE_RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rnk FROM employees) ranked WHERE rnk = 2',
    orderMatters: false
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEVEL 7 — CTEs & Advanced
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 31,
    level: 7,
    title: 'CTE — Above-Average Depts',
    prompt: 'Using a CTE, find departments where the average salary exceeds the company-wide average. Show <code>department_id</code> and <code>avg_salary</code> (rounded to 2 places).',
    hint: 'Define a CTE with <code>WITH dept_avg AS (...)</code>, then filter against <code>(SELECT AVG(salary) FROM employees)</code>.',
    schema: 'hr',
    expectedQuery: 'WITH dept_avg AS (SELECT department_id, ROUND(AVG(salary), 2) AS avg_salary FROM employees GROUP BY department_id) SELECT department_id, avg_salary FROM dept_avg WHERE avg_salary > (SELECT AVG(salary) FROM employees)',
    orderMatters: false
  },
  {
    id: 32,
    level: 7,
    title: 'Multiple CTEs — Big Spenders',
    prompt: 'Using CTEs, find customers whose total spending exceeds the average customer total. Show <code>name</code> and <code>total_spent</code> (rounded to 2 places), ordered by <code>total_spent</code> descending.',
    hint: 'Define one CTE for customer totals, another for the average spending, then filter.',
    schema: 'ecommerce',
    expectedQuery: `WITH customer_totals AS (
  SELECT customer_id, ROUND(SUM(total_amount), 2) AS total_spent
  FROM orders GROUP BY customer_id
),
avg_spending AS (
  SELECT AVG(total_spent) AS avg_spent FROM customer_totals
)
SELECT c.name, ct.total_spent
FROM customer_totals ct
JOIN customers c ON ct.customer_id = c.id
WHERE ct.total_spent > (SELECT avg_spent FROM avg_spending)
ORDER BY ct.total_spent DESC`,
    orderMatters: true
  },
  {
    id: 33,
    level: 7,
    title: 'Recursive CTE — Number Series',
    prompt: 'Generate a sequence of numbers from 1 to 10 using a recursive CTE. Return a single column named <code>n</code>.',
    hint: 'Start with <code>SELECT 1</code> as the base case, then <code>UNION ALL SELECT n+1 ... WHERE n < 10</code>.',
    schema: 'standalone',
    expectedQuery: 'WITH RECURSIVE nums(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM nums WHERE n < 10) SELECT n FROM nums',
    orderMatters: true
  },
  {
    id: 34,
    level: 7,
    title: 'Category Revenue Report',
    prompt: 'For each product category, show <code>category</code>, <code>total_qty</code> sold, and <code>total_revenue</code> (rounded to 2 places). Order by <code>total_revenue</code> descending.',
    hint: 'JOIN <code>order_items</code> with <code>products</code>, GROUP BY category, use SUM.',
    schema: 'ecommerce',
    expectedQuery: 'SELECT p.category, SUM(oi.quantity) AS total_qty, ROUND(SUM(oi.quantity * oi.price), 2) AS total_revenue FROM order_items oi JOIN products p ON oi.product_id = p.id GROUP BY p.category ORDER BY total_revenue DESC',
    orderMatters: true
  },
  {
    id: 35,
    level: 7,
    title: 'Double-Average Filter',
    prompt: 'Find employees who earn above <b>both</b> their department\'s average salary AND the company-wide average. Show <code>name</code>, <code>salary</code>, <code>department_id</code>, <code>dept_avg</code>, and <code>company_avg</code> (both rounded to 2 places).',
    hint: 'Use two CTEs: one for per-department averages, one for the company average. Then JOIN and filter.',
    schema: 'hr',
    expectedQuery: `WITH dept_avg AS (
  SELECT department_id, ROUND(AVG(salary), 2) AS avg_sal FROM employees GROUP BY department_id
),
company_avg AS (
  SELECT ROUND(AVG(salary), 2) AS avg_sal FROM employees
)
SELECT e.name, e.salary, e.department_id,
  da.avg_sal AS dept_avg,
  ca.avg_sal AS company_avg
FROM employees e
JOIN dept_avg da ON e.department_id = da.department_id
CROSS JOIN company_avg ca
WHERE e.salary > da.avg_sal AND e.salary > ca.avg_sal`,
    orderMatters: false
  }
];
