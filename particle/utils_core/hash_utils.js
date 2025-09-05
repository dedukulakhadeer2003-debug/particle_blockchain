const crypto = require('crypto');
const cryptoHash = (...inputs) => {
  if (inputs.length === 0) {
    inputs = [''];
  }
  
  const hash = crypto.createHash('sha256');
  const processedInputs = inputs.map(input => {
    return JSON.stringify(input);
  }).sort().join(' ');
  hash.update(processedInputs);
  return hash.digest('hex');
};

module.exports = cryptoHash;
