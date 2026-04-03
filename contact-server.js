const express = require('express');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const app = express();
const PORT = 4370;
const dataDir = path.join(__dirname, 'data');
const contactsPath = path.join(dataDir, 'contacts.json');

app.use(express.json());

function ensureStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(contactsPath)) {
    fs.writeFileSync(contactsPath, '[]\n');
  }
}

function appendContact(contact) {
  ensureStore();
  const existing = JSON.parse(fs.readFileSync(contactsPath, 'utf8'));
  existing.push(contact);
  fs.writeFileSync(contactsPath, JSON.stringify(existing, null, 2) + '\n');
}

app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body || {};

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required' });
  }

  const submission = {
    name: String(name).trim(),
    email: String(email).trim(),
    message: String(message).trim(),
    submittedAt: new Date().toISOString(),
  };

  try {
    appendContact(submission);
  } catch (error) {
    console.error('Failed to save contact', error);
    return res.status(500).json({ error: 'failed to save contact' });
  }

  const body = `Name: ${submission.name}\nEmail: ${submission.email}\nMessage: ${submission.message}`;

  execFile(
    '/opt/openclaw/homebrew/bin/gog',
    [
      'gmail',
      'send',
      '--from',
      'helios@helionforge.com',
      '--to',
      'john@helionforge.com',
      '--subject',
      'New Helion contact',
      '--body',
      body,
    ],
    (error, stdout, stderr) => {
      if (error) {
        console.error('Failed to send notification email', error, stderr);
      } else if (stdout) {
        console.log(stdout.trim());
      }
    }
  );

  return res.json({ ok: true });
});

app.listen(PORT, '127.0.0.1', () => {
  ensureStore();
  console.log(`Helion Forge contact server listening on http://127.0.0.1:${PORT}`);
});
