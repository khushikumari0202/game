
# 🎮 Connect-4 Multiplayer Game

A real-time **Connect-4 multiplayer game** built with **React**, **Node.js**, **Socket.IO**, and **MongoDB**.  
Players can play against each other online or against a bot, with a **persistent leaderboard** showing top players.

---

## 🧠 Features

- 🔥 **Real-time gameplay** using Socket.IO  
- 👤 Player vs Player online  
- 🤖 Player vs Bot mode  
- ⏱ Turn timer (20s per turn)  
- 📊 **Leaderboard stored in MongoDB**
- 🚀 Persistent win counts across all users
- 🎨 Clean UI built with React

---

## 🚀 Tech Stack

| Type           | Technology |
|----------------|------------|
| Frontend       | React |
| Backend        | Node.js + Express |
| Real-time      | Socket.IO |
| Database       | MongoDB + Mongoose |
| Deployment     | Vercel |

---

## 📁 Repository Structure

```

├── backend
│   ├── config
│   │   └── db.js             # MongoDB connection
│   ├── models
│   │   └── Leaderboard.js    # Leaderboard schema
│   └── server.js             # Backend server & Socket.IO logic
├── frontend
│   ├── src
│   │   ├── App.jsx
│   │   ├── GameBoard.jsx
│   │   ├── QueueScreen.jsx
│   │   └── Leaderboard.jsx
│   └── package.json          # React client
├── .env                      # Environment variables
└── README.md

````

---

## 🔧 Prerequisites

Before starting, make sure you have installed:

- ✅ Node.js (v14+)
- ✅ npm
- ✅ MongoDB (Atlas or local)
- ✅ Git

---

## 🛠 Setup & Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/khushikumari0202/game.git
cd game
````

---

### 2️⃣ Configure Environment Variables

Create a `.env` file in the **backend** folder:

```
MONGO_URI=YOUR_MONGODB_CONNECTION_STRING
PORT=3001
```

Make sure you **don’t include quotes** around the URI.

---

### 3️⃣ Install Dependencies

#### Backend

```bash
cd backend
npm install
```

#### Frontend

```bash
cd ../client
npm install
```

---

### 4️⃣ Run the App

#### Start Backend

```bash
cd backend
npm run server
```

#### Start Frontend

```bash
cd frontend
npm start
```

Your app should open at:

```
http://localhost:3000
```

---

## 🎯 How It Works

### Game Flow

1. Users connect and enter a username
2. They join an online queue or play with Bot
3. Server manages game state via Socket.IO
4. Each turn gets **20 seconds**
5. After game ends:

   * Winner’s wins are incremented
   * Data stored in MongoDB
6. Leaderboard shows top players

---

## 📊 Leaderboard

Leaderboard shows **top 10 players** and their number of wins.

Data is stored in MongoDB using a Mongoose schema:

```js
const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  wins: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
```

---

## 🧑‍💻 Future Enhancements

We can extend this project with:

* Add losses + win rate
* Add player profiles and avatars
* Chat during gameplay

---

## 📄 License

This project is **MIT Licensed** — feel free to use it, modify it, and build your own projects on top of it 🚀.

---
