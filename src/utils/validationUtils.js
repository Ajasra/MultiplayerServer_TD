function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  return trimmed.length >= 1 && trimmed.length <= 16 && /^[a-zA-Z0-9 _-]+$/.test(trimmed);
}

module.exports = {
  isValidUsername,
};

