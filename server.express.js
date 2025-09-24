require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const compression = require('compression');
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');
const MongoStore = require('connect-mongo');

const app = express();

// ---- Config ----
const { MONGODB_URI, DB_NAME, SESSION_SECRET, PORT = 3000 } = process.env;

// ---- Mongo connection ----
let db, Users, Todos;
(async () => {
  const client = new MongoClient(MONGODB_URI, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
  });
  await client.connect();

  db = client.db(DB_NAME);
  Users = db.collection('users');
  Todos = db.collection('todos');

  await Users.createIndex({ username: 1 }, { unique: true });
  await Todos.createIndex({ userId: 1 });
  console.log('Mongo connected -> DB:', DB_NAME);
})().catch(err => {
  console.error('Mongo error:', err);
  process.exit(1);
});

// Middleware 
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(session({
  name: 'sid',
  secret: SESSION_SECRET || 'hansaparuly',
  resave: false,
  saveUninitialized: false,
  cookie: { sameSite: 'lax', httpOnly: true, maxAge: 1000 * 60 * 60 * 8 }, // 8h
  store: MongoStore.create({ mongoUrl: MONGODB_URI, dbName: DB_NAME })
}));

// static files from /public
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/');
  next();
}

// login page
app.get('/', (req, res) => {
  if (req.session.userId) return res.redirect('/app');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// main app page 
app.get('/app', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// auth api
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

    const found = await Users.findOne({ username });
    if (!found) {
      const hash = await bcrypt.hash(password, 12);
      const doc = await Users.insertOne({ username, passwordHash: hash, createdAt: new Date() });
      req.session.userId = doc.insertedId.toString();
      req.session.username = username;
      return res.json({ ok: true, created: true, username });
    }

    const ok = await bcrypt.compare(password, found.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid username or password' });

    req.session.userId = found._id.toString();
    req.session.username = found.username;
    res.json({ ok: true, created: false, username: found.username });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Auth error' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// todos api
app.get('/api/todos', requireAuth, async (req, res) => {
  const docs = await Todos.find({ userId: req.session.userId }).sort({ _id: -1 }).toArray();
  res.json(docs);
});

app.post('/api/todos', requireAuth, async (req, res) => {
  const { task = '', priority = 'low', description = '', completed = false } = req.body || {};
  const createdAt = new Date();

  // derived field: dueDate from priority + createdAt
  const days = priority === 'high' ? 1 : (priority === 'medium' ? 3 : 7);
  const dueDate = new Date(createdAt); dueDate.setDate(dueDate.getDate() + days);

  await Todos.insertOne({
    userId: req.session.userId,
    task: String(task).trim(),
    priority: String(priority).toLowerCase(),
    description: String(description),
    completed: Boolean(completed),
    createdAt,
    dueDate
  });

  const docs = await Todos.find({ userId: req.session.userId }).sort({ _id: -1 }).toArray();
  res.status(201).json(docs);
});

app.post('/api/todos/update', requireAuth, async (req, res) => {
  const { id, task, priority, description, completed } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Missing id' });

  const doc = await Todos.findOne({ _id: new ObjectId(id), userId: req.session.userId });
  if (!doc) return res.status(404).json({ error: 'Not found' });

  const update = {};
  if (typeof task === 'string') update.task = task.trim();
  if (typeof description === 'string') update.description = description;
  if (typeof completed === 'boolean') update.completed = completed;

  if (typeof priority === 'string') {
    const p = priority.toLowerCase();
    if (!['low','medium','high'].includes(p)) return res.status(400).json({ error: 'Invalid priority' });
    update.priority = p;

    // recompute derived dueDate from original createdAt + new priority
    const created = new Date(doc.createdAt);
    const days = p === 'high' ? 1 : (p === 'medium' ? 3 : 7);
    const due = new Date(created); due.setDate(due.getDate() + days);
    update.dueDate = due;
  }

  await Todos.updateOne({ _id: doc._id, userId: req.session.userId }, { $set: update });
  const docs = await Todos.find({ userId: req.session.userId }).sort({ _id: -1 }).toArray();
  res.json(docs);
});

app.post('/api/todos/delete', requireAuth, async (req, res) => {
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Missing id' });
  await Todos.deleteOne({ _id: new ObjectId(id), userId: req.session.userId });
  const docs = await Todos.find({ userId: req.session.userId }).sort({ _id: -1 }).toArray();
  res.json(docs);
});

app.listen(PORT, () => console.log(`A3 listening on http://localhost:${PORT}`));
