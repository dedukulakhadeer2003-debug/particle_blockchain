const Transaction = require('./transaction');
class TransactionPool {
  constructor() {
    this.transactionMap = {};
  }

  setTransaction(transaction) {
    if (transaction && transaction.id) {
      this.transactionMap[transaction.id] = transaction;
    }
  }

  setMap(transactionMap) {
    if (transactionMap && typeof transactionMap === 'object') {
      this.transactionMap = transactionMap;
    }
  }
  existingTransaction({ inputAddress }) {
    if (!inputAddress) return null;   
    const transactions = Object.values(this.transactionMap);
    return transactions.find(transaction => 
      transaction && transaction.input && transaction.input.address === inputAddress
    );
  }

  validTransactions() {
    return Object.values(this.transactionMap).filter(
      transaction => transaction && Transaction.validTransaction(transaction)
    );
  }
  clearBlockchainTransactions({ chain }) {
    if (!chain || !Array.isArray(chain)) return;
    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      if (!block || !block.data) continue;
      for (let transaction of block.data) {
        if (transaction && transaction.id && this.transactionMap[transaction.id]) {
          delete this.transactionMap[transaction.id];
        }
      }
    }
  }
  
  getTransactionCount() {
    return Object.keys(this.transactionMap).length;
  }
   hasTransaction(transactionId) {
    return !!this.transactionMap[transactionId];
  }
  removeTransaction(transactionId) {
    if (this.transactionMap[transactionId]) {
      delete this.transactionMap[transactionId];
    }
  }
}

module.exports = TransactionPool;


