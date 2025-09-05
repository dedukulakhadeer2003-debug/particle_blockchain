const { verifySignature } = require('../utils_core');
const { REWARD_INPUT, MINING_REWARD } = require('../app_configuration');

class Transaction {
  constructor({ senderWallet, recipient, amount, outputMap, input }) {
    this.outputMap = outputMap || this.createOutputMap({ senderWallet, recipient, amount });
    this.input = input || this.createInput({ senderWallet, outputMap: this.outputMap });
  }

  createOutputMap({ senderWallet, recipient, amount }) {
    const outputMap = {};
    if (!senderWallet || !recipient || amount === undefined) {
      throw new Error('Invalid parameters for output map creation');
    }
    outputMap[recipient] = amount;
    outputMap[senderWallet.publicKey] = senderWallet.balance - amount;
    return outputMap;
  }

  createInput({ senderWallet, outputMap }) {
    if (!senderWallet || !outputMap) {
      throw new Error('Invalid parameters for input creation');
    }
    return {
      timestamp: Date.now(),
      amount: senderWallet.balance,
      address: senderWallet.publicKey,
      signature: senderWallet.sign(outputMap)
    };
  }

  update({ senderWallet, recipient, amount }) {
    if (amount > this.outputMap[senderWallet.publicKey]) {
      throw new Error('Amount exceeds balance');
    }
    
    if (!this.outputMap[recipient]) {
      this.outputMap[recipient] = amount;
    } else {
      this.outputMap[recipient] += amount;
    }
    this.outputMap[senderWallet.publicKey] -= amount; 
    this.input = this.createInput({ senderWallet, outputMap: this.outputMap });
  }

  static validTransaction(transaction) {
    if (!transaction || !transaction.input || !transaction.outputMap) {
      console.error('Invalid transaction structure');
      return false;
    }
    
    const { input: { address, amount, signature }, outputMap } = transaction;
    const outputTotal = Object.values(outputMap).reduce((total, outputAmount) => total + outputAmount, 0);
    if (amount !== outputTotal) {
      console.error(`Invalid transaction from ${address}: amount mismatch`);
      return false;
    }
    
    return true;
  }

  getDetails() {
    return {
      id: this.id,
      input: this.input,
      outputMap: this.outputMap,
      totalAmount: Object.values(this.outputMap).reduce((sum, amount) => sum + amount, 0)
    };
  }
}

module.exports = Transaction;
