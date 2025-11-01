const Block = require('./block');
const { cryptoHash } = require('../utils_core');
const Wallet = require('../wallet');
const Transaction = require('../wallet/transaction');
const Blockchain = require('./blockchain_core');

if (!Block || !cryptoHash || !Wallet || !Transaction || !Blockchain) {
  throw new Error('Required dependencies not found. Check import paths and module availability.');
}

describe('Blockchain', () => {
  let blockchain, newChain, originalChain, errorMock, logMock;
  
  beforeEach(() => {
    blockchain = new Blockchain();
    newChain = new Blockchain();
    errorMock = jest.fn();
    logMock = jest.fn();
    originalChain = blockchain.chain;
    global.console.error = errorMock;
    global.console.log = logMock;
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Properties', () => {
    it('contains a `chain` Array instance', () => {
      expect(blockchain.chain instanceof Array).toBe(true);
      expect(Array.isArray(blockchain.chain)).toBe(true);
    });
    
    it('starts with the genesis block', () => {
      expect(blockchain.chain[0]).toEqual(Block.genesis());
      expect(blockchain.chain).toHaveLength(1);
    });
  });

  describe('Block Addition', () => {
    it('adds a new block to the chain with valid data', () =>  {
      const newData = 'new_data';
      const initialLength = blockchain.chain.length;
      blockchain.addBlock({ data: newData });
      
      expect(blockchain.chain[blockchain.chain.length-1].data).toEqual(newData);
      expect(blockchain.chain).toHaveLength(initialLength + 1);
    });
    
    it('handles empty data when adding block', () => {
      const initialLength = blockchain.chain.length;
      blockchain.addBlock({ data: null });
      expect(blockchain.chain).toHaveLength(initialLength + 1);
    });
  });

  describe('Chain Validation', () => {
    describe('Invalid Chains', () => {
      it('returns false when chain does not start with genesis block', () => {
        blockchain.chain[0] = { data: 'dummy_data' };
        expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
      });
      
      it('returns false for empty chain', () => {
        expect(Blockchain.isValidChain([])).toBe(false);
      });

      it('returns false when lastHash reference is changed', () => {
        blockchain.addBlock({ data: 'data1' });
        blockchain.addBlock({ data: 'data2' });
        blockchain.chain[2].lastHash = 'data3';
        expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
      });
      
      it('returns false when block contains invalid field', () => {
        blockchain.addBlock({ data: 'data1' });
        blockchain.addBlock({data: 'data2' });
        blockchain.chain[2].data = 'invalid_data';
        expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
      });
      
      it('returns false when difficulty jumps significantly', () => {
        blockchain.addBlock({ data: 'data1' });
        blockchain.addBlock({data: 'data2' });
        const lastBlock = blockchain.chain[blockchain.chain.length-1];
        const badBlock = new Block({
          timestamp: Date.now(),
          lastHash: lastBlock.hash,
          hash: cryptoHash(Date.now(), lastBlock.hash, lastBlock.difficulty - 3, 0, []),
          nonce: 0,
          difficulty: lastBlock.difficulty - 3,
          data: []
        });
        blockchain.chain.push(badBlock);
        expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
      });
    });
    
    describe('Valid Chains', () => {
      it('returns true for valid multi-block chain', () => {
        blockchain.addBlock({ data: 'data1' });
        blockchain.addBlock({ data: 'data2' });
        blockchain.addBlock({ data: 'data3' });
        expect(Blockchain.isValidChain(blockchain.chain)).toBe(true);
      });

       it('returns true for chain with only genesis block', () => {
        const singleBlockChain = [Block.genesis()];
        expect(Blockchain.isValidChain(singleBlockChain)).toBe(true);
      });
      
    });
  });

  describe('Chain Replacement', () => {
    describe('When new chain is not longer', () => {
      beforeEach(() => {
        newChain.chain[0] = { new: 'chain' };
        blockchain.replaceChain(newChain.chain);
      });
      
      it('does not replace the chain', () => {
        expect(blockchain.chain).toEqual(originalChain);
      });
      
      it('logs an error', () => {
        expect(errorMock).toHaveBeenCalled();
      });
      
      it('does not replace when chains are equal length', () => {
        const equalLengthChain = [...originalChain];
        blockchain.replaceChain(equalLengthChain);
        expect(blockchain.chain).toEqual(originalChain);
        expect(errorMock).toHaveBeenCalled();
      });
    });
    
    describe('When new chain is longer but invalid', () => {
      beforeEach(() => {
        newChain.addBlock({ data: 'data1' });
        newChain.addBlock({ data: 'data2' });
        newChain.addBlock({ data: 'data3' });
        newChain.chain[2].hash = 'invalid_hash';
        blockchain.replaceChain(newChain.chain);
      });
      
      it('does not replace the chain', () => {
        expect(blockchain.chain).toEqual(originalChain);
      });
      
      it('logs an error', () => {
        expect(errorMock).toHaveBeenCalled();
      });
    });
    
    describe('When new chain is longer and valid', () => {
      beforeEach(() => {
        newChain.addBlock({ data: 'data1' });
        newChain.addBlock({ data: 'data2' });
        newChain.addBlock({ data: 'data3' });
        blockchain.replaceChain(newChain.chain);
      });
      
      it('replaces the chain', () => {
        expect(blockchain.chain).toEqual(newChain.chain);
      });

      it('logs about the chain replacement', () => {
        expect(logMock).toHaveBeenCalled();
      });
      
      it('has the correct length after replacement', () => {
        expect(blockchain.chain.length).toBe(newChain.chain.length);
      });
    });
    
    describe('Transaction validation flag', () => {
      it('calls validateTransactionData() when flag is true', () => {
        const validateTransactionDataMock = jest.fn();
        blockchain.validTransactionData = validateTransactionDataMock;
        newChain.addBlock({ data: 'data1' });
        blockchain.replaceChain(newChain.chain, true);
        expect(validateTransactionDataMock).toHaveBeenCalled();
      });
      
      it('does not call validateTransactionData() when flag is false', () => {
        const validateTransactionDataMock = jest.fn();
        blockchain.validTransactionData = validateTransactionDataMock;
        newChain.addBlock({ data: 'data1' });
        blockchain.replaceChain(newChain.chain, false);
        expect(validateTransactionDataMock).not.toHaveBeenCalled();
      });
    });
  });

  describe('Transaction Validation', () => {
    let transaction, rewardTransaction, wallet;
    
    beforeEach(() => {
      wallet = new Wallet();
      transaction = wallet.createTransaction({ recipient: 'data1-address', amount: 65 });
      rewardTransaction = Transaction.rewardTransaction({ minerWallet: wallet });
    });
    
    it('validates wallet has sufficient balance for transaction', () => {
      expect(wallet.balance).toBeGreaterThanOrEqual(65);
    });
    
    describe('Valid transaction data', () => {
      it('returns true for valid transactions', () => {
        newChain.addBlock({ data: [transaction, rewardTransaction] });
        expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(true);
        expect(errorMock).not.toHaveBeenCalled();
      });
    });
    
    describe('Invalid transaction data', () => {
      it('returns false for multiple reward transactions', () => {
        newChain.addBlock({ data: [transaction, rewardTransaction, rewardTransaction] });
        expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
        expect(errorMock).toHaveBeenCalled();
      });
      
      it('returns false for malformed outputMap in regular transaction', () => {
        transaction.outputMap[wallet.publicKey] = 999999;
        newChain.addBlock({ data: [transaction, rewardTransaction] });
        expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
        expect(errorMock).toHaveBeenCalled();
      });
      
      it('returns false for malformed input', () => {
        wallet.balance = 9000;
        const evilOutputMap = {
          [wallet.publicKey]: 8900,
          fooRecipient: 100
        };
        const evilTransaction = {
          input: {
            timestamp: Date.now(),
            amount: wallet.balance,
            address: wallet.publicKey,
            signature: wallet.sign(evilOutputMap)
          },
          outputMap: evilOutputMap
        };
        newChain.addBlock({ data: [evilTransaction, rewardTransaction] });
        expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
        expect(errorMock).toHaveBeenCalled();
      });
      
      it('returns false for multiple identical transactions', () => {
        newChain.addBlock({
          data: [transaction, transaction, transaction, rewardTransaction]
        });
        expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
        expect(errorMock).toHaveBeenCalled();
      });
    });
  });
});

module.exports = { Blockchain, Block, Wallet, Transaction };



