const Transaction = require('../wallet/transaction');

class TransactionMiner {
  constructor({ blockchain, transactionPool, wallet, pubsub }) {
    if (!blockchain) throw new Error('Blockchain instance is required');
    if (!transactionPool) throw new Error('TransactionPool instance is required');
    if (!wallet) throw new Error('Wallet instance is required');
    
    this.blockchain = blockchain;
    this.transactionPool = transactionPool;
    this.wallet = wallet;
    this.pubsub = pubsub;   
    this.isMining = false;
    this.miningAttempts = 0;
    this.lastMinedTimestamp = null;
  }

  async mineTransactions() {
    if (this.isMining) {
      console.warn('Mining operation already in progress');
      return false;
    }

    this.isMining = true;
    this.miningAttempts++;
    
    try {
      if (!this.canMineTransactions()) {
        console.warn('Cannot mine transactions at this time');
        this.isMining = false;
        return false;
      }

      console.log('Starting transaction mining process...');

      const validTransactions = this.transactionPool.validTransactions();

      console.log(`Mining ${validTransactions.length} valid transactions`);
      validTransactions.push(rewardTransaction);
      this.pubsub.broadcastChain();
      console.log('Blockchain update broadcasted to network');

      this.transactionPool.clear();
      console.log('Transaction pool cleared');

      this.lastMinedTimestamp = Date.now();
      this.isMining = false;
      
      return {
        success: true,
        blockHeight: this.blockchain.chain.length,
        transactionsMined: validTransactions.length,
        timestamp: this.lastMinedTimestamp
      };

    } catch (error) {
      console.error('Transaction mining failed:', error.message);
      this.isMining = false;
      
      this.handleMiningError(error);
      
      return {
        success: false,
        error: error.message,
        attempt: this.miningAttempts
      };
    }
  }

  canMineTransactions() {
    if (!this.blockchain.chain || this.blockchain.chain.length === 0) {
      console.error('Blockchain is not properly initialized');
      return false;
    }

    if (!this.wallet.publicKey) {
      console.error('Miner wallet is not properly configured');
      return false;
    }
    return true;
  }

  logTransactionDetails(transactions) {
    console.log('Transactions to be mined:');
    transactions.forEach((transaction, index) => {
      if (transaction.input && transaction.input.address) {
        const isReward = transaction.input.address === 'reward';
        console.log(`${index + 1}. ${isReward ? 'REWARD' : 'REGULAR'}: ${JSON.stringify(transaction).substring(0, 100)}...`);
      }
    });
  }

  handleMiningError(error) {
    console.error('Mining error details:', {
      error: error.message,
      stack: error.stack,
      timestamp: Date.now(),
      attempt: this.miningAttempts
    });
  }

  validateTransactionPool() {
    if (!this.transactionPool.validTransactions) {
      return { isValid: false, error: 'Transaction pool method not available' };
    }

    const validTransactions = this.transactionPool.validTransactions();
    return {
      isValid: true,
      count: validTransactions.length,
      transactions: validTransactions
    };
  }
}

module.exports = TransactionMiner;
