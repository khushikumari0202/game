const mongoose = require('mongoose');

const leaderboardSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  wins: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Leaderboard', leaderboardSchema);
