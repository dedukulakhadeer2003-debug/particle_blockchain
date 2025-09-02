const Transaction = require('./transaction');
const { STARTING_BALANCE } = require('../app_configuration');
const { ec, cryptoHash } = require('../utils_core');

class Wallet {
  constructor() {
    this.balance = STARTING_BALANCE;
    this.keyPair = ec.genKeyPair();
    this.publicKey = this.keyPair.getPublic().encode('hex');
  }

  sign(data) {
    return this.keyPair.sign(cryptoHash(data));
  }

  createTransaction({ recipient, amount, chain }) {
    if (!recipient || amount === undefined || amount === null) {
      throw new Error('Recipient and amount are required');
    }

    if (chain) {
      this.balance = Wallet.calculateBalance({
        chain,
        address: this.publicKey
      });
    }
    return new Transaction({ senderWallet: this, recipient, amount });
  }

  static calculateBalance({ chain, address }) {
    if (!chain || !Array.isArray(chain) || !address) {
      throw new Error('Valid chain and address are required');
    }

    let hasConductedTransaction = false;
    let outputsTotal = 0;

    for (let i = chain.length - 1; i > 0; i--) {
      const block = chain[i];
      if (!block || !block.data) continue;
      for (let transaction of block.data) {
        if (!transaction || !transaction.input || !transaction.outputMap) continue;
        if (transaction.input.address === address) {
          hasConductedTransaction = true;
        }
        const addressOutput = transaction.outputMap[address];
        if (addressOutput) {
          outputsTotal += addressOutput;
        }      }
    }
    return hasConductedTransaction ? outputsTotal : STARTING_BALANCE + outputsTotal;
  }
  getInfo() {
    return {
      balance: this.balance,
      publicKey: this.publicKey,
      hasPrivateKey: !!this.keyPair
    };
  }
}

module.exports = Wallet;
