const TransactionPool = require('./mempool');
const Transaction = require('./transaction');
const Wallet = require('./index');
const Blockchain = require('../blockchain_core');

describe('TransactionPool', () => {
  let transactionPool, transaction, senderWallet;
  beforeEach(() => {
    transactionPool = new TransactionPool();
    senderWallet = new Wallet();
    transaction = new Transaction({
      senderWallet,
      recipient: 'dummy_recipient',
      amount: 100
    });
  });

  describe('setTransaction()', () => {
    it('adds a transaction', () => {
      transactionPool.setTransaction(transaction);
      expect(transactionPool.transactionMap[transaction.id]).toBe(transaction);
    });

    it('does not add invalid transaction', () => {
      const invalidTransaction = null;
      transactionPool.setTransaction(invalidTransaction);
      expect(Object.keys(transactionPool.transactionMap).length).toBe(0);
    });
  });

  describe('existingTransaction()', () => {
    it('returns an existing transaction given an input address', () => {
      transactionPool.setTransaction(transaction);
      expect(
        transactionPool.existingTransaction({ inputAddress: senderWallet.publicKey })
      ).toBe(transaction);
    });

    it('returns undefined for non-existent address', () => {
      expect(
        transactionPool.existingTransaction({ inputAddress: 'non-existent-address' })
      ).toBeUndefined();
    });
  });

  describe('validTransactions()', () => {
    let validTransactions, errorMock;  
    beforeEach(() => {
      validTransactions = [];
      errorMock = jest.fn();
      global.console.error = errorMock;
      for (let i = 0; i < 10; i++) {
        transaction = new Transaction({
          senderWallet,
          recipient: 'recipient',
          amount: 30
        });
        
        if (i % 3 === 0) {
          transaction.input.amount = 999999;
        } else if (i % 3 === 1) {
          transaction.input.signature = new Wallet().sign('foo');
        } else {
          validTransactions.push(transaction);
        }
        transactionPool.setTransaction(transaction);
      }
    });

    it('returns valid transactions', () => {
      expect(transactionPool.validTransactions()).toEqual(validTransactions);
    });

    it('returns correct number of valid transactions', () => {
      expect(transactionPool.validTransactions().length).toBe(validTransactions.length);
    });
  });

  describe('clear()', () => {
    it('clears the transactions', () => {
      transactionPool.setTransaction(transaction);
      transactionPool.clear();
      expect(transactionPool.transactionMap).toEqual({});
    });

    it('handles clearing empty pool', () => {
      transactionPool.clear();
      expect(transactionPool.transactionMap).toEqual({});
    });
  });

  describe('clearBlockchainTransactions()', () => {
    it('clears the pool of any existing blockchain transactions', () => {
      const blockchain = new Blockchain();
      const expectedTransactionMap = {};

      for (let i = 0; i < 6; i++) {
        const transaction = new Wallet().createTransaction({
          recipient: 'new_recipant', 
          amount: 20
        });
        transactionPool.setTransaction(transaction);
      }

      transactionPool.clearBlockchainTransactions({ chain: blockchain.chain });
      expect(transactionPool.transactionMap).toEqual(expectedTransactionMap);
    });

    it('handles empty blockchain', () => {
      transactionPool.setTransaction(transaction);
      const originalCount = Object.keys(transactionPool.transactionMap).length;
      
      transactionPool.clearBlockchainTransactions({ chain: [] });
      expect(Object.keys(transactionPool.transactionMap).length).toBe(originalCount);
    });
  });

  describe('getTransactionCount()', () => {
    it('returns correct transaction count', () => {
      expect(transactionPool.getTransactionCount()).toBe(0);
      transactionPool.setTransaction(transaction);
      expect(transactionPool.getTransactionCount()).toBe(1);
    });
  });

  describe('hasTransaction()', () => {
    it('checks if transaction exists', () => {
      expect(transactionPool.hasTransaction(transaction.id)).toBe(false);
      transactionPool.setTransaction(transaction);
      expect(transactionPool.hasTransaction(transaction.id)).toBe(true);
    });
  });

  describe('removeTransaction()', () => {
    it('removes specific transaction', () => {
      transactionPool.setTransaction(transaction);
      expect(transactionPool.hasTransaction(transaction.id)).toBe(true);
      transactionPool.removeTransaction(transaction.id);
      expect(transactionPool.hasTransaction(transaction.id)).toBe(false);
    });
  });
});
