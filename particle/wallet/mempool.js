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
