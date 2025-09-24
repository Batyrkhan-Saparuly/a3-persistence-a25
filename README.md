## A3 — Persistence: To-Do App (Express + MongoDB + Pico.css)

- ### Deployed front end: (GitHub Pages or other)
- ### Local dev: http://localhost:3000/

### Summary

A user-scoped to-do app that supports login, and add / edit / delete items with a derived due date based on priority. Data is persisted in MongoDB; sessions use cookies and are stored in Mongo for durability. UI uses Pico.css.

### How to run locally

#### Example: 

.env

MONGODB_URI="mongodb+srv://<user>:<pass>@<host>/?retryWrites=true&w=majority"
DB_NAME="a3_todos"
SESSION_SECRET="<random-long-string>"
PORT=3000


### Install & start:

npm install
npm run dev or npm start


Open http://localhost:3000/ → login (new usernames auto-create accounts) → /app.


### Achievements

#### Technical

- **Hosted frontend on GitHub Pages. Deployment is not working even with deployment from /docs**

#### Design, 12 tips

- Set document language — both pages set lang="en". 
- Clear page titles — “Login — A3” on login; title present on app. 
- Responsive meta viewport — login page includes it. (Add to app page—see “Still to add”.) 
- Label every form control — login form wraps inputs in label…input. App form uses label for + ids. 
- Use appropriate input attributes — required, maxlength, minlength, and autocomplete are set. 
- Semantic structure — headings (h1 on login, h2 sections on app). 
- Data tables with semantics — table markup + caption explaining content; thead/th are present.
- Keyboard-usable controls — native button elements for Edit/Delete, so keyboard and screen readers get built-in semantics. 
- Responsive layout — CSS grid + media query for wider screens; table wrapper enables horizontal scroll.
