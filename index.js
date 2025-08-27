const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database('./database.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY,
    name TEXT,
    aptitude INTEGER,
    coding INTEGER,
    resume INTEGER,
    interview INTEGER
  )`);

  // Insert sample data if the table is empty
  db.get('SELECT COUNT(*) as count FROM students', (err, row) => {
    if (err) {
      console.error('Failed to check students table:', err);
    } else {
        console.log("Connected to the SQLite database.");
    }
  });
});

// Routes
app.get('/student/:name', (req, res) => {
  const { name } = req.params;
  db.get('SELECT * FROM students WHERE name = ?', [name], (err, row) => {
    if (err) {
      res.status(500).json({ error: 'Failed to fetch student data' });
    } else if (!row) {
      res.status(404).json({ error: 'Student not found' });
    } else {
      res.json(row);
    }
  });
});

// Update the /readiness endpoint to handle name-based data storage
app.post('/readiness', (req, res) => {
  const { name, aptitude, coding, resume, interview } = req.body;

  if (!name || aptitude == null || coding == null || resume == null || interview == null) {
    return res.status(400).json({ error: 'Missing name or scores in request body' });
  }

  db.get('SELECT * FROM students WHERE name = ?', [name], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (row) {
      // Update existing student scores
      db.run(
        'UPDATE students SET aptitude = ?, coding = ?, resume = ?, interview = ? WHERE name = ?',
        [aptitude, coding, resume, interview, name],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to update scores' });
          }

          const readinessScore = Math.round(
            aptitude * 0.3 + coding * 0.4 + resume * 0.2 + interview * 0.1
          );

          res.json({ message: 'Scores updated', readinessScore });
        }
      );
    } else {
      // Student not found
      res.status(404).json({ error: 'Student not found' });
    }
  });
});

app.post('/improvement-plan', (req, res) => {
  const { aptitude, coding, resume, interview } = req.body;
  if (aptitude == null || coding == null || resume == null || interview == null) {
    return res.status(400).json({ error: 'Missing scores in request body' });
  }

  const plan = [];
  if (aptitude < 75) {
    plan.push({ title: 'Improve Aptitude', description: 'Practice speed math and logical reasoning.', priority: 'high' });
  }
  if (coding < 75) {
    plan.push({ title: 'Enhance Coding Skills', description: 'Solve more coding problems and participate in contests.', priority: 'high' });
  }
  if (resume < 75) {
    plan.push({ title: 'Strengthen Resume', description: 'Add impactful projects and achievements.', priority: 'medium' });
  }
  if (interview < 75) {
    plan.push({ title: 'Practice Interviewing', description: 'Conduct mock interviews and get feedback.', priority: 'medium' });
  }

  res.json({ improvementPlan: plan });
});

// Add a route to handle student name submission
app.post('/student', (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Student name is required' });
  }

  db.get('SELECT * FROM students WHERE name = ?', [name], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (row) {
      // Student already exists
      return res.json({ message: 'Student exists', student: row });
    } else {
      // Insert new student
      db.run('INSERT INTO students (name, aptitude, coding, resume, interview) VALUES (?, 0, 0, 0, 0)', [name], function (err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to add student' });
        }

        res.json({ message: 'Student added', student: { id: this.lastID, name, aptitude: 0, coding: 0, resume: 0, interview: 0 } });
      });
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});