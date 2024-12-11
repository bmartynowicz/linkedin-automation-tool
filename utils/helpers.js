function isTokenExpired(tokenCreationTime, expiresIn) {
    const expirationTime = new Date(tokenCreationTime).getTime() + expiresIn * 1000;
    return Date.now() > expirationTime;
  }
  
  module.exports = {
    isTokenExpired,
  };
  